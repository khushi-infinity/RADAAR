import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Speech-to-text via Sarvam saarika (streaming=false).
 * Accepts multipart/form-data with an `audio` file part (WAV from the browser).
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "missing audio file" }, { status: 400 });
    }

    const up = new FormData();
    up.append("file", file, "speech.wav");
    up.append("model", "saarika:v2.5");

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": env("SARVAM_API_KEY") },
      body: up,
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      // Never surface Sarvam's raw error payloads to the UI — log details,
      // return a short human-readable reason.
      const body = await res.text().catch(() => "");
      console.error("[stt] Sarvam error", res.status, body.slice(0, 300));
      return Response.json(
        {
          ok: false,
          error:
            res.status === 400
              ? "Audio format rejected — WAV conversion failed."
              : "Speech service busy — try again in a moment.",
        },
        { status: 502 },
      );
    }
    const j = (await res.json()) as { transcript?: string; language_code?: string };
    if (!j.transcript) {
      return Response.json({ ok: false, error: "no transcript returned" }, { status: 502 });
    }
    return Response.json({ ok: true, transcript: j.transcript, language: j.language_code ?? null });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "stt failed" },
      { status: 500 },
    );
  }
}
