# RADAAR — Build Progress Tracker

> **RADAAR: AI Growth Radar for Paytm Merchants** — an AI-powered business partner that turns everyday transaction data into a simple visual loop: **What happened → Why → What to do → Expected impact.**

**Track:** Merchant Growth AI · **Prize targeted:** Best AI Usage Team — $20,000 in AI credits (n8n, Cognee, Sarvam)

---

## Design evaluation — 3 designs, 1 winner (Sept 2026)

Built three **structurally different** UIs (not recolors) on one shared session hook (`lib/useRadaarSession.ts`), so switching was instant and the comparison apples-to-apples. The user picked **Operator Terminal** as the final design; the other two were removed.

| | A · Command Center | B · Story Focus | C · Operator Terminal ★ FINAL |
|---|---|---|---|
| **Structure** | Cockpit: 3D radar hero + 4 KPI cards + insight cards beside it | Single-column story: the 4-step What→Why→Do→Impact loop as one narrative card | Trading desk: KPI rail left, radar + action-queue center, permanent chat rail right |
| **Best for** | Big-screen demo; the "wow" moment | Merchants on phones; first-time comprehension | Power users; monitoring everything at once |
| **Weakness** | Long page; requires scrolling to copilot | Radar demoted; less "wow" on stage | Dense; overwhelming for first-timers |
| **Sponsor score** | Paytm 9/10 · n8n 8 · Cognee 8 · Sarvam 8 | Paytm 7 · n8n 7 · Cognee 7 · Sarvam 7 | Paytm 7 · n8n 8 · Cognee 8 · Sarvam 7 |

**Final call: C · Operator Terminal is the product.** The evaluation initially favored A (big-screen wow), but the user selected C — the everything-visible trading-desk layout — and A/B were removed from the codebase. C's zero-scroll density means radar, action queue, KPIs, anomalies, payments, copilot and memory are all on one screen: the whole RADAAR loop judge-visible without touching anything. Radar hero lives at the top of the center column.

Also in this pass:
- 3 full **themes** (Radar Blue / Money Vibe / Paytm Heritage) via a CSS-variable token system; radar 3D colors follow the theme; WCAG-AA-verified text tiers in all themes (fixed 4 failing tiers)
- Theme gallery at **/themes** for side-by-side comparison
- Fixed: browser webm/opus recordings now convert to WAV client-side (`lib/wav.ts`) so **Sarvam saarika STT accepts mic input** (was a 400); raw API error payloads no longer leak into chat; memory panel no longer shows "graph unreachable" when it simply has no memories yet
- Tokenized all hardcoded white/slate overlay classes so light theme renders correctly

---

## 📌 How to use this file

This is the single source of truth for build status. Update it after every work session:
- Move items between **Done / In Progress / Not Started**
- Add anything new to **Backlog** so nothing gets lost
- Log key decisions in the **Decision Log** at the bottom

---

## ✅ Done

- [x] Extracted and OCR'd the RADAAR deck (9 slides) → `docs/deck-slides/` (slide images) + `docs/PRODUCT-SPEC.md` (distilled spec)
- [x] Defined target architecture and tech-to-role mapping (n8n + Cognee + Sarvam + Next.js/Three.js)
- [x] Wrote full README (problem, solution, architecture, process, impact, validation)
- [x] Demo data strategy fixed: generate realistic synthetic Paytm-style transaction data (no real merchant data needed)
- [x] **Credentials secured in `.env` (gitignored, never committed):** Cognee API key ✓ · n8n cloud URL ✓ · Paytm sandbox test merchant ✓ (values redacted from the repo; see `.env.example` for the required fields).
- [x] **Verified Cognee Cloud integration details (docs.cognee.ai):** auth = `X-Api-Key` header + **per-tenant base URL** from the API Keys page (format `https://<tenant>.aws.cognee.ai`); core flow `POST /api/v1/add` → `POST /api/v1/cognify` → `POST /api/v1/search`; search types incl. GRAPH_COMPLETION / CHUNKS / TEMPORAL; **Cognee Cloud bills LLM usage from its own credits → no OpenAI key needed** (only for self-hosted Cognee).
- [x] **Verified Sarvam signup path:** dashboard.sarvam.ai → API Keys; free credits on signup (₹100–₹1,000 per docs/community) — enough for demo TTS/STT/chat.
- [x] Decision: Paytm sandbox is **optional garnish** (test portal is password+OTP login; no passwordless route) — synthetic data remains the primary demo spine.
- [x] **PHASE 1 COMPLETE — intelligence spine running end-to-end (40ms, typecheck clean):**
  - `lib/generator.ts` — seeded synthetic Paytm-style data: 90 days, ~13K txns, 1,300 customers, deck-scale KPIs (≈₹4.6L weekly revenue, avg ticket ≈₹353, ~143 inactive, ~111 at-risk), weekday/weekend rhythm, festive spikes (outside comparison windows), hero weekday-evening taper (−19%), churn cohort, new-customer trickle, planted whale/burst/slow-day anomalies
  - `lib/engines.ts` — per-date hour-cell aggregation, trend detection (evening dip vs pre-taper baseline, weekly revenue, avg ticket), anomaly detection (z-score whales, amount-bucketed duplicate bursts, traffic drops), 4-way segmentation
  - `lib/insights.ts` — business health score, KPI snapshot, opportunity scoring with ₹-range impact estimates, period-normalized ranking, 4-step insight cards (What/Why/Opportunity/Action/Impact)
  - `lib/demo.ts` — run with `npm run demo`
  - Verified demo output: hero card reads "Weekday evening sales are 18.9% below baseline → Launch a 5–8 PM weekday offer → ₹4,500–₹7,000 weekly (AI estimate)" — mirrors the deck's slide 5
