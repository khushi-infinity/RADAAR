import { NextResponse } from "next/server";
import { webhookUrl } from "@/lib/n8n";
import { MEMORY_DATASET, cognify } from "@/lib/cognee";
import { appendMemoryFact } from "@/lib/memory-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface OutcomeBody {
  offerId: string;
  action: string;
  audienceSize: number;
  weeklyRevenue: number;
  merchant: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OutcomeBody;
    const merchant = body.merchant?.trim() || "RADAAR demo merchant";

    // Simulated "one week later" measurement — plausible positive uplift
    // (3–9% of weekly revenue) with slight randomness for demo variety.
    const upliftPct = +(3 + Math.random() * 6).toFixed(1);
    const revenueDelta = Math.round((body.weeklyRevenue * upliftPct) / 100);
    const date = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    const res = await fetch(webhookUrl("radaar-outcome"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerId: body.offerId,
        merchant,
        date,
        action: body.action,
        audienceSize: body.audienceSize,
        revenueDelta,
        upliftPct,
        window: "following week",
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`n8n outcome webhook ${res.status}: ${t.slice(0, 200)}`);
    }
    const verdict = (await res.json()) as { verdict?: string; lesson?: string };

    // Fire-and-forget graph rebuild: the learning-loop fact becomes memory
    void cognify(MEMORY_DATASET).catch(() => {});

    // Ground-truth audit log (what the memory panel shows)
    void appendMemoryFact(
      "OFFER_OUTCOME",
      `OFFER OUTCOME ${date}: Offer ${body.offerId} (${body.action}) at ${merchant} reached ${body.audienceSize} customers and produced a revenue change of ${revenueDelta >= 0 ? "+" : ""}${revenueDelta} rupees (${upliftPct}%) over the following week. Verdict: ${verdict.verdict ?? "worked"}.`,
    );

    return NextResponse.json({
      ok: true,
      offerId: body.offerId,
      revenueDelta,
      upliftPct,
      verdict: verdict.verdict ?? "worked",
      lesson: verdict.lesson ?? "",
      measuredFor: date,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "outcome failed" },
      { status: 500 },
    );
  }
}

