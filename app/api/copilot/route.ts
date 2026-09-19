import { NextResponse } from "next/server";
import { MEMORY_DATASET, search, type SearchType } from "@/lib/cognee";
import { sarvamChat } from "@/lib/sarvam";
import { generateMerchantData } from "@/lib/generator";
import { buildSnapshot } from "@/lib/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

let snapshot: ReturnType<typeof buildSnapshot> | null = null;
function getSnapshot() {
  if (!snapshot) {
    const data = generateMerchantData({ days: 90, seed: 42 });
    snapshot = buildSnapshot(data.transactions, data.customers, data.merchantName, data.now);
  }
  return snapshot;
}

function snapshotFacts(): string {
  const s = getSnapshot();
  const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const trend = s.trends.map((t) => `${t.window}: ${t.deltaPct > 0 ? "+" : ""}${t.deltaPct}% vs ${t.baselineLabel}`).join("; ");
  const segs = s.segments.map((x) => `${x.segment}=${x.count}`).join(", ");
  const cards = s.cards
    .slice(0, 3)
    .map((c, i) => `${i + 1}. ${c.signal} → ${c.action} → ${c.impact}`)
    .join(" | ");
  return [
    `Merchant: ${s.merchantName}.`,
    `Health ${s.health.score}/100 (${s.health.grade}).`,
    `Weekly revenue ${inr(s.revenue.thisWeek)} (${s.revenue.deltaPct >= 0 ? "+" : ""}${s.revenue.deltaPct}% vs last week).`,
    `Customers ${s.customers.total} (${s.customers.newThisWeek} new this week). Avg ticket ${inr(s.avgTicket.value)}.`,
    `Trends: ${trend}.`,
    `Segments: ${segs}.`,
    `Top recommendations: ${cards}`,
  ].join(" ");
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message?: string };
    const q = (message ?? "").trim();
    if (!q) return NextResponse.json({ ok: false, error: "empty message" }, { status: 400 });

    // 1) Preferred path: the merchant's Cognee memory graph (grounded, learned)
    try {
      const chunks = await search(MEMORY_DATASET, "merchant offer outcome", "CHUNKS" as SearchType);
      if (chunks.length > 0) {
        const answers = await search(MEMORY_DATASET, q, "GRAPH_COMPLETION" as SearchType);
        const answer = answers.filter((a) => a.trim()).join("\n");
        if (answer) return NextResponse.json({ ok: true, answer, source: "memory-graph" });
      }
    } catch {
      // graph unavailable — fall through to snapshot-grounded answer
    }

    // 2) Fallback: Sarvam answers strictly from the live snapshot facts
    const answer = await sarvamChat(
      `Merchant data: ${snapshotFacts()}\n\nQuestion: ${q}\n\nAnswer in at most 4 short sentences using ONLY the data above. If the answer is not in the data, say what related information IS available. Reply in the same language as the question (Hinglish if mixed).`,
      { system: "You are RADAAR, a concise business copilot for an Indian merchant.", maxTokens: 600 },
    );
    return NextResponse.json({ ok: true, answer, source: "live-snapshot" });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "copilot failed" },
      { status: 500 },
    );
  }
}

