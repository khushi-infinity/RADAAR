# RADAAR — Product Spec (distilled from the deck)

Source: `RADAAR.image-slides.pdf` (9 slides, extracted images in `docs/deck-slides/`).

---

## Slide-by-slide essence

| # | Title | Essence |
|---|-------|---------|
| 1 | RADAAR — AI Growth Radar for Paytm Merchants | "Your business is generating signals. RADAAR tells you what they mean." Pillars: Revenue · Opportunities · Customers · Retention |
| 2 | Merchants have data. They don't have answers. | Merchant questions: *Why did revenue change? What should I do tomorrow? Which opportunity is worth acting on?* Gap = **Data → Answers?** |
| 3 | The next generation of merchant analytics shouldn't show more data — it should surface the next best decision | Traditional: "Evening sales increased 18%." RADAAR: "Evening sales increased 18% **because** repeat customers are returning more often. Your 5–8 PM slot has the strongest growth potential. Launch a weekday offer to inactive customers." Loop: **Data → Understand → Act → Impact** |
| 4 | An AI business partner that watches your business for you | KPI strip: Revenue ₹48,200 (+8.2%) · Customers 1,284 (+5.4%) · Avg Transaction ₹347 (+9.1%) · Business Health 82/100. Cards answer: **What happened? Why? What next?** (Weekly sales spike driven by festive offers → targeted promotions outperformed baseline → optimize inventory for next week's demand) |
| 5 | From Signal to Action (the hero card flow) | **Signal:** "Weekday evening sales are 23% below weekend baseline." → **AI explanation:** "Customers who normally purchase 5–8 PM are visiting less on weekdays." → **Opportunity:** "Re-engage 186 inactive customers." → **Recommended action:** "Launch a 5–8 PM weekday offer." → **Estimated opportunity:** ₹4.5K–₹7K weekly revenue (AI estimate) + "Create offer" CTA |
| 6 | The AI Growth Loop | Transactions → Detect → (Understand) → Recommend → (Act) → back to Transactions. "Every action becomes new intelligence." |
| 7 | A merchant shouldn't need to read analytics — they should see the story | Visuals: Revenue Pulse (sparkline/area chart), Customer Heatmap, Market Potential |
| 8 | How It Works (architecture) | **Merchant → Data Layer (Paytm Data & Merchant Data) → Feature Layer (Trend Detection, Segmentation, Anomaly Detection, Opportunity Scoring) → AI Copilot → Action Layer → Outcome Data → Learning Loop** back into the engine |
| 9 | From payment processor to AI business partner | "Every merchant deserves an AI business partner. RADAAR turns every transaction into a signal, every signal into an insight, and every insight into an opportunity." |

---

## The 4-step visual loop (core product contract)

1. **What happened** — a plain-language signal (metric + delta + timeframe)
2. **Why** — causal explanation grounded in merchant's own data (segments, patterns)
3. **What to do** — one concrete next best action with a CTA
4. **Expected impact** — quantified ₹ estimate labeled "AI estimate"

## Required surfaces

- **KPI strip:** Revenue, Customers, Avg Transaction, Business Health (0–100 score)
- **Insight cards** implementing the 4-step loop with a primary CTA
- **Revenue Pulse** chart (weekly/daily)
- **Customer Heatmap** (day × hour activity)
- **Radar / Growth Radar** visualization of live opportunities (name-appropriate signature visual)
- **AI Copilot** chat (text + voice, Hindi & English)
- **Action → outcome** tracking so the loop visibly closes

## Non-negotiables for alignment

- Never show raw dashboards as the end product — always narrative + recommendation
- Every recommendation must cite its "because" (explainability)
- Every opportunity carries an expected ₹ impact estimate
- Actions produce outcomes that feed back into recommendations (learning loop)
- Merchant-facing copy must be simple enough for a non-analyst shopkeeper
