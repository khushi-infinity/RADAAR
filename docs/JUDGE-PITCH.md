# RADAAR — Judge Pitch (live demo + Q&A crib)

> Companion to `DEMO-SCRIPT.md` (the timed click-path) and `VIDEO-SCRIPT.md` (the submission video). This doc covers **what to say and why**: the 30-second elevator pitch, how to frame the product for each judge in the room, and exact answers to the questions hackathon judges actually ask.

---

## The 30-second elevator pitch (memorize verbatim)

> "India's three crore merchants see payment numbers all day — but no one tells them what to *do*. RADAAR is the AI business partner that closes that gap: it detects what changed, explains why, prescribes the next best action with a rupee value attached, and then **learns from the result**. Not another dashboard — a partner that answers three questions: what happened, why, and what should I do tomorrow."

If you only get 10 seconds: *"Merchants have data. RADAAR gives them answers — and a partner that learns from every action."*

---

## Why each judge should care (open with the one that matches the room)

**Paytm — "this deepens our moat."**
Payments are a commodity; *outcomes* are not. RADAAR sits on top of Paytm rails and gives merchants a reason to never leave: every offer, outcome, and lesson compounds inside their Paytm-linked memory. It also opens new surfaces — merchant offers, lending signals, inventory financing — all grounded in outcome data Paytm doesn't have today. Your line: *"You already own the transaction. RADAAR makes you own the decision."*

**n8n — "our platform is the pipeline."**
This isn't an n8n logo in the footer. Offer creation literally POSTs through the merchant's own n8n instance; the workflow calls Sarvam, dispatches, and writes to Cognee. Three workflows, deployed programmatically via the n8n API, visible with green executions. Your line: *"n8n isn't in our stack — it IS our stack. Open the instance and watch the runs."*

**Cognee — "our graph is the memory and the honesty."**
Every insight, offer, and outcome is a fact in the merchant's knowledge graph — and the copilot's answers cite it. Ask "what offers has this store run?" and Cognee answers with offer IDs, audience sizes, and the measured ₹ uplift. Zero hallucination because answers must trace to stored facts. Your line: *"The 'grounded' badge on every answer isn't decoration — it's Cognee."*

**Sarvam — "we're the merchant's voice, literally."**
Three Sarvam models are load-bearing: `sarvam-105b` writes the Hinglish nudge and answers the copilot, `saarika` transcribes the merchant's voice, `bulbul` speaks the reply. Verified end-to-end in Hindi — mic to text to reasoning to spoken answer. Your line: *"A shopkeeper behind a counter doesn't read dashboards — they ask. In their own language."*

---

## The story arc (say this, then run the live demo)

1. **Hook:** "A kirana store in Kanpur does ₹4.6 lakh a week across 13,000 payments. Last Tuesday evening, it quietly started losing money — and no dashboard on earth told the owner why."
2. **The gap:** "Merchants have data. They don't have answers. Analytics shows *what*, never *why*, never *what next*."
3. **The loop:** "RADAAR's contract is four beats: What happened → Why → What to do → Expected impact — every number computed from the merchant's own data, every assumption labeled."
4. **The proof:** "And it's not slides. The offer you're about to see runs on the merchant's own n8n, written by Sarvam, remembered by Cognee — and the outcome feeds back. The system gets smarter every day for every merchant."
5. **Demo** → hand over to `DEMO-SCRIPT.md`.

---

## Answers to the questions judges actually ask

**"What's actually mocked?"**
One thing: the final WhatsApp send (needs a Meta Business API gate). Every detection, AI call, workflow execution, and memory write is real infrastructure you can open and inspect.

**"Why a knowledge graph? Why not just Postgres?"**
Because the product is *explanation*. The graph links segment → behavior → action → outcome, so the copilot's answers cite this merchant's own history instead of a generic model's guess. Retrieval from rows gives you data back; retrieval from the graph gives you a *because*.

**"How is this different from Khatabook / OkCredit / a plain LLM chatbot?"**
Ledger apps record the past; a plain LLM hallucinates the future. RADAAR computes the present deterministically (trend/segment/anomaly engines), acts through real automation, and grounds its language in the merchant's verified memory. The differentiator is the **closed loop** — measured outcomes feed the next recommendation.

**"Is the data real?"**
Synthetic, seeded, and deliberately so — 90 days of Paytm-style behavior (weekday rhythm, festive spikes, an evening taper, churn cohorts, planted anomalies). It's computed at runtime, nothing hardcoded, and the honesty chip in the UI says exactly that. Same engines, real Paytm data, one integration.

**"What's the moat?"**
The outcome graph. Competitors can copy the UI in a week; they cannot copy six months of *what worked for this store* per merchant. It compounds per merchant and is proprietary to the platform that holds it.

**"Cost per merchant?"**
Sarvam chat ≈ ₹0.03 per nudge, TTS ≈ ₹0.10 per day; Cognee Cloud runs on credits; n8n is already the merchant's automation home. Pennies per merchant per day at a ₹30–50/month price point — healthy margin, and the upsell surface (lending, inventory) is worth more than the subscription.

**"How does it scale to millions?"**
The engines and pipelines are shared; the state is per-merchant. One n8n deployment pattern, one graph schema, N merchants. Nothing in the architecture is per-merchant custom.

**"What breaks first at scale?"**
Candidly: Cognee graph size per merchant. Mitigation is time-windowing facts and tiering (hot facts in the graph, cold in object storage) — an engineering problem, not an architectural one.

**"Why would Paytm not just build this?"**
They should — and this is a blueprint for exactly that. We've proven the loop end-to-end on their problem statement, their rails, and their merchants' language. The fastest path to market for Paytm is acquiring/adopting a working loop, not starting from zero.

---

## Delivery notes

- **Never debug on stage.** If something hangs, say "on hotspot" or "cached run" and move to the next beat — the fallback plan is in `DEMO-SCRIPT.md`.
- **Numbers beat adjectives.** Say "down eighteen-point-nine percent, worth nine to thirteen thousand a week" — never "sales dropped a lot."
- **Name the sponsor at the moment their tech does the work** (Sarvam when the nudge appears, n8n when you open executions, Cognee when the memory panel updates).
- **End on the radar, always.** The sweep is the brand.
- If judges interrupt with questions mid-demo — take it as a win, answer in one line from this crib, then return to the exact beat you left.
