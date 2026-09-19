/**
 * Cognee Cloud client — merchant memory / knowledge graph.
 *
 * Contract verified live against tenant (see PROGRESS.md):
 *  1. POST /api/v1/add          — multipart/form-data: data=<file> + datasetName=<string>
 *                                 (auto-ingests; returns data_id)
 *  2. POST /api/v1/cognify      — JSON {datasets:[name]} → PipelineRunStarted, graph builds async
 *                                 (each call STARTS a run — never poll by re-POSTing)
 *  3. POST /api/v1/search       — JSON {searchType, query, datasets:[name]}
 *                                 GRAPH_COMPLETION → LLM answer grounded in the graph
 *                                 CHUNKS → raw stored chunks
 *  Health at root /health. Never call with trailing slashes (307).
 */

import type { BusinessSnapshot } from "./types";

/** Single canonical dataset for the demo merchant's memory graph. */
export const MEMORY_DATASET = "radaar_merchant_memory";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — check .env`);
  return v.trim();
}

export function cogneeConfig() {
  const base = reqEnv("COGNEE_BASE_URL").replace(/\/+$/, "");
  const key = reqEnv("COGNEE_API_KEY");
  return { base, key };
}

async function cog<T>(path: string, init: RequestInit, timeoutMs = 120_000): Promise<T> {
  const { base, key } = cogneeConfig();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "X-Api-Key": key, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cognee ${init.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

// ─── Write path ─────────────────────────────────────────────────────────────

export interface AddResult {
  status: string;
  pipeline_run_id?: string;
  dataset_name: string;
  data_ingestion_info?: Array<{ data_id?: string }>;
}

/**
 * Add facts to a dataset. Each fact becomes one text file in Cognee
 * (one file = clean, retrievable unit of memory).
 */
export async function addFacts(datasetName: string, facts: string[]): Promise<AddResult[]> {
  const out: AddResult[] = [];
  for (const fact of facts) {
    if (!fact.trim()) continue;
    const form = new FormData();
    form.append("data", new Blob([fact.trim()], { type: "text/plain" }), "radaar_fact.txt");
    form.append("datasetName", datasetName);
    out.push(
      await cog<AddResult>("/api/v1/add", { method: "POST", body: form }, 90_000),
    );
  }
  return out;
}

/**
 * Best-effort dataset reset: delete by id if listing works, else report false.
 * Used before a fresh pipeline run so the graph only contains current facts.
 */
export async function deleteDataset(datasetName: string): Promise<boolean> {
  try {
    const list = await cog<Array<{ id: string; name: string }>>("/api/v1/datasets", { method: "GET" }, 30_000);
    const ds = Array.isArray(list) ? list.find((d) => d.name === datasetName) : undefined;
    if (!ds) return false;
    await cog(`/api/v1/datasets/${ds.id}`, { method: "DELETE" }, 60_000);
    return true;
  } catch {
    return false;
  }
}

/** Kick off graph construction for a dataset. Returns the run descriptor. */
export async function cognify(
  datasetName: string,
): Promise<{ status: string; pipeline_run_id: string }> {
  const res = await cog<Record<string, { status: string; pipeline_run_id: string }>>(
    "/api/v1/cognify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasets: [datasetName] }),
    },
    60_000,
  );
  const first = Object.values(res)[0];
  if (!first) throw new Error("cognify returned no run descriptor");
  return first;
}

// ─── Read path ──────────────────────────────────────────────────────────────

export type SearchType =
  | "GRAPH_COMPLETION"
  | "CHUNKS"
  | "RAG_COMPLETION"
  | "SUMMARIES"
  | "INSIGHTS"
  | "CYPHER";

export interface SearchResult {
  dataset_name: string;
  search_result: unknown[];
}

export async function search(
  datasetName: string,
  query: string,
  searchType: SearchType = "GRAPH_COMPLETION",
): Promise<string[]> {
  const res = await cog<SearchResult[]>(
    "/api/v1/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchType, query, datasets: [datasetName] }),
    },
    120_000,
  );
  const flat = res.flatMap((r) => r.search_result ?? []);
  return flat.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
}

export interface GroundedAnswer {
  answer: string;
  attempts: number;
}

/**
 * Ask the graph and wait until the answer is actually grounded.
 * Cognee builds the graph async, so poll CHUNKS (cheap) until data is
 * visible, then run the real query. Guard: max attempts, then give up loudly.
 */
export async function askWhenReady(
  datasetName: string,
  query: string,
  opts: { maxAttempts?: number; intervalMs?: number; searchType?: SearchType } = {},
): Promise<GroundedAnswer> {
  const maxAttempts = opts.maxAttempts ?? 24;
  const intervalMs = opts.intervalMs ?? 10_000;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const chunks = await search(datasetName, "merchant", "CHUNKS");
      const grounded = chunks.length > 0 && !chunks.join(" ").includes("No data found");
      if (grounded) {
        const answers = await search(datasetName, query, opts.searchType ?? "GRAPH_COMPLETION");
        if (answers.length > 0) return { answer: answers.join("\n"), attempts: i };
      }
    } catch (e) {
      // search can 4xx while the pipeline is mid-build — keep polling
      if (i === maxAttempts) throw e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Graph not ready after ${maxAttempts} attempts for "${query}"`);
}

