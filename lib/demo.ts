/**
 * RADAAR intelligence spine — live demo.
 * Generates synthetic Paytm-style data, runs feature engines,
 * and prints the full merchant snapshot (KPIs, trends, anomalies,
 * segments, insight cards).
 *
 * Run with:  npx tsx lib/demo.ts
 */
import { generateMerchantData } from "./generator";
import { buildSnapshot } from "./insights";

const t0 = Date.now();

const data = generateMerchantData({ days: 90, seed: 42 });
const snap = buildSnapshot(data.transactions, data.customers, data.merchantName, data.now);

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const bar = "─".repeat(64);

console.log("\n📡 RADAAR — " + snap.merchantName);
console.log(bar);
console.log(`Business Health   ${snap.health.score}/100 (${snap.health.grade})`);
console.log(`Revenue (wk)      ${inr(snap.revenue.thisWeek)}  (${snap.revenue.deltaPct >= 0 ? "+" : ""}${snap.revenue.deltaPct}% vs last week)`);
console.log(`Customers         ${snap.customers.total} total · ${snap.customers.newThisWeek} new this week (${snap.customers.deltaPct >= 0 ? "+" : ""}${snap.customers.deltaPct}%)`);
console.log(`Avg Ticket        ${inr(snap.avgTicket.value)} (${snap.avgTicket.deltaPct >= 0 ? "+" : ""}${snap.avgTicket.deltaPct}%)`);

console.log("\n📈 Trends");
for (const t of snap.trends) {
  console.log(`  ${t.direction === "up" ? "▲" : "▼"} ${t.window}: ${t.deltaPct > 0 ? "+" : ""}${t.deltaPct}% vs ${t.baselineLabel}`);
}

console.log("\n⚠️  Anomalies");
if (snap.anomalies.length === 0) console.log("  none detected");
for (const a of snap.anomalies) {
  console.log(`  • ${a.description}`);
}

console.log("\n👥 Segments");
for (const s of snap.segments) {
  console.log(`  ${s.segment.padEnd(9)} ${String(s.count).padStart(4)}  customers · avg ${inr(s.avgTicket)}`);
}

console.log("\n🧠 Insight cards (What happened → Why → What next → Impact)");
console.log(bar);
for (const c of snap.cards) {
  console.log(`\n【${c.severity.toUpperCase()}】 ${c.signal}`);
  console.log(`  Why?         ${c.why}`);
  console.log(`  Opportunity: ${c.opportunity}`);
  console.log(`  Action:      ${c.action}`);
  console.log(`  Impact:      ${c.impact}`);
  console.log(`  [${c.ctaLabel}]`);
}
console.log("\n" + bar);
console.log(`Total pipeline runtime: ${Date.now() - t0}ms`);
