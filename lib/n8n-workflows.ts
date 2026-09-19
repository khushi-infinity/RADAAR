/**
 * RADAAR n8n workflow definitions — the deck's Action Layer + Learning Loop,
 * living inside the merchant's own n8n instance (visible to judges).
 *
 *  1. radaar-ingest-detect  — spine POSTs a snapshot; n8n decides if action is
 *     needed, calls Sarvam for a Hinglish nudge, and writes the insight into
 *     Cognee memory (multipart add — same contract verified in PROGRESS.md).
 *  2. radaar-offer-dispatch — merchant accepts an action; n8n simulates the
 *     WhatsApp delivery (named mock recipients) and records the dispatch fact.
 *  3. radaar-outcome-loop   — measured revenue delta flows back; n8n computes
 *     the verdict and writes the learning-loop fact into Cognee.
 *
 * Secrets are referenced as {{ $env.* }} expressions. The deploy script can
 * optionally bake literal values (fallback if the tenant blocks $env).
 */

import type { N8nNode, N8nWorkflowDef } from "./n8n";

const pos = (x: number, y = 300): [number, number] => [x, y];

function webhookNode(name: string, path: string, webhookId: string, x: number): N8nNode {
  return {
    parameters: { httpMethod: "POST", path, responseMode: "lastNode", options: {} },
    name,
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: pos(x),
    webhookId,
  };
}

function codeNode(name: string, jsCode: string, x: number): N8nNode {
  return {
    parameters: { jsCode },
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: pos(x),
  };
}

function cogneeAddNode(name: string, x: number): N8nNode {
  return {
    parameters: {
      method: "POST",
      url: "={{ $env.COGNEE_BASE_URL }}/api/v1/add",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "X-Api-Key", value: "={{ $env.COGNEE_API_KEY }}" }],
      },
      sendBody: true,
      contentType: "multipart-form-data",
      bodyParameters: {
        parameters: [
          { parameterType: "formBinaryData", name: "data", inputDataFieldName: "factFile" },
          { parameterType: "formData", name: "datasetName", value: "={{ $env.COGNEE_DATASET }}" },
        ],
      },
      options: { timeout: 60000 },
    },
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: pos(x),
  };
}

function setNode(
  name: string,
  assignments: Array<{ name: string; value: string }>,
  x: number,
  y = 300,
): N8nNode {
  return {
    parameters: {
      assignments: {
        assignments: assignments.map((a, i) => ({
          id: `${name}-${i}`,
          name: a.name,
          value: a.value,
          type: "string",
        })),
      },
      options: {},
    },
    name,
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: pos(x, y),
  };
}

const conn = (from: string, to: string) => ({
  node: to,
  type: "main" as const,
  index: 0,
});

// ─── Workflow 1: ingest + detect + act ──────────────────────────────────────

