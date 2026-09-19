import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  return speak(text ?? "");
}

// GET variant so <audio> elements can stream directly (they cannot POST)
export async function GET(req: Request) {
  const text = new URL(req.url).searchParams.get("text") ?? "";
  return speak(text);
}

async function speak(raw: string) {
  try {
    const t = raw.trim().slice(0, 500);
    if (!t) return new Response("empty text", { status: 400 });

    // Devanagari → Hindi voice; otherwise Indian English
    const hasDevanagari = /[\u0900-\u097F]/.test(t);
    const lang = hasDevanagari ? "hi-IN" : "en-IN";

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": env("SARVAM_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [t],
        target_language_code: lang,
        speaker: "priya",
        model: "bulbul:v3",
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return new Response(`TTS ${res.status}: ${body.slice(0, 200)}`, { status: 502 });
    }
    const j = (await res.json()) as { audios?: string[] };
    const b64 = j.audios?.[0];
    if (!b64) return new Response("no audio returned", { status: 502 });

    const bytes = Buffer.from(b64, "base64");
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "tts failed", { status: 500 });
  }
}
