# RADAAR × n8n — What n8n Does and How to Show It (Judge Guide)

> One page for the n8n judge: **what** our three workflows do, **how** they're built and deployed, and **step-by-step** how to demo it live in under 4 minutes.

---

## The one-sentence claim

**n8n is not decoration in RADAAR — it IS the action layer and the learning loop.** Three workflows live in the merchant's own n8n instance, are deployed programmatically via the n8n public API, and every merchant action in the UI fires a real webhook into them.

---

## The three workflows

### 1. `RADAAR · Ingest → Detect → Act`
**Trigger:** Webhook `POST /webhook/radaar-ingest` (the intelligence spine posts the merchant snapshot).

```
Webhook → IF "Action needed?" ─TRUE→ HTTP Request: Sarvam chat → Code: Build Memory Fact → HTTP: Cognee /add → Set: Respond
                              └FALSE→ Set: No Action Needed (status: monitored-no-action)
```

- **IF node** decides whether the snapshot warrants action (`needsAction`) — the merchant's business rules live as n8n logic.
- **HTTP Request → Sarvam** (`sarvam-105b`): writes ONE ≤160-char WhatsApp nudge in Hinglish from the signal/why/action/impact (system prompt: "You write crisp WhatsApp marketing nudges for small Indian shops").
- **Code node** composes a deterministic memory fact (INSIGHT + health + revenue + signal + nudge) and packages it as a binary file.
- **HTTP Request → Cognee** `POST /api/v1/add` (multipart) writes the fact to the merchant's memory dataset.
- **Set node** responds to the caller with `{status, nudgeHi, dataset, cogneeAdd}` — that nudge is what the UI shows.

### 2. `RADAAR · Offer Dispatch`
**Trigger:** Webhook `POST /webhook/radaar-offer` (fired when the merchant taps **Create offer** in the terminal).

```
Webhook → Code: Prepare Delivery + Fact → HTTP: Cognee /add → Set: Respond
```

- Code node builds the delivery manifest (offer ID, audience size, per-recipient sample with name/phone/channel) and the OFFER DISPATCHED memory fact.
- Cognee node files it → the copilot can later answer *"what offers has this store run?"* with IDs and audiences.
- Responds with `{status: "dispatched (N shown of M)", deliveryPreview, messageHi}` — the UI renders this as the WhatsApp mock.

### 3. `RADAAR · Outcome → Learning Loop`
**Trigger:** Webhook `POST /webhook/radaar-outcome` (fired when the merchant taps **measure outcome** a week later).

```
Webhook → Code: Verdict + Fact → HTTP: Cognee /add → Set: Respond
```

- Code node computes the verdict from the measured uplift: `> +1% → worked · < −1% → underperformed · else neutral` — plus a lesson ("recommend similar actions again" / "deprioritize and try a different angle").
- Writes the OFFER OUTCOME fact to Cognee → **this is the learning loop: the measured result becomes retrievable memory that grounds the next recommendation.**
- Responds with `{verdict, lesson}` — the UI shows it as the outcome banner; the radar ripples green.

---

## The part n8n judges specifically score: **programmatic deployment**

`npm run pipeline` (`lib/pipeline.ts` + `lib/n8n.ts`) does NOT ask a human to click anything in n8n. It:

1. Lists existing workflows via `GET /api/v1/workflows` (auth: `X-N8N-API-KEY`).
2. Deletes any older workflow with the same name (**idempotent** — safe to re-run).
3. Creates all three via `POST /api/v1/workflows` — nodes, connections, and coordinates defined in code (`lib/n8n-workflows.ts`).
4. Activates each via `POST /api/v1/workflows/{id}/activate`.
5. Immediately exercises all three webhooks end-to-end and prints the Sarvam nudge, the dispatch preview, and the learning verdict.

