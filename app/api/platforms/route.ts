import { NextResponse } from "next/server";
import { env, tryEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/platforms — public (non-secret) endpoints of the sponsor platforms
 * this build runs on, so the UI can link judges straight to the live n8n
 * instance and label the AI stack honestly. Keys are NEVER returned.
 */
export async function GET() {
  try {
    const n8nUrl = env("N8N_BASE_URL").replace(/\/+$/, "");
    const cogneeBase = tryEnv("COGNEE_BASE_URL")?.replace(/\/+$/, "") ?? "";
    const host = (url: string) => {
      try {
        return new URL(url).host;
      } catch {
        return url;
      }
    };
    return NextResponse.json({
      ok: true,
      n8n: { url: n8nUrl, host: host(n8nUrl) },
      cognee: { tenantHost: host(cogneeBase), dataset: "radaar_merchant_memory" },
      sarvam: { chat: "sarvam-105b", tts: "bulbul:v3 · priya", stt: "saarika:v2.5" },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
