# RADAAR × Sarvam — The Merchant's Voice (Judge Guide)

> One page for the Sarvam judge: **which** Sarvam models we use and where, **why** Sarvam specifically, **how** the voice loop is engineered, and **step-by-step** how to demo it live in under 4 minutes.

---

## The one-sentence claim

**Sarvam is the merchant's interface.** A shopkeeper behind a counter doesn't read dashboards — they *ask*, in their own language. Sarvam powers the entire voice loop (saarika STT → sarvam-105b → bulbul TTS), writes every WhatsApp nudge in Hinglish **both in our app and inside the merchant's own n8n workflow**, and speaks every answer the merchant hears — whatever system generated it.

---

## The model matrix — every call site

| Model | Where it fires | What it does |
|---|---|---|
| **`sarvam-105b`** (chat) | `app/api/copilot/route.ts` | Copilot answers when the memory graph can't serve one — strictly from the live snapshot facts, replying in the merchant's language (Hinglish in, Hinglish out) |
| **`sarvam-105b`** (chat) | `lib/sarvam.ts` → offer flow | Writes **two** WhatsApp nudges per offer: Hinglish (Devanagari + common English words like *offer*, *evening*) and simple English — max 160 chars, no markdown, no customer names |
| **`sarvam-105b`** (chat) | **inside n8n** — `lib/n8n-workflows.ts` "Sarvam Nudge (Hinglish)" HTTP node | The merchant's own n8n workflow calls Sarvam directly to write the nudge during dispatch — Sarvam is load-bearing in the merchant's automation, not just our app |
| **`saarika:v2.5`** (STT) | `app/api/stt/route.ts` | Transcribes mic audio (multipart WAV) → `transcript` + detected `language_code` |
| **`bulbul:v3`** (TTS) | `app/api/tts/route.ts` | Speaks every copilot reply — speaker `priya`, language **auto-switched per text**: Devanagari detected → `hi-IN`, else Indian English `en-IN` |

**The line to remember:** *whatever answers the question — the Cognee graph or our live snapshot — the merchant hears it in Sarvam's voice.* And every offer nudge, in both orchestrators, is written by sarvam-105b.

---

## Why Sarvam only (the "why did you choose this" answer)

1. **The language IS the product.** India's merchants do business in Hinglish — Hindi grammar, English commerce words. Generic LLMs transliterate awkwardly and their voices carry foreign accents. Sarvam generates native Devanagari copy and speaks `hi-IN`/`en-IN` with an Indian voice — the nudge reads like a neighbor wrote it, not a bot.
2. **One vendor covers the full loop:** Indic LLM + Indic STT + Indic TTS. A merchant asks a question by voice and gets a voice back — zero typing, zero English required.
3. **Cost fits a chai stall:** ≈ ₹0.03 per nudge, ≈ ₹0.10/day for voice — pennies per merchant per day, so "AI business partner for *millions* of merchants" is a real business model, not a demo slide.
4. **The stack is genuinely Indic-first end to end:** we verified Devanagari nudge copy, hi-IN TTS, and Hindi STT against live audio from the app — not as a language toggle bolted onto an English product.

---

## The engineering story (what going deep on the API looked like)

Two problems we hit live and solved — this is the credibility beat with technical judges:

1. **`reasoning_effort: "low"` does not suppress reasoning on this deployment.** The model burned 6–13k tokens "thinking" for a 160-character nudge. Verified live, fixed with an explicit JSON `null` — clean short copy, `finish_reason: stop`. Plus defensive `<think>…</think>` stripping and a `reasoning_content` fallback so a response is never empty.
2. **Browsers record webm/opus; saarika rejects it.** We hit `400: Invalid file type: audio/webm;codecs=opus` live. Fix: a client-side WebAudio converter (`lib/wav.ts`) — decode → mono downmix → linear resample to 16 kHz → 16-bit PCM WAV encode — all in the browser, no server load. The mic path is now: **MediaRecorder → WAV conversion → saarika STT**; the browser's Web Speech API survives only as a labeled last-resort fallback, never the primary path.

Also: markdown is stripped from text *before* display **and** before TTS — Priya's voice never reads asterisks aloud. And the STT route never leaks raw error payloads to the UI — friendly human messages, details server-logged.

---

## Show it live — step by step (~4 minutes)

**Before the audience arrives (5 min):** run `npm run pipeline` once. Open the app, **grant mic permission to localhost in advance**, volume ~60%, stand where stage noise won't eat the Hindi input.

### Beat 1 — The full voice loop, end to end (90s)
1. Click the **mic** and ask in Hindi: *"Is hafte sabse zyada bike kis din hui?"* (or tap the suggested chip if the room is loud).
2. Narrate while it processes: *"The mic audio was converted to WAV in the browser and transcribed by **saarika**, Sarvam's Indic speech-to-text."*
3. The answer appears in Devanagari with the **grounded** badge: *"**sarvam-105b** answers — grounded in the merchant's own memory graph."*
4. The reply is spoken aloud: *"and **bulbul** speaks it — speaker Priya, hi-IN, auto-detected from the text. The merchant never reads a screen."*