export function ingestDetectWorkflow(): N8nWorkflowDef {
  const nodes: N8nNode[] = [
    webhookNode("Ingest Webhook", "radaar-ingest", "a1b2c3d4-0001-4a61-9d0a-111111111111", 0),
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
          conditions: [
            {
              id: "needs-action",
              leftValue: "={{ $json.body.needsAction }}",
              rightValue: "",
              operator: { type: "boolean", operation: "true", singleValue: true },
            },
          ],
          combinator: "and",
        },
        options: {},
      },
      name: "Action needed?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: pos(220),
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.sarvam.ai/v1/chat/completions",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "api-subscription-key", value: "={{ $env.SARVAM_API_KEY }}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody:
          '={{ JSON.stringify({ model: "sarvam-105b", temperature: 0.4, max_tokens: 500, reasoning_effort: null, messages: [ { role: "system", content: "You write crisp WhatsApp marketing nudges for small Indian shops." }, { role: "user", content: "Write ONE short WhatsApp message in friendly Hinglish (Hindi in Devanagari, common English words like offer and evening stay in English). Situation: " + $json.body.topCard.signal + " Because: " + $json.body.topCard.why + " The offer: " + $json.body.topCard.action + " Expected benefit: " + $json.body.topCard.impact + " Rules: no customer name, max 160 characters, no quotes or markdown." } ] }) }}',
        options: { timeout: 45000 },
      },
      name: "Sarvam Nudge (Hinglish)",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: pos(440),
    },
    codeNode(
      "Build Memory Fact",
      [
        "const hook = $('Ingest Webhook').first().json;",
        "const body = hook.body || {};",
        "const s = $input.first().json;",
        "const nudge = String(s.choices?.[0]?.message?.content || s.choices?.[0]?.message?.reasoning_content || '').trim().replace(/^[\"']+|[\"']+$/g, '').split('\\n')[0];",
        "const card = body.topCard || {};",
        "const fact = 'INSIGHT ' + body.date + ': For merchant ' + body.merchant",
        "  + ', business health ' + body.health?.score + '/100 (' + body.health?.grade + ')'",
        "  + ', weekly revenue ' + body.revenue?.thisWeek + ' rupees (' + body.revenue?.deltaPct + '% vs previous week).'",
        "  + ' Signal: ' + card.signal",
        "  + ' Why: ' + card.why",
        "  + ' Recommended action: ' + card.action",
        "  + ' Expected impact: ' + card.impact",
        "  + ' Hinglish nudge dispatched by RADAAR n8n workflow: \"' + nudge + '\"';",
        "return [{ json: { nudge, merchant: body.merchant }, binary: { factFile: { data: Buffer.from(fact, 'utf8').toString('base64'), mimeType: 'text/plain', fileName: 'radaar_fact.txt' } } }];",
      ].join("\n"),
      660,
    ),
    cogneeAddNode("Write to Cognee", 880),
    setNode(
      "Respond",
      [
        { name: "status", value: "action-taken" },
        { name: "merchant", value: "={{ $json.json?.merchant || $('Build Memory Fact').first().json.merchant }}" },
        { name: "nudgeHi", value: "={{ $('Build Memory Fact').first().json.nudge }}" },
        { name: "cogneeAdd", value: "={{ JSON.stringify($json).slice(0, 240) }}" },
        { name: "dataset", value: "={{ $env.COGNEE_DATASET }}" },
      ],
      1100,
    ),
    setNode(
      "No Action Needed",
      [
        { name: "status", value: "monitored-no-action" },
        { name: "merchant", value: "={{ $json.body.merchant }}" },
      ],
      440,
      480,
    ),
  ];

  return {
    name: "RADAAR · Ingest → Detect → Act",
    nodes,
    settings: { executionOrder: "v1" },
    connections: {
      "Ingest Webhook": { main: [[conn("Ingest Webhook", "Action needed?")]] },
      "Action needed?": {
        main: [
          [conn("Action needed?", "Sarvam Nudge (Hinglish)")],
          [conn("Action needed?", "No Action Needed")],
        ],
      },
      "Sarvam Nudge (Hinglish)": { main: [[conn("Sarvam Nudge (Hinglish)", "Build Memory Fact")]] },
      "Build Memory Fact": { main: [[conn("Build Memory Fact", "Write to Cognee")]] },
      "Write to Cognee": { main: [[conn("Write to Cognee", "Respond")]] },
    },
  };
}

// ─── Workflow 2: offer dispatch (mock WhatsApp) ─────────────────────────────

export function offerDispatchWorkflow(): N8nWorkflowDef {
  const nodes: N8nNode[] = [
    webhookNode("Offer Webhook", "radaar-offer", "c2f6d1eb-2002-4b22-8e1b-3afeb1002002", 0),
    codeNode(
      "Prepare Delivery + Fact",
      [
        "const body = $input.first().json.body || {};",
        "const names = ['Aarav','Priya','Rohan','Sneha','Vikram','Ananya','Karan','Meera','Rahul','Ishita','Dev','Pooja'];",
        "const size = Math.max(1, Number(body.audienceSize) || 1);",
        "const sample = [];",
        "for (let i = 0; i < Math.min(12, size); i++) {",
        "  sample.push({ name: names[i % names.length], phone: '+91 98' + String(100000000 + body.offerId.length * 7919 + i * 104729).slice(0, 8), channel: 'whatsapp_mock', message: body.messageHi });",
        "}",
        "const delivery = { offerId: body.offerId, merchant: body.merchant, audience: body.audience, audienceSize: size, delivered: sample.length, sample, messageHi: body.messageHi, messageEn: body.messageEn };",
        "const fact = 'OFFER DISPATCHED ' + body.date + ': ' + body.merchant + ' ran offer ' + body.offerId",
        "  + ' (' + body.action + ') targeting ' + size + ' customers in the ' + body.audience + ' segment'",
        "  + ' to address: ' + body.signal + '. Nudge sent (Hinglish): \"' + body.messageHi + '\"';",
        "return [{ json: delivery, binary: { factFile: { data: Buffer.from(fact, 'utf8').toString('base64'), mimeType: 'text/plain', fileName: 'radaar_fact.txt' } } }];",
      ].join("\n"),
      220,
    ),
    cogneeAddNode("Write to Cognee", 440),
    setNode(
      "Respond",
      [
        { name: "status", value: "={{ 'dispatched (' + $('Prepare Delivery + Fact').first().json.delivered + ' shown of ' + $('Prepare Delivery + Fact').first().json.audienceSize + ')' }}" },
        { name: "offerId", value: "={{ $('Prepare Delivery + Fact').first().json.offerId }}" },
        { name: "deliveryPreview", value: "={{ JSON.stringify($('Prepare Delivery + Fact').first().json.sample.slice(0, 3)) }}" },
        { name: "messageHi", value: "={{ $('Prepare Delivery + Fact').first().json.messageHi }}" },
        { name: "cogneeAdd", value: "={{ JSON.stringify($json).slice(0, 240) }}" },
      ],
      660,
    ),
  ];

  return {
    name: "RADAAR · Offer Dispatch",
    nodes,
    settings: { executionOrder: "v1" },
    connections: {
      "Offer Webhook": { main: [[conn("Offer Webhook", "Prepare Delivery + Fact")]] },
      "Prepare Delivery + Fact": { main: [[conn("Prepare Delivery + Fact", "Write to Cognee")]] },
      "Write to Cognee": { main: [[conn("Write to Cognee", "Respond")]] },
    },
  };
}

