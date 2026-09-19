import { NextResponse } from "next/server";
import { generateMerchantData } from "@/lib/generator";
import { buildSnapshot } from "@/lib/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deterministic seed → same merchant story on every load (demo-stable),
// computed once per server process and reused across requests.
let cached: ReturnType<typeof buildSnapshot> | null = null;

export async function GET() {
  if (!cached) {
    const data = generateMerchantData({ days: 90, seed: 42 });
    cached = buildSnapshot(data.transactions, data.customers, data.merchantName, data.now);
  }
  return NextResponse.json(cached);
}
