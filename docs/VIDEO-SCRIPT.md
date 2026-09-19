# RADAAR — Video Demo Script (3:00)

> Purpose: the **submission / backup video**. This is the cut judges watch when you're not in the room — it must land the full loop (What → Why → Do → Impact → Learning), name all three sponsor platforms at the exact moment each does work, and stay under 3:10.
>
> The live-stage script is `DEMO-SCRIPT.md`; the stage pitch + Q&A crib is `JUDGE-PITCH.md`.

---

## Voiceover budget

3 minutes at a calm ~145 wpm ≈ **430 words total**. The script below uses ~250 — the slack is deliberate: it absorbs cutaways, the Hindi voice moment, and your pacing. **Do not add sentences; cut them if anything overruns.**

---

## Pre-flight (before hitting record)

- [ ] `npm run pipeline` completed fresh (`✅ END-TO-END COMPLETE`) — so the memory panel and n8n executions are populated
- [ ] `npm run dev` on **http://localhost:3000**, Chrome, **⌘⇧F presentation mode**, zoom **110%**, bookmarks bar hidden
- [ ] Radar theme = **Radar** (default) for the main cut; record the Money-theme shot separately if you want it as b-roll
- [ ] Terminal width ≥ 1280px so the 3-column terminal grid is intact (below `lg` it stacks)
- [ ] Record at **1080p**, and do one full **dry read** with a stopwatch — trim before recording the real take

---

## Shot list

| # | Time | On screen | Action | Voiceover |
|---|------|-----------|--------|-----------|
| 1 | 0:00–0:20 | Radar, full frame — sweep + pinging blips | Let it breathe 3s before speaking; slow zoom-in if your editor supports it | *"This is a real Indian store — ninety days of transactions, thirteen thousand payments. Every dashboard shows the numbers. RADAAR shows what they mean."* |
| 2 | 0:20–0:45 | Full terminal | Pan/scroll across: status bar → left KPI rail → right memory rail | *"Meet the Operator Terminal. Business health, revenue, customers, average ticket — live. On the left, every trend and anomaly. On the right, RADAAR's memory — every fact it has ever learned about this store."* |
| 3 | 0:45–1:20 | Evening-dip row highlighted in the action queue; hover the ₹ impact | Point the cursor at the −18.9% number, then the "Why" copy, then the ₹ range | *"RADAAR found a leak: weekday evening sales, down eighteen-point-nine percent versus this store's own baseline. It doesn't stop at the number. It explains why — the five-to-eight PM regulars stopped coming — and prices the fix from this store's own data: a weekday evening offer worth nine to thirteen thousand rupees a week."* |
| 4 | 1:20–1:55 | Click **Create evening offer** → nudge appears → **cut to n8n executions tab** for ~6s → cut back | Text overlay while in n8n: **"the merchant's own n8n · live execution"** | *"One tap. The merchant's own n8n workflow fires — it calls Sarvam, India's Indic LLM, which writes the WhatsApp nudge in Hinglish… dispatches to the at-risk regulars… and files the action into Cognee, the merchant's memory graph. This is the actual execution — live infrastructure, nothing mocked."* |
| 5 | 1:55–2:25 | Click **measure outcome** → radar ripple + verdict banner → memory panel gains a fact | Hold 2s on the new memory fact so it's readable | *"A week later, the outcome flows back. Revenue up six percent. The radar ripples green — and the verdict becomes a new memory. The next recommendation is already grounded in what actually worked for this store. That loop compounds. That's the moat."* |
| 6 | 2:25–2:50 | Copilot: click mic → ask in Hindi → spoken answer + grounded badge | **1.5s silent beat** before asking (the voice moment needs air) | *[spoken live into the recording, in Hindi]:* "Is hafte sabse zyada bike kis din hui?" — then VO: *"The answer isn't from a generic chatbot. It's grounded in this merchant's own knowledge graph — every number traceable."* |
| 7 | 2:50–3:05 | Radar full frame again | Let the sweep run under the closing line | *"Paytm gave three crore merchants digital payments. RADAAR gives them a business partner. Every transaction a signal. Every signal an insight. Every insight an opportunity."* |

**Text overlays** (small, bottom-left, consistent style):

| When | Overlay |
|---|---|
| Shot 1 (0:05) | `synthetic Paytm-style data · computed live · nothing hardcoded` |
| Shot 3 (0:50) | `every impact range computed from this store's own data` |
| Shot 4 (1:25) | `Sarvam · writes the nudge` → `n8n · dispatches` → `Cognee · remembers` (stagger with the VO) |
| Shot 5 (2:00) | `the learning loop · every action becomes new intelligence` |

---

## B-roll bank (record once, cut in anywhere)

1. Radar closeup: sweep + a single blip ping (10s)
2. Outcome ripple in slow view (5s)
3. Memory panel: a fact appending after an offer (8s)
4. n8n: executions list scrolling, one run opened node-by-node (15s)
5. Theme switcher flick: Radar → Money → Heritage (6s)
6. `npm run pipeline` final lines — the `✅ END-TO-END COMPLETE` block (6s; proof of one-command reproducibility)

## Recording tips

- Record the **screen first, VO after** (or VO live if your read is steady) — never let narration force you to click faster than the app actually runs; the offer round-trip takes ~15s and that *wait is the proof* it's real.
- Keep the mic 15–20cm away, record in a soft-furnished room; normalize loudness in the editor.
- If a shot needs the network (n8n tab, Hindi voice) and it hiccups: **stop, re-run that shot, splice** — never ship a spinner.
- Export 1080p H.264, ~8 Mbps, audio 192 kbps AAC. Filename: `RADAAR-demo.mp4`.

## One-take checklist

Shot 1 → 2 → 3 → 4 → 5 → 6 → 7 in order, stopwatch beside the keyboard. If any shot exceeds its slot by >10s, cut words from it — never from Shot 5 (the learning loop is the differentiator) or Shot 7 (the closing line is memorized, verbatim).