// ─── Workflow 3: outcome → learning loop ────────────────────────────────────

export function outcomeLoopWorkflow(): N8nWorkflowDef {
  const nodes: N8nNode[] = [
    webhookNode("Outcome Webhook", "radaar-outcome", "d3a7e2fc-3003-4c33-9f2c-4bafc2003003", 0),
    codeNode(
      "Verdict + Fact",
      [
        "const body = $input.first().json.body || {};",
        "const uplift = Number(body.upliftPct) || 0;",
        "const verdict = uplift > 1 ? 'worked' : (uplift < -1 ? 'underperformed' : 'neutral');",
        "const lesson = verdict === 'worked'",
        "  ? 'The offer worked; recommend similar actions again for this merchant.'",
        "  : (verdict === 'underperformed' ? 'The offer underperformed; deprioritize similar actions and try a different angle.' : 'The offer was neutral; test a stronger incentive next time.');",
        "const fact = 'OFFER OUTCOME ' + body.date + ': Offer ' + body.offerId + ' (' + body.action + ') at ' + body.merchant",
        "  + ' reached ' + body.audienceSize + ' customers and produced a revenue change of ' + body.revenueDelta",
        "  + ' rupees (' + uplift + '%) over the ' + body.window + '. Verdict: ' + verdict + '. ' + lesson;",
        "return [{ json: { verdict, lesson, offerId: body.offerId }, binary: { factFile: { data: Buffer.from(fact, 'utf8').toString('base64'), mimeType: 'text/plain', fileName: 'radaar_fact.txt' } } }];",
      ].join("\n"),
      220,
    ),
    cogneeAddNode("Write to Cognee", 440),
    setNode(
      "Respond",
      [
        { name: "status", value: "learning-recorded" },
        { name: "offerId", value: "={{ $('Verdict + Fact').first().json.offerId }}" },
        { name: "verdict", value: "={{ $('Verdict + Fact').first().json.verdict }}" },
        { name: "lesson", value: "={{ $('Verdict + Fact').first().json.lesson }}" },
        { name: "cogneeAdd", value: "={{ JSON.stringify($json).slice(0, 240) }}" },
      ],
      660,
    ),
  ];

  return {
    name: "RADAAR · Outcome → Learning Loop",
    nodes,
    settings: { executionOrder: "v1" },
    connections: {
      "Outcome Webhook": { main: [[conn("Outcome Webhook", "Verdict + Fact")]] },
      "Verdict + Fact": { main: [[conn("Verdict + Fact", "Write to Cognee")]] },
      "Write to Cognee": { main: [[conn("Write to Cognee", "Respond")]] },
    },
  };
}

export function allWorkflows(): N8nWorkflowDef[] {
  return [ingestDetectWorkflow(), offerDispatchWorkflow(), outcomeLoopWorkflow()];
}

// ─── Fallback: bake literal env values (if the tenant blocks $env) ──────────

function bakeNode(node: N8nNode, values: Record<string, string>): void {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const baked = v.replace(/\{\{\s*\$env\.([A-Z0-9_]+)\s*\}\}/g, (_m, name) => values[name] ?? _m);
      // "={{ $env.X }}" becomes "=literal" after baking — drop the expression marker
      if (baked.startsWith("=") && !baked.includes("{{")) return baked.slice(1);
      return baked;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  node.parameters = walk(node.parameters) as Record<string, unknown>;
}

/** Replace {{ $env.* }} with literal values (used with `--bake`). */
export function bakeEnv(def: N8nWorkflowDef, values: Record<string, string>): N8nWorkflowDef {
  for (const n of def.nodes) bakeNode(n, values);
  return def;
}
