/**
 * Sarvam AI client — vernacular copilot text generation.
 * Verified working params (see PROGRESS.md):
 *   POST https://api.sarvam.ai/v1/chat/completions
 *   header: api-subscription-key
 *   model: "sarvam-105b"  (sarvam-m is deprecated)
 */

const SARVAM_BASE = "https://api.sarvam.ai";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — check .env`);
  return v.trim();
}

export async function sarvamChat(
  prompt: string,
  opts: { system?: string; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const res = await fetch(`${SARVAM_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "api-subscription-key": reqEnv("SARVAM_API_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sarvam-105b",
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: opts.temperature ?? 0.4,
      // Verified live: JSON null DISABLES reasoning ("low" does not on this
      // deployment — the model still burns thousands of tokens thinking).
      reasoning_effort: null,
      max_tokens: opts.maxTokens ?? 1000,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sarvam chat → ${res.status}: ${body.slice(0, 300)}`);
  }
  const j = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null } }>;
  };
  const msg = j.choices?.[0]?.message;
  let text = (msg?.content ?? "").trim();
  if (!text && msg?.reasoning_content) {
    // Fallback: the model spent everything on reasoning — take its last line.
    text = msg.reasoning_content.trim().split("\n").filter(Boolean).pop() ?? "";
  }
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!text) throw new Error("Sarvam chat returned empty content");
  return text;
}

/** One short WhatsApp-style nudge, stripped of markdown/quotes. */
export async function generateNudgeHinglish(offer: {
  signal: string;
  why: string;
  action: string;
  impact: string;
  audience: string;
}): Promise<{ hi: string; en: string }> {
  const facts = `Offer context for a small Indian merchant's customers:
- What is happening: ${offer.signal}
- Why: ${offer.why}
- The offer: ${offer.action}
- Audience: ${offer.audience}
- Expected benefit: ${offer.impact}`;

  const [hi, en] = await Promise.all([
    sarvamChat(
      `${facts}\n\nWrite ONE short WhatsApp message in friendly Hinglish (Hindi in Devanagari with common English words like offer, evening, Paytm kept in English). Address the customer by name later, so do not include a name. Max 160 characters. No quotes, no markdown, no hashtags, no emojis beyond at most one.`,
      { system: "You write crisp marketing nudges for small Indian shops.", maxTokens: 1000 },
    ),
    sarvamChat(
      `${facts}\n\nWrite ONE short WhatsApp message in simple English for the same offer. Do not include a customer name. Max 160 characters. No quotes, no markdown.`,
      { system: "You write crisp marketing nudges for small Indian shops.", maxTokens: 1000 },
    ),
  ]);

  return {
    hi: hi.replace(/^["“']|["”']$/g, "").split("\n")[0],
    en: en.replace(/^["“']|["”']$/g, "").split("\n")[0],
  };
}
