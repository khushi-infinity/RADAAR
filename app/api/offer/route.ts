import { NextResponse } from "next/server";
import { generateNudgeHinglish } from "@/lib/sarvam";
import { webhookUrl } from "@/lib/n8n";
import { MEMORY_DATASET, cognify } from "@/lib/cognee";
import { appendMemoryFact } from "@/lib/memory-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface OfferBody {
  signal: string;
  why: string;
  action: string;
  impact: string;
  audience: string;
  audienceSize: number;
  merchant: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OfferBody;
    const merchant = body.merchant?.trim() || "RADAAR demo merchant";
    const date = new Date().toISOString().slice(0, 10);
    const offerId = `off_${date}_${Math.random().toString(36).slice(2, 6)}`;

    // 1) Sarvam writes the nudges (Hinglish + English)
    const nudge = await generateNudgeHinglish({
      signal: body.signal,
      why: body.why,
      action: body.action,
      impact: body.impact,
      audience: body.audience,
    });

    // 2) n8n offer-dispatch workflow: mock WhatsApp delivery + Cognee memory fact
    const res = await fetch(webhookUrl("radaar-offer"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerId,
        merchant,
        date,
        signal: body.signal,
        action: body.action,
        audience: body.audience,
        audienceSize: body.audienceSize,
        messageHi: nudge.hi,
        messageEn: nudge.en,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`n8n offer webhook ${res.status}: ${t.slice(0, 200)}`);
    }
    const dispatch = (await res.json()) as Record<string, unknown>;

    // Fire-and-forget graph rebuild so the new offer fact becomes searchable
    void cognify(MEMORY_DATASET).catch(() => {});

    // Ground-truth audit log (what the memory panel shows)
    void appendMemoryFact(
      "OFFER_DISPATCHED",
      `OFFER DISPATCHED ${date}: ${merchant} ran offer ${offerId} (${body.action}) targeting ${body.audienceSize} customers in the ${body.audience} segment, to address: ${body.signal}. Nudge sent (Hinglish): "${nudge.hi}"`,
    );

    return NextResponse.json({
      ok: true,
      offerId,
      nudgeHi: nudge.hi,
      nudgeEn: nudge.en,
      status: dispatch.status ?? "dispatched",
      deliveryPreview: dispatch.deliveryPreview ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "offer failed" },
      { status: 500 },
    );
  }
}