Secrets inside the workflows: definitions use `{{ $env.* }}` expressions; because n8n Cloud blocks `$env` for API-created workflows, the deploy step bakes literal values from the local `.env` (workflows live in the user's **private** instance — a documented, conscious tradeoff).

---

## Show it live — step by step (~4 minutes)

**Before the audience arrives (5 min):** run `npm run pipeline` once and confirm `✅ END-TO-END COMPLETE`. Then open a second browser tab: **https://khushisarawagi.app.n8n.cloud** → **Workflows** (logged in).

### Beat 1 — Prove the workflows exist (30s)
In the n8n tab, show the three workflows, all with **Active** toggles green:
- RADAAR · Ingest → Detect → Act
- RADAAR · Offer Dispatch
- RADAAR · Outcome → Learning Loop

Say: *"These were not built by hand — the app deployed them through n8n's public API. One command, three workflows, activated."*

### Beat 2 — Open the workflow graph (60s)
Click **Ingest → Detect → Act**. Walk the canvas left to right:

> "A webhook receives the merchant snapshot. An IF node decides whether action is needed. If yes — an HTTP node calls **Sarvam** to write the WhatsApp nudge in Hinglish. A code node packages the memory fact. Another HTTP node writes it into **Cognee**, the merchant's knowledge graph. And the workflow answers the caller with the nudge the app displays."

Open the **Sarvam node** → show the JSON body (the Hinglish system prompt, max 160 chars, no markdown). Open the **Cognee node** → show the multipart `POST /api/v1/add` with the dataset name. This is the money shot: two sponsor platforms chained inside one n8n workflow.

### Beat 3 — Fire it live from the product (60s)
Switch to the RADAAR terminal → tap **Create evening offer**. Say: *"That click just POSTed to the merchant's own n8n instance."* The Hinglish nudge appears in the WhatsApp mock (~10–15s — narrate it: "Sarvam is writing it inside the workflow right now").

### Beat 4 — Green executions (45s)
Back to n8n → **Executions**. The run you just triggered is at the top, green. Open it:
- Click the **Sarvam node** → output shows the actual generated nudge.
- Click the **Cognee node** → output shows the memory write.
Say: *"This is a real execution on real infrastructure — the only mock in the entire product is the final WhatsApp send itself."*

### Beat 5 — The learning loop (45s)
In the terminal tap **measure outcome** → outcome banner + radar ripple. Back in n8n, the **Outcome → Learning Loop** execution appears. Open the **Verdict + Fact** node: verdict `worked`, the lesson, the ₹ delta. Say: *"Every measured outcome becomes a fact in the merchant's memory — the next recommendation is grounded in what actually worked. The loop closes inside n8n."*

---

## curl it yourself (for a skeptical judge)

```bash
# All three webhooks are plain HTTP — no UI needed:
curl -X POST https://khushisarawagi.app.n8n.cloud/webhook/radaar-ingest \
  -H "Content-Type: application/json" \
  -d '{"merchant":"Sharma General Store","date":"2026-09-19","needsAction":true,
       "health":{"score":87,"grade":"excellent"},"revenue":{"thisWeek":459820,"deltaPct":3.2},
       "topCard":{"signal":"Weekday evenings down 18.9%","why":"5-8 PM regulars visiting less",
                  "action":"Launch a 5-8 PM weekday offer","impact":"₹9.1K-₹13.6K weekly"}}'

# → response: {"status":"action-taken","nudgeHi":"…Sarvam's Hinglish nudge…","dataset":"radaar_merchant_memory", …}
```

Same pattern for `/webhook/radaar-offer` and `/webhook/radaar-outcome`. A judge can replay the whole pipeline with a terminal — nothing is hidden behind the UI.

---

## Likely judge questions & answers

- **"Why put this logic in n8n instead of in-app code?"** Because the action layer belongs to the *merchant*, not the vendor. A merchant (or Paytm) can open the canvas, edit the nudge prompt, add an SMS node, reroute delivery — without touching our code. n8n makes the automation *inspectable and merchant-editable*, which is the whole "business partner" thesis.
- **"Why webhooks rather than a queue?"** The flows are request/response (the UI needs the nudge + delivery preview back). `responseMode: lastNode` gives us synchronous answers; an n8n queue could replace this at scale with zero app changes beyond awaiting a callback.
- **"What did YOU build on n8n?"** The three workflow definitions as code, the idempotent upsert deployer (list → delete-by-name → create → activate), secret baking for n8n Cloud's `$env` restriction, and the webhook contracts all three sponsors' services hang off.
- **"Error handling?"** Timeouts on every HTTP node (45–60s), the app fails loudly on non-2xx webhook responses, and the pipeline re-deploys idempotently — a broken workflow is one `npm run pipeline` away from a known-good state.
- **"What would you add next on n8n?"** A scheduled trigger workflow (daily ingest without the app), a WhatsApp Business API node replacing the mock send, and per-merchant workflow templating via n8n's API.

---

## Where the code lives (for the technical judge)

| Piece | File |
|---|---|
| The three workflow definitions (nodes, connections, coordinates) | `lib/n8n-workflows.ts` |
| Typed n8n public-API client + idempotent upsert/activate | `lib/n8n.ts` |
| End-to-end deploy → fire-all-three → verify pipeline | `lib/pipeline.ts` (`npm run pipeline`) |
| App-side triggers (webhook calls from the product) | `app/api/offer/route.ts`, `app/api/outcome/route.ts` |
