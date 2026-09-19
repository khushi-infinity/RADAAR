import { NextResponse } from "next/server";
import { MEMORY_DATASET, cogneeConfig } from "@/lib/cognee";
import { readMemoryFacts } from "@/lib/memory-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/memory — what RADAAR actually remembers.
 * Reads raw chunks from the Cognee graph so judges can SEE the memory
 * (insight / offer / outcome facts) that answers are grounded in.
 */
export async function GET() {
  // Primary source: our own audit log of facts actually written to Cognee
  // (ground truth, newest first). Cognee CHUNKS search returns LLM-processed
  // summaries, so it's merged in only when entries carry our fact prefixes.
  const logged = await readMemoryFacts(12);
  const facts = logged.map((e) => e.fact);
  let graph: "ok" | "unreachable" = "unreachable";

  try {
    const { base, key } = cogneeConfig();
    const res = await fetch(`${base}/api/v1/search`, {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        searchType: "CHUNKS",
        query: "merchant insight offer outcome dispatched",
        datasets: [MEMORY_DATASET],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (res.ok) {
      graph = "ok";
      const j = (await res.json()) as Array<{ search_result?: Array<{ text?: string }> }>;
      const FACT_PREFIXES = [
        "MERCHANT PROFILE",
        "TREND ",
        "ANOMALY ",
        "SEGMENT ",
        "INSIGHT ",
        "OFFER DISPATCHED",
        "OFFER OUTCOME",
      ];
      const graphFacts = j
        .flatMap((r) => r.search_result ?? [])
        .map((c) => (typeof c === "string" ? c : (c.text ?? "")))
        .filter((t) => FACT_PREFIXES.some((p) => t.startsWith(p)));
      for (const g of graphFacts) {
        if (!facts.some((f) => f.slice(0, 80) === g.slice(0, 80))) facts.push(g);
      }
    }
  } catch {
    // graph unavailable — the audit log alone is still truthful
  }

  return NextResponse.json({ ok: facts.length > 0, dataset: MEMORY_DATASET, graph, facts });
}
