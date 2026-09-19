# RADAAR × Cognee — How the Memory Graph Powers the Product (Judge Guide)

> One page for the Cognee judge: **what** Cognee does in RADAAR, **how** it's wired (write path → cognify → read path), and **step-by-step** how to demo it live in under 4 minutes.

---

## The one-sentence claim

**Cognee is RADAAR's long-term memory and its honesty guarantee:** every insight, offer, and measured outcome is written as a fact into a per-merchant knowledge graph (`radaar_merchant_memory` on Cognee Cloud), cognified into a graph, and the copilot's answers are retrieved from that graph — so every answer traces to something the system actually recorded. Zero hallucination by construction.

---

## Why a knowledge graph at all

A merchant copilot lives or dies on trust. A generic LLM will happily invent "similar stores recover 6–12%." RADAAR's contract is that **every number in every answer comes from this merchant's own recorded history**:

- The graph links **segment → behavior → action → outcome** across days — exactly the chain a "why did this happen?" question needs.
- Rows in Postgres give you data back; a graph gives you a *because*.
- The graph **compounds**: today's outcome fact sharpens tomorrow's recommendation. That memory is the moat — it can't be copied by a generic dashboard.

---

## The write path — what gets stored

All fact shaping is **deterministic code, not an LLM** (`lib/cognee.ts`) — memory stays crisp and retrievable; LLM creativity is reserved for the read path. Each fact is one text file, added via `POST /api/v1/add` (multipart), one clean retrievable unit per fact.

| Fact type | Written when | Example (abbreviated) |
|---|---|---|
| `MERCHANT PROFILE` | pipeline ingest | "…health score 87/100 (excellent). Weekly revenue ₹4,59,820 (up 3.2%)… 1,275 total customers… avg ticket ₹353." |
| `TREND` | pipeline ingest | "weekday evenings (5–8 PM) revenue moved down 18.9% versus pre-taper weekday baseline. Current ₹41,200 vs baseline ₹50,800 over 1,140 transactions." |
| `ANOMALY` | pipeline ingest | "Unusually large transaction of ₹24,500 (z-score 103.0, type whale)." |
| `SEGMENT` | pipeline ingest | "143 customers in the inactive segment; average ticket ₹290." |
| `INSIGHT` | pipeline ingest / n8n | "signal: weekday evenings down 18.9% Why: 5–8 PM regulars visiting less Recommended action: 5–8 PM weekday offer Expected impact: ₹9.1K–₹13.6K weekly." |
| `OFFER DISPATCHED` | **inside the n8n offer workflow** | "…ran offer off_2026-09-19_eve targeting 111 customers in the at_risk segment… Nudge sent (Hinglish): '…'" |
| `OFFER OUTCOME` | **inside the n8n outcome workflow** | "…produced a revenue change of +₹5,750 rupees (+1.3%) over the following week. The offer worked; similar actions should be recommended again." |

**Two writers, one graph:** the pipeline writes the daily intelligence facts; the **n8n workflows write the action facts from inside the merchant's own automation** — offer dispatches and measured outcomes. Cognee is where the two streams meet and compound.

### Graph construction (cognify)

After facts are added, `POST /api/v1/cognify {datasets:["radaar_merchant_memory"]}` builds the graph asynchronously. Two hard-won rules, verified live and encoded in the client:

1. **Each cognify call STARTS a pipeline run** — so the code polls readiness via a cheap `CHUNKS` search instead of ever re-POSTing cognify (re-POSTing spawned duplicate runs when we tried it).
2. **The pipeline resets the dataset first** (`DELETE /api/v1/datasets/{id}`) so the demo graph always contains exactly one full, current loop — no stale facts confusing grounded answers.

---

## The read path — how answers stay grounded

**Copilot (`app/api/copilot/route.ts`) — two-tier, never-hallucinate:**

1. **Preferred:** probe the graph with a cheap `CHUNKS` search; if data is visible, run the real question as `GRAPH_COMPLETION` — Cognee's LLM answer generated *from the graph*. Response is tagged `source: "memory-graph"` → the UI shows the **"● grounded in memory graph"** badge.
2. **Fallback:** if the graph is unreachable/empty, Sarvam answers strictly from the live snapshot facts, with the prompt "using ONLY the data above" — tagged `source: "live-snapshot"`. Still grounded, honestly labeled. **There is no path where the copilot freestyles.**

**Verification guard (`askWhenReady`):** the pipeline never trusts a graph answer until our own planted fact prefixes (`OFFER OUTCOME`, `OFFER DISPATCHED`, `INSIGHT`) are visible via CHUNKS — grounding is *proven* before any answer is accepted.

**Memory panel (`/api/memory`):** shows judges the actual facts. It merges (a) an append-only audit log of facts our server wrote to Cognee (outbox pattern — ground truth) with (b) prefix-validated chunks read back from the graph.

---

## Show it live — step by step (~4 minutes)

**Before the audience arrives (5 min):** run `npm run pipeline`, wait for `✅ END-TO-END COMPLETE`. Open the app at http://localhost:3000 and a second tab: https://console.cognee.ai (logged in — the tenant with the dataset).

### Beat 1 — The badge (15s)
Point at the right rail: **"What RADAAR remembers"**. Say: *"This panel is the merchant's knowledge graph — every fact RADAAR has learned about this store, as actually stored in Cognee."*