### Beat 2 — The Hinglish nudge (45s)
Tap **Create evening offer**. The WhatsApp mock fills with Devanagari + "offer/evening" copy. Say: *"Written by sarvam-105b from this store's own detected data — 160 characters, no markdown, in the language the customer actually reads."*

### Beat 3 — Sarvam inside n8n (45s)
Open the n8n tab → **Ingest → Detect → Act** → open the **"Sarvam Nudge (Hinglish)"** HTTP node. Show the JSON body: the system prompt, the Hinglish rules, `reasoning_effort: null`. Say: *"Sarvam isn't only in our app — the merchant's own n8n workflow calls Sarvam directly. Two orchestrators, one Indic LLM."*

### Beat 4 — The engineering depth (30s, for technical judges)
Open `lib/sarvam.ts` and `lib/wav.ts` on screen. Two sentences: *"We benchmarked the reasoning controls live — only explicit null suppresses thinking on short-copy tasks. And when saarika rejected browser audio, we built a WebAudio converter to 16 kHz PCM WAV client-side. We went deep on this API."*

---

## curl it yourself (for a skeptical judge)

```bash
# 1. The nudge writer (exactly what the app and the n8n node send):
curl -X POST https://api.sarvam.ai/v1/chat/completions \
  -H "api-subscription-key: $SARVAM_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"sarvam-105b",
       "messages":[{"role":"system","content":"You write crisp WhatsApp marketing nudges for small Indian shops."},
                   {"role":"user","content":"Write ONE short WhatsApp message in friendly Hinglish. Situation: weekday evening sales down 18.9%. The offer: ₹30 off above ₹200, 5-8 PM weekdays. Max 160 characters, no markdown."}],
       "temperature":0.4, "reasoning_effort":null, "max_tokens":500}'

# 2. The voice (what speaks every copilot answer):
curl -X POST https://api.sarvam.ai/text-to-speech \
  -H "api-subscription-key: $SARVAM_API_KEY" -H "Content-Type: application/json" \
  -d '{"inputs":["Namaste! Aaj shaam 5 se 8 baje special offer hai."],
       "target_language_code":"hi-IN", "speaker":"priya", "model":"bulbul:v3"}'

# 3. STT (saarika:v2.5) — the app POSTs a WAV to /speech-to-text;
#    use the app's mic to hear it live, or send any 16 kHz WAV:
#    curl -X POST https://api.sarvam.ai/speech-to-text \
#      -H "api-subscription-key: $SARVAM_API_KEY" -F file=@speech.wav -F model=saarika:v2.5
```

---

## Likely judge questions & answers

- **"Why Sarvam instead of GPT-4o / Gemini?"** Three reasons: the merchant's language is the product and Sarvam is Indic-native (Devanagari generation, Indian voices, Indic STT); one vendor covers the entire voice loop; and the unit economics (pennies per nudge) make the "millions of merchants" story financially real. A generic model would need three vendors and still speak with the wrong accent.
- **"Which models, exactly?"** `sarvam-105b` at three call sites (app copilot, app nudge writer, n8n workflow node), `saarika:v2.5` for STT, `bulbul:v3` with speaker `priya` for TTS with hi-IN/en-IN auto-switching.
- **"What did you build yourself on top of the API?"** The client-side webm→WAV pipeline (saarika's format requirement met in the browser), the reasoning-parameter tuning verified live, the think-tag/reasoning_content fallbacks, per-text language auto-detection for TTS, and markdown stripping before both display and speech.
- **"Who answers the copilot question — Sarvam or Cognee?"** Honest architecture: the graph answers when it can (Cognee GRAPH_COMPLETION), sarvam-105b answers from live snapshot facts when it can't — and **bulbul speaks every answer either way**. Sarvam also writes every nudge in both orchestrators. The voice loop is 100% Sarvam; the knowledge tier is honest about its source.
- **"What about noisy shops — does STT hold up?"** That's why the suggested-question chips exist one tap away — voice is the magic moment, chips are the reliability floor. Never demo freeform speech on a loud stage.
- **"What would you add next?"** Streaming (realtime voice copilot), a morning **voice briefing** ("aaj ka Hisaab: offer ne ₹5,750 kamaye…") rendered by bulbul from the outcome facts, and multilingual expansion across Indian languages as the merchant base grows.

---

## Where the code lives (for the technical judge)

| Piece | File |
|---|---|
| Chat client + Hinglish/English nudge writer (verified params, reasoning handling) | `lib/sarvam.ts` |
| saarika STT route (friendly errors, never leaks payloads) | `app/api/stt/route.ts` |
| bulbul TTS route (speaker priya, hi-IN/en-IN auto-switch, GET streaming for `<audio>`) | `app/api/tts/route.ts` |
| Browser webm → 16 kHz PCM WAV converter | `lib/wav.ts` |
| The full voice loop wiring (mic → STT → answer → TTS) | `components/Copilot.tsx` |
| The Sarvam HTTP node **inside n8n** | `lib/n8n-workflows.ts` |
| Copilot text tier (sarvam-105b, snapshot-grounded fallback) | `app/api/copilot/route.ts` |
