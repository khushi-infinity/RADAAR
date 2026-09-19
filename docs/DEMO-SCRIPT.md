# RADAAR — 3-Minute Live Demo Script

> Goal: judges see the deck's exact loop — **What happened → Why → What to do → Expected impact → Learning** — running on real sponsor infrastructure (n8n + Cognee + Sarvam), not slides.

---

## Pre-flight (10 minutes before, NOT on stage)

1. `npm run pipeline` → guarantees: 3 fresh n8n workflows active, Cognee dataset reset + cognified, Sarvam verified. Wait for `✅ END-TO-END COMPLETE`.
2. `npm run dev` → open http://localhost:3000, confirm the radar renders.
3. Chrome/Edge open with mic permission **already granted** to localhost (voice demo).
4. Second browser tab: your n8n instance workflows page (https://khushisarawagi.app.n8n.cloud).
5. Volume up ~60% (Sarvam voice reply must be audible).

**Fallback if venue Wi-Fi dies:** everything except voice still works — the spine (`npm run demo`), the dashboard, and the radar are local; copilot answers fall back to the live-snapshot path automatically; only Sarvam voice and Cognee graph answers need the network. Say "on hotspot" and move on — never debug on stage.

---

## 0:00–0:25 — The hook (dashboard)

**Screen:** RADAAR dashboard.

> "This is Sharma General Store — 1,275 customers, ₹4.6 lakh a week. Every dashboard shows *numbers*. RADAAR shows the four answers a merchant actually needs: What happened, why, what to do, and what it's worth."

**Point at:** health 87/100, the four insight cards, and the radar — *"those pings are growth opportunities, detected live."*

## 0:25–1:00 — What happened → Why → What to do → Impact

**Click the WATCH card** — "Weekday evening sales are 18.9% below baseline."

> "RADAAR detected a revenue leak: weekday 5–8 PM sales dropped 19%. It explains the *why* — the evening regulars stopped coming — and prescribes the fix with a price tag: a 5-to-8 PM offer worth ₹4,500 to ₹7,000 a week."

**Point at the radar blip pinging.**

## 1:00–1:45 — Create offer (Sarvam + n8n, live)

**Click "Create evening offer".**

> "One tap. Inside the merchant's own n8n — the automation platform — a workflow is calling Sarvam, India's Indic LLM, to write the WhatsApp nudge in Hinglish, dispatching it to 111 at-risk customers, and filing the action into Cognee, the merchant's memory graph."

**Read the nudge on screen** (WhatsApp mock): *"Hello! Humare yahan weekday evening 5-8 PM pe special offer hai…"*

**Switch to n8n tab → Executions → open the green run.** Ten seconds. *"Judges — this is the actual workflow, running on real infra. Nothing here is mocked except the WhatsApp send itself."*

## 1:45–2:20 — The learning loop (the differentiator)

**Back to RADAAR → click "Measure outcome → close the loop."**

Green ripple sweeps the radar; banner: **"Offer landed: +₹28,049 (+6.1%) — RADAAR learned."**

> "A week later the outcome flows back through n8n into Cognee. Every action becomes new intelligence — the next recommendation is grounded in what actually worked for THIS store. That loop is the moat: it compounds per merchant and can't be copied by a generic dashboard."

## 2:20–3:00 — Voice copilot in Hindi + memory graph

**Click the mic, ask:** *"Is hafte sabse zyada bike kis din hui?"*

Sarvam's voice answers in Hindi.

> "A shopkeeper behind a counter doesn't read dashboards — they ask. And the answer isn't from a generic LLM: it's grounded in this merchant's own knowledge graph — every number traceable. Ask Cognee 'what offers has this store run' and it cites offer IDs, audiences, and measured revenue. Merchants have data. RADAAR gives them answers — and a business partner that learns."

**End on the radar.**

---

## One-liners if judges ask

- **"What's mocked?"** Only the final WhatsApp send (API-gated). Every detection, AI call, workflow, and memory write is real.
- **"Why Cognee, not just Postgres?"** The graph links segment→behavior→action→outcome, so explanations cite history and answers are *grounded* — we verified zero-hallucination responses against planted facts.
- **"Scale?"** The loop is per-merchant, the engine is shared — same n8n pipelines and graph patterns for a chai stall or a chain.
- **"Cost?"** Sarvam chat ≈ ₹0.03/nudge, TTS ≈ ₹0.10/day; Cognee Cloud credits cover the graph. Pennies per merchant per day.

## Also prepped

- `npm run demo` — 40ms offline spine for the absolute worst case.
- Backup video: record `npm run pipeline` + dashboard flow once before the event.