### Beat 2 — Ask the graph a question only memory can answer (45s)
In the copilot, click the chip or type: **"What offers has this merchant run and what were the results?"**

The answer cites **offer IDs, audience sizes, and the measured ₹ uplift with the verdict** — facts that exist *only* because the n8n workflows wrote them. Say: *"No LLM could guess this. It's retrieved from the graph. That's the 'grounded in memory graph' badge on every answer."*

### Beat 3 — The learning loop, visibly (60s)
Tap **Create evening offer** → wait for the nudge → tap **measure outcome**. Watch the memory panel gain the new `OFFER DISPATCHED` and `OFFER OUTCOME` facts (auto-refresh). Say: *"The measured result just became memory. The next recommendation is now grounded in what actually worked for THIS store. That's the loop — and it compounds per merchant."*

### Beat 4 — The graph itself (45s)
Switch to the **Cognee console** → dataset `radaar_merchant_memory` → show the data items (one per fact) and the graph view: entities and relations built from the merchant's own story. Say: *"This is Cognee Cloud — the add → cognify → search pipeline, running on the merchant's tenant. We didn't host anything; we used Cognee exactly as a Paytm integration would."*

### Beat 5 — Prove grounding negatively (30s) *(the killer moment)*
Ask the copilot something **not in the data**: *"How many chickens does the merchant own?"* The copilot refuses to invent — it says what IS available instead. Say: *"That's the difference between a chatbot and a business partner: it cannot hallucinate, because answers must trace to stored facts."*

---

## curl it yourself (for a skeptical judge)

```bash
# 1. What's in the memory? (raw chunks read back from the graph)
curl -X POST "$COGNEE_BASE_URL/api/v1/search" \
  -H "X-Api-Key: $COGNEE_API_KEY" -H "Content-Type: application/json" \
  -d '{"searchType":"CHUNKS","query":"merchant offer outcome","datasets":["radaar_merchant_memory"]}'

# 2. Ask the graph a real question (LLM completion grounded IN the graph)
curl -X POST "$COGNEE_BASE_URL/api/v1/search" \
  -H "X-Api-Key: $COGNEE_API_KEY" -H "Content-Type: application/json" \
  -d '{"searchType":"GRAPH_COMPLETION","query":"What offers has this merchant run, who were they aimed at, and what were the results?","datasets":["radaar_merchant_memory"]}'

# 3. The full write→cognify→verify cycle, one command:
npm run pipeline    # resets dataset, all 3 n8n workflows write facts, cognify,
                    # then PROVES grounding: answers must match planted facts
```

The pipeline's final step is the proof: it runs `GRAPH_COMPLETION` against *"What offers has this merchant run…"* and prints the answer — which cites the very facts the workflows wrote minutes earlier.

---

## Likely judge questions & answers

- **"Why Cognee rather than a vector DB / Postgres?"** Vector search returns similar text; it can't answer "what happened, why, and did the fix work" as one reasoned chain. The graph links segment → behavior → action → outcome with typed relations, so `GRAPH_COMPLETION` reasons over the merchant's actual history. Plus Cognee Cloud gives us add/cognify/search with zero infra — the exact integration shape Paytm would deploy.
- **"Why deterministic facts — no LLM in the write path?"** Memory quality gates answer quality. An LLM writing memory drifts; template facts are crisp, comparable across time, and cheap. LLM intelligence is spent on the read path where it compounds with the graph.
- **"How do you prevent hallucination?"** Structurally, not by prompt alone: (1) answers come from `GRAPH_COMPLETION` over stored facts; (2) the pipeline *verifies* planted facts are visible before trusting the graph; (3) the fallback path answers only from live snapshot facts and is labeled as such. The UI shows which source served the answer.
- **"What about memory growing unbounded?"** The pipeline resets the demo dataset for reproducibility; production design is time-windowed facts with tiering (hot facts in the graph, cold in object storage) and per-merchant datasets — one graph per merchant is also the isolation/paymetns-compliance story.
- **"What did YOU build on Cognee?"** The fact schema (7 typed fact shapes), the two-writer architecture (pipeline + inside-n8n writes), the Cloud REST client with the cognify-dedup and readiness-polling contracts verified live, the never-hallucinate two-tier copilot, and the memory panel that exposes the graph's contents to evaluators.
- **"Why does the memory panel sometimes show fewer items than the console?"** CHUNKS search returns LLM-processed chunks; we only display chunks that carry our fact prefixes, merged with our own audit log — the panel shows ground truth, not model chatter. Honesty about the tooling is part of the design.

---

## Where the code lives (for the technical judge)

| Piece | File |
|---|---|
| Cognee Cloud client: add / cognify / search (+ verified API contracts, readiness polling) | `lib/cognee.ts` |
| Deterministic fact shaping (snapshot/trend/anomaly/segment/insight/offer/outcome) | `lib/cognee.ts` (bottom section) |
| End-to-end proof: reset → facts → cognify → grounded Q&A | `lib/pipeline.ts` (`npm run pipeline`) |
| Grounded copilot (graph-first, snapshot fallback, source labeling) | `app/api/copilot/route.ts` |
| Memory panel API (audit-log outbox + prefix-validated graph chunks) | `app/api/memory/route.ts`, `lib/memory-log.ts` |
| The other writer: n8n workflows posting facts into Cognee | `lib/n8n-workflows.ts` (Cognee HTTP nodes) |