- [x] Key correctness bugs caught & fixed during build: dow×hour cell-averaging artifact (windows of different lengths aren't comparable → now per-date cells); whale tx inflating KPIs (operational view excludes ≥₹10K from trend/KPI math, anomaly detector still catches it); burst detector false-positives on small tickets; duplicate loop block; period-blind opportunity ranking
- [x] **n8n API key received & live-verified:** `GET /api/v1/workflows` with `X-N8N-API-KEY` header → **200** (`{"data":[]}` — empty instance ready for our workflows). Programmatic workflow import is unblocked — no manual UI import needed.
- [x] **PHASE 1B COMPLETE — full AI loop runs end-to-end (`npm run pipeline`, ~100s, typecheck clean):**
  - `lib/pipeline.ts` — one command: resets memory dataset → generates snapshot → deploys n8n workflows → fires the 3 webhooks → cognifies → asks the graph grounded questions
  - **n8n: 3 workflows deployed + ACTIVATED programmatically** on the user's instance (RADAAR · Ingest→Detect→Act / Offer Dispatch / Outcome→Learning Loop) with idempotent upsert (old versions auto-replaced)
  - **Sarvam inside n8n:** workflow's HTTP node generates the Hinglish WhatsApp nudge (verified copy: "Evening regulars, daily ₹367 spend se ₹478 ka combo try karein…")
  - **Cognee memory:** facts (INSIGHT / OFFER DISPATCHED / OFFER OUTCOME) ingested via multipart add, graph built via cognify, and GRAPH_COMPLETION answers verified GROUNDED — answers cite the offer table, 935 at-risk audience, ₹5,750 actual vs ₹17–41k projected, verdict "worked" — zero hallucination
  - `lib/n8n.ts`, `lib/n8n-workflows.ts`, `lib/cognee.ts`, `lib/sarvam.ts` — reusable typed clients for the app (Phase 2) to call
- [x] **PHASE 2 COMPLETE — the entire web app is built, production-build green, and visually verified in the preview:**
  - `components/Radar.tsx` — Three.js 3D growth radar: ring grid, rotating sweep, severity-colored blip pillars with DOM ping rings synced from 3D tips, camera parallax, green outcome ripple
  - `app/page.tsx` — dashboard: health gauge, KPI strip, insight cards (What/Why/Opportunity/Action/Impact) with radar↔card two-way selection, **working Create-offer flow** (Sarvam → n8n dispatch → WhatsApp mock preview), **Measure-outcome flow** (n8n verdict → radar celebration banner → learning note), trends/anomalies/segments
  - `components/Copilot.tsx` — voice copilot: mic (Web Speech API, hi-IN), chat, one-tap Hinglish question chips, spoken replies via `/api/tts` (Sarvam bulbul:v3), "● grounded in memory graph" badges
  - API routes: `/api/snapshot` (cached spine), `/api/offer`, `/api/outcome` (both fire-and-forget cognify so memory stays fresh), `/api/copilot` (Cognee GRAPH_COMPLETION → snapshot-grounded Sarvam fallback), `/api/tts` (GET+POST)
  - **Live-verified in preview:** copilot answered "Is hafte sabse zyada bike kis din hui?" → "Shanivaar (Saturday) ko hui" grounded in the graph; Create-offer fired real n8n executions (green) + Cognee facts; outcome banner +₹28,049 (+6.1%) rendered; production build clean (234kB first load)
- [x] `docs/DEMO-SCRIPT.md` — timed 3-minute judge script with pre-flight checklist, fallback plan, and Q&A one-liners
- [x] **Cognee tenant FULLY VERIFIED (live API test):** `GET {BASE}/health` → healthy (v1.5.4, Postgres+pgvector); `GET /api/v1/datasets` → 200 with `default_dataset` owned by our user ID. Notes: health lives at **root** `/health` (not `/api/v1/health`); API routes 307-redirect on trailing slash — always call slash-free. Base URL + tenant + user id stored in `.env`.

## 🔶 In Progress

- [ ] Team name + any branding preference (cosmetic; dark premium + Paytm blue is the default)
- [ ] Record backup demo video (see `docs/DEMO-SCRIPT.md` pre-flight list)
- [x] **UI polish pass done:** markdown stripped from copilot answers (**bold** artifacts), radar camera now fills wide containers (fit-to-frame FOV math), fixed radar heights (440/500px) so the disc framing is stable, severity legend (opportunity/watch/critical) added to the radar card; verified visually section-by-section in the preview at ~890px width; no horizontal overflow; production build green
- [x] **Sponsor-evaluation audit fixes (no hardcoded anything):**
  - **Sarvam STT is now REAL**: mic records via MediaRecorder → `/api/stt` → Sarvam `saarika:v2.5` (browser recognition only as last-resort fallback); verified with live TTS→STT round-trip: "इस हफ़्ते सबसे ज़्यादा बाइक किस दिन हुई?" (hi-IN) — the full Sarvam voice loop (STT+chat+TTS) now runs on their stack
  - **Evening-offer impact computed from data** (dip depth × 20 weekday slots × 40–60% recovery = ₹9,096–₹13,644) — replaced the baked ₹4,500–₹7,000 deck constants
  - **Fabricated benchmark removed**: "comparable stores recover 6–12%" now stated honestly as a modeled assumption
  - **Severity logic fixed**: down-trend-linked or inactive-reactivation = critical (active leak), high-confidence growth = opportunity, rest watch — was literally always-"watch" dead code
  - **Payment mix strip added** ("How customers pay", computed from 30-day transaction methods — Paytm QR 78%/UPI 13%/Wallet 7%/Card 3%) — Paytm-relevant surface that was missing
  - **"What RADAAR remembers" panel added**: shows ground-truth facts via a memory audit log (outbox pattern in `.data/`, gitignored) because Cognee CHUNKS search returns LLM-processed summaries, not raw text; merged with prefix-validated graph chunks when available
  - **PlatformBar added**: judge-facing live chips linking to the real n8n instance + Cognee tenant + Sarvam model labels (no keys exposed)
  - "Sharma General Store" fallbacks in API routes removed (merchant always passed from data)
  - Lesson logged: never run `npm run build` while `next dev` is serving (clobbers .next → 500s)

## ⬜ Not Started (build order)

### Phase 0 — Inputs from you (see "Needed from you" for exact steps)
- [x] n8n cloud URL + API key received (`https://khushisarawagi.app.n8n.cloud/`) — **key live-verified (200 on workflows API)**; programmatic workflow create/activate unblocked
- [x] Cognee API key + tenant Base URL received — **live-verified: auth works, graph store healthy**
- [x] Sarvam AI API key received and **FULLY VERIFIED with a live voice round-trip**:
  - Chat: `POST /v1/chat/completions` `{"model":"sarvam-105b"}` → 200 (note: `sarvam-m` is deprecated)
  - TTS: `POST /text-to-speech` `{"inputs":[…],"target_language_code":"hi-IN","speaker":"priya","model":"bulbul:v3"}` → 200, returns `{audios:[base64]}` (decoded to 154KB RIFF WAV; `anushka` speaker doesn't exist on v3)
  - STT: `POST /speech-to-text` multipart `file=@audio.wav, model=saarika:v2.5` → 200, transcribed the TTS audio back perfectly ("नमस्ते, आपका आज का बिजनेस अपडेट तैयार है।", hi-IN)
  - Auth header: `api-subscription-key: <key>`
- [x] Paytm sandbox test credentials received (optional garnish — synthetic data is the demo primary)

### Phase 1 — Data & Intelligence core
- [x] Synthetic Paytm-style transaction generator (90 days, deck-scale KPIs, planted story) — done in Phase 1
- [x] n8n workflows: ingest → detect → act (Sarvam nudge) → write Cognee; offer dispatch (mock WhatsApp); outcome → learning loop — **deployed & activated programmatically, verified with live executions**
- [x] Cognee memory layer: fact ingestion (add→cognify→search verified), deterministic fact-shaping from snapshots, dataset reset for clean reruns, grounded-answer polling
- [x] Insight engine: "What happened / Why / What next / Expected impact" card generation — done in Phase 1

### Phase 2 — Frontend (the wow factor) — ✅ DONE
- [x] Next.js app shell, dark premium theme, glassmorphism, motion design
- [x] **Radar view** (Three.js): sweep + pinging blips + outcome ripple
- [x] Merchant dashboard: Revenue Pulse, KPIs, Business Health, segments, anomalies
- [x] Insight card flow with working Create-offer CTA → n8n → WhatsApp mock preview
- [x] AI Copilot chat (Sarvam) with voice input + Hindi voice replies
- [x] Nudge delivery mock: WhatsApp preview rendered from the real Sarvam output

### Phase 3 — The Learning Loop (differentiator) — ✅ DONE
- [x] Action → outcome capture via n8n workflow with verdict
- [x] Feedback into Cognee graph (outcome facts + fire-and-forget cognify)
- [x] Impact projection ₹ ranges + visual celebration on measured uplift

### Phase 4 — Pitch assets — mostly done
- [x] Demo script (`docs/DEMO-SCRIPT.md`)
- [ ] Demo recording (backup video) — needs a manual screen record
- [x] README with verified proof points
- [ ] Optional: GIF/screenshots of radar in README

---

## 🧭 North-star demo flow (what judges should see in 3 minutes)

1. Merchant opens RADAAR → 3D radar pings: "Weekday evening sales 23% below weekend baseline"
2. One tap → **Why**: "5–8 PM regulars visit less on weekdays" (explanation grounded in Cognee memory)
3. One tap → **Opportunity**: "Re-engage 186 inactive customers", **Action**: "Launch 5–8 PM weekday offer", **Expected impact**: "₹4.5K–₹7K weekly (AI estimate)"
4. Tap **Create offer** → n8n workflow fires → mock WhatsApp nudge to customers
5. Days later (simulated) → outcome lands, radar shows uplift, Cognee graph learns → next recommendation is smarter
6. Copilot voice Q&A in Hindi: *"Is hafte sabse zyada bike kis din hui?"* → Sarvam answers from memory

---

## 🛠 Needed from you

| # | Item | Why | How to get it | Status |
|---|------|-----|---------------|--------|
| 1 | ~~n8n API key + workflow access~~ | Received + **live-verified** (200 on `/api/v1/workflows`; instance is empty and ready) | — | ✅ Done |
| 2 | ~~Cognee Base URL~~ | Received: `https://tenant-f0939db8….aws.cognee.ai` — live-tested, auth ✓ | — | ✅ Done |
| 3 | ~~Sarvam API key~~ | Received + live-verified (chat, TTS, STT round-trip all 200) | — | ✅ Done |
| 4 | ~~LLM key for Cognee~~ | Not needed — Cognee Cloud bills LLM usage from its own credits | Only required if we self-host Cognee (we won't for the demo) | ✅ N/A |
| 5 | ~~Paytm sandbox creds~~ | Received (77777 77777) | Optional garnish only; demo runs on synthetic data | ✅ Done (optional) |
| 6 | Team name + branding prefs | README, UI polish, pitch deck | Just tell me the team name; theme default = dark premium + Paytm blue accents | ⬜ |

## 📝 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-18 | Synthetic Paytm-style dataset as primary data | No dependency on real creds; full control of story; judges see realistic Indian merchant patterns |
| 2026-09-18 | n8n = orchestration backbone, Cognee = memory/knowledge graph, Sarvam = vernacular copilot | Maps each sponsor tech to a load-bearing role (not decoration) → "Best AI Usage" case |
| 2026-09-18 | Radar (radial sweep + pinging blips) as the signature UI moment | Matches the product name RADAAR and deck's "Growth Radar" metaphor; memorable in 3-min demo |
| 2026-09-18 | Insight cards follow deck's exact loop: What happened → Why → Opportunity → Action → Expected impact | Stays aligned with the official problem statement & deck narrative |
| 2026-09-18 | Secrets live only in `.env` (gitignored); a redacted `.env.example` documents what's needed | Never risk leaking keys in the repo (hackathon disqualification risk) |
| 2026-09-18 | Cognee via **Cloud REST API** (`/api/v1/add` → `/cognify` → `/search`), not Python SDK self-host | Zero infra; LLM usage billed from Cognee credits; demo stays one-command |
| 2026-09-18 | n8n used for **both** compute workflows *and* serving the webhooks our Next.js app calls | Judges can open n8n and see the AI pipeline working live — strong 'Best AI Usage' optics |
| 2026-09-18 | "Operational view": transactions ≥₹10K excluded from trend/KPI math but surfaced by anomaly detector | One whale was inflating weekly revenue +46% and avg ticket +36%; keeps KPIs honest while still flagging the event |
| 2026-09-18 | Hour cells bucketed per-date (not per-dow) so trend windows of different lengths are comparable | dow×hour collapse made a 38-day baseline look 2–3x recent regardless of behavior — all dip %s were artifacts |
| 2026-09-18 | Synthetic data tuned to deck-scale KPIs (1,275 customers, avg ₹353, ₹4.6L weekly, −19% evening dip, 143 inactive) | Demo numbers should echo the deck's story (1,284 / ₹347 / 23% dip / 186 inactive) for judge recognition |
| 2026-09-18 | All three sponsor platforms verified live on the same day → build order: n8n pipeline first, then Cognee memory, then Next.js/radar UI wired to both | Credentials were the only external blocker; now everything is buildable in parallel without waiting on anyone |
| 2026-09-18 | Sarvam `reasoning_effort: null` (explicit JSON null) for short-copy tasks | Verified live: "low" does NOT suppress reasoning on this deployment (model burned 6–13k tokens thinking); null gives clean 160-char copy with finish_reason=stop |
| 2026-09-18 | Cognee graph readiness polled via CHUNKS search (never re-POST /cognify) | Each POST /cognify STARTS a new pipeline run — polling by re-POSTing spawns duplicate runs (observed live) |
| 2026-09-18 | Secrets baked into n8n node params at deploy time (bakeEnv) | n8n Cloud blocks `$env` access; workflows live in the user's private instance so baking is acceptable — noted as demo tradeoff |
| 2026-09-18 | Memory facts are deterministic shaped sentences (no LLM in the write path) | Keeps the graph crisp and retrievable; LLM creativity is reserved for the copilot/nudge read path |
| 2026-09-18 | Pipeline resets the Cognee dataset at start of each run | Demo reproducibility: graph always reflects exactly one full loop; no stale facts confusing the grounded answers |
| 2026-09-18 | Memory panel reads an append-only audit log (outbox) of facts we wrote to Cognee, merged with prefix-validated graph chunks | Cognee CHUNKS search returns LLM-processed summaries (sometimes conversational artifacts), and a "what RADAAR remembers" panel must show ground truth, not model chatter |
| 2026-09-18 | Impact estimates computed from the merchant's own detected data; modeled assumptions stated as assumptions in copy | A sponsor evaluator will call out any fabricated benchmark or baked constant — transparency IS the pitch |
| 2026-09-18 | Voice input uses Sarvam saarika via MediaRecorder upload; browser STT only as fallback | The Sarvam team will check which parts of THEIR stack are used — Web Speech API would have been a miss for the "Best AI Usage" case |
| 2026-09-19 | Demo collateral split into three docs: DEMO-SCRIPT (live click-path), VIDEO-SCRIPT (shot-by-shot recording), JUDGE-PITCH (pitch + Q&A crib) | Each artifact has a different job under time pressure; one doc doing all three served none well. VO budgeted at ~145 wpm with deliberate slack so pacing never forces faster clicks |
| 2026-09-19 | n8n judge guide (docs/N8N-GUIDE.md): 3 workflows documented node-by-node, programmatic deploy story, 5-beat live demo, curl replay, Q&A crib | n8n evaluators score load-bearing usage + inspectability; a dedicated walkthrough beats hoping judges find the executions tab themselves |
| 2026-09-19 | Cognee judge guide (docs/COGNEE-GUIDE.md): 7-type fact schema, two-writer architecture (pipeline + inside-n8n writes), never-hallucinate read path, 5-beat live demo incl. negative grounding test, curl replay | Cognee evaluators want to see the graph load-bearing AND visible; the negative-grounding beat (copilot refuses to invent) is the differentiator demo |
| 2026-09-19 | Sarvam judge guide (docs/SARVAM-GUIDE.md): 5 call sites across 3 models (sarvam-105b ×3 incl. inside n8n, saarika STT, bulbul TTS), live-verified API engineering stories, 4-beat demo, curl replay | Sarvam evaluators score depth + breadth of their stack; the "why Sarvam only" economics/language case and the n8n-internal call site are the differentiators |