// ─── Fact shaping (deterministic — no LLM, keeps memory crisp) ──────────────

const inr = (n: number) => Math.round(n).toLocaleString("en-IN");

/** Turn a full business snapshot into fact sentences for the graph. */
export function snapshotToFacts(snap: BusinessSnapshot): string[] {
  const d = new Date(snap.generatedAt).toISOString().slice(0, 10);
  const facts: string[] = [];

  facts.push(
    `MERCHANT PROFILE: ${snap.merchantName} (id ${snap.merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}) is a Paytm merchant. On ${d} its business health score was ${snap.health.score} out of 100 (${snap.health.grade}). Weekly revenue was ${inr(snap.revenue.thisWeek)} rupees (${snap.revenue.deltaPct >= 0 ? "up" : "down"} ${Math.abs(snap.revenue.deltaPct)}% vs previous week). It has ${snap.customers.total} total customers with ${snap.customers.newThisWeek} new this week. Average ticket size was ${inr(snap.avgTicket.value)} rupees.`,
  );

  for (const t of snap.trends) {
    facts.push(
      `TREND ${d}: ${snap.merchantName} ${t.window} revenue moved ${t.direction === "up" ? "up" : "down"} ${Math.abs(t.deltaPct)}% versus ${t.baselineLabel}. Current value ${inr(t.evidence.current)} vs baseline ${inr(t.evidence.baseline)} rupees over ${t.evidence.sampleSize} transactions.`,
    );
  }

  for (const a of snap.anomalies) {
    facts.push(
      `ANOMALY ${d}: ${snap.merchantName} — ${a.description} (detection z-score ${a.zScore.toFixed(1)}, type ${a.kind}).`,
    );
  }

  for (const s of snap.segments) {
    facts.push(
      `SEGMENT ${d}: ${snap.merchantName} has ${s.count} customers in the ${s.segment} segment; average ticket ${inr(s.avgTicket)} rupees. ${s.description}`,
    );
  }

  for (const c of snap.cards) {
    facts.push(
      `INSIGHT ${d}: For ${snap.merchantName}, signal: ${c.signal} Why: ${c.why} Recommended action: ${c.action} Expected impact: ${c.impact}.`,
    );
  }

  return facts;
}

/** Turn a dispatched offer into a fact for the graph. */
export function offerToFact(o: {
  offerId: string;
  merchant: string;
  date: string;
  signal: string;
  action: string;
  audience: string;
  audienceSize: number;
  messageHi: string;
}): string {
  return `OFFER DISPATCHED ${o.date}: ${o.merchant} ran offer ${o.offerId} (${o.action}) targeting ${o.audienceSize} customers in the ${o.audience} segment, to address: ${o.signal}. Customer nudge sent (Hinglish): "${o.messageHi}"`;
}

/** Turn a measured outcome into a fact so recommendations get sharper. */
export function outcomeToFact(o: {
  offerId: string;
  merchant: string;
  date: string;
  action: string;
  audienceSize: number;
  revenueDelta: number;
  upliftPct: number;
  window: string;
}): string {
  return `OFFER OUTCOME ${o.date}: Offer ${o.offerId} (${o.action}) at ${o.merchant} reached ${o.audienceSize} customers and produced a revenue change of ${o.revenueDelta >= 0 ? "+" : ""}${inr(o.revenueDelta)} rupees (${o.upliftPct >= 0 ? "+" : ""}${o.upliftPct}%) over the ${o.window}. ${o.upliftPct > 0 ? "The offer worked; similar actions should be recommended again." : "The offer underperformed; deprioritize similar actions."}`;
}
