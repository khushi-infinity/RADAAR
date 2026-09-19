import type {
  Transaction, Customer, Trend, Anomaly, SegmentStats,
  BusinessSnapshot, BusinessHealth, InsightCard, Opportunity,
} from "./types";
import { detectTrends, detectAnomalies, computeSegments } from "./engines";

const DAY = 86_400_000;
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function computeHealth(
  txs: Transaction[], customers: Customer[], trends: Trend[], now: number
): BusinessHealth {
  const revTrend = trends.find((t) => t.id === "trend_weekly_revenue");
  const activeRate = customers.filter((c) => c.segment === "regular").length / customers.length;
  const atRisk = customers.filter((c) => c.segment === "at_risk" || c.segment === "inactive").length;

  // score: base 60 + trend bonus/penalty + loyalty bonus − risk penalty
  let score = 60;
  if (revTrend) score += Math.max(-20, Math.min(20, revTrend.deltaPct));
  score += activeRate * 40; // up to +40
  score -= (atRisk / customers.length) * 30;
  score = Math.max(5, Math.min(99, Math.round(score)));

  const repeatRate = customers.filter((c) => c.visitCount >= 2).length / customers.length;
  return {
    score,
    revenueTrendPct: revTrend?.deltaPct ?? 0,
    uniqueCustomers: customers.filter((c) => c.lastSeen > now - 30 * DAY).length,
    repeatRate: Math.round(repeatRate * 100),
    activeRiskCount: atRisk,
    grade: score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 50 ? "fair" : "needs-attention",
  };
}

function buildOpportunities(
  txs: Transaction[], customers: Customer[], trends: Trend[], now: number
): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const eveningTrend = trends.find((t) => t.id === "trend_weekday_evening");

  // 1. Reactivate inactive customers (deck hero: "Re-engage 186 inactive customers")
  const inactive = customers.filter((c) => c.segment === "inactive");
  if (inactive.length > 0) {
    const avgTicket = inactive.reduce((s, c) => s + c.totalSpend / Math.max(1, c.visitCount), 0) / inactive.length;
    const convLow = inactive.length * avgTicket * 0.06;
    const convHigh = inactive.length * avgTicket * 0.12;
    opportunities.push({
      id: "opp_reactivate",
      type: "reactivate_inactive",
      title: `Re-engage ${inactive.length} inactive customers`,
      why: `These customers averaged ${inr(avgTicket)} per visit before going quiet. A win-back nudge targets ${inactive.length} people whose own history suggests they would return — modeled at a conservative 6–12% return rate.`,
      action: "Send a ₹50-off win-back nudge on WhatsApp",
      actionCta: "Create win-back offer",
      targetSize: inactive.length,
      impactLow: convLow,
      impactHigh: convHigh,
      impactPeriod: "monthly",
      confidence: 0.82,
    });
    if (eveningTrend && eveningTrend.direction === "down") {
      // Impact computed from the merchant's OWN data: per-slot revenue gap ×
      // weekday-evening slots, recovered at a modeled 40–60% — no baked constants.
      const eveningRegulars = customers.filter(
        (c) => c.isWeekdayEveningRegular && c.segment !== "inactive",
      ).length;
      const slotsPerWeek = 4 * 5; // 4 evening hours × 5 weekdays = 20 hour-slots
      const lostRevenue = Math.max(0, eveningTrend.evidence.baseline - eveningTrend.evidence.current) * slotsPerWeek;
      opportunities.push({
        id: "opp_weekday_evening",
        type: "weekday_evening_offer",
        title: "Launch a 5–8 PM weekday offer",
        why: `Your 5–8 PM regulars (${eveningRegulars} customers) are visiting less on weekdays — evening revenue is running ${Math.abs(eveningTrend.deltaPct)}% below your own pre-taper baseline. An evening offer targets exactly the slot that slipped.`,
        action: "Create a 5–8 PM weekday evening offer (e.g. ₹30 off above ₹200)",
        actionCta: "Create evening offer",
        targetSize: eveningRegulars,
        impactLow: Math.round(lostRevenue * 0.4),
        impactHigh: Math.round(lostRevenue * 0.6),
        impactPeriod: "weekly",
        confidence: 0.74,
        relatedTrendId: eveningTrend.id,
      });
    }
  }

  // 2. Retention: at-risk regulars
  const atRisk = customers.filter((c) => c.segment === "at_risk");
  if (atRisk.length >= 5) {
    const avgTicket = atRisk.reduce((s, c) => s + c.totalSpend / Math.max(1, c.visitCount), 0) / atRisk.length;
    opportunities.push({
      id: "opp_retention",
      type: "retention_offer",
      title: `Hold on to ${atRisk.length} slipping regulars`,
      why: `They used to visit weekly. Re-engaging someone who already knows your store costs a fraction of finding a new customer — a personal check-in now prevents likely churn.`,
      action: "Send a personal “come back soon” message with ₹20 off next visit",
      actionCta: "Send retention nudges",
      targetSize: atRisk.length,
      impactLow: atRisk.length * avgTicket * 0.15,
      impactHigh: atRisk.length * avgTicket * 0.3,
      impactPeriod: "monthly",
      confidence: 0.68,
    });
  }

  // 3. Upsell bundle for healthy repeat buyers (deck: "optimize inventory / festive bundling")
  const regulars = customers.filter((c) => c.segment === "regular");
  if (regulars.length >= 20) {
    const avgTicket = regulars.reduce((s, c) => s + c.totalSpend / Math.max(1, c.visitCount), 0) / regulars.length;
    opportunities.push({
      id: "opp_upsell",
      type: "upsell_bundle",
      title: `Bundle offer for ${regulars.length} loyal regulars`,
      why: `Regulars spend ${inr(avgTicket)} on average. A curated combo at ${inr(avgTicket * 1.3)} lifts basket size without new customers.`,
      action: "Feature a combo bundle on the counter QR stand",
      actionCta: "Create bundle",
      targetSize: regulars.length,
      impactLow: regulars.length * avgTicket * 0.05,
      impactHigh: regulars.length * avgTicket * 0.12,
      impactPeriod: "weekly",
      confidence: 0.61,
    });
  }

  // rank by expected weekly impact mid-point (normalize across periods)
  const weekly = (o: Opportunity) => {
    const mid = (o.impactLow + o.impactHigh) / 2;
    const factor = o.impactPeriod === "monthly" ? 1 / 4.3 : o.impactPeriod === "daily" ? 7 : 1;
    return mid * factor;
  };
  opportunities.sort((a, b) => weekly(b) - weekly(a));
  return opportunities;
}

export function buildSnapshot(
  transactions: Transaction[], allCustomers: Customer[], merchantName: string, now: number
): BusinessSnapshot {
  const customers = allCustomers.filter((c) => c.visitCount > 0); // active universe
  const trends = detectTrends(transactions, customers, now);
  const anomalies = detectAnomalies(transactions, now);
  const segments = computeSegments(customers, now);
  const health = computeHealth(transactions, customers, trends, now);
  const opportunities = buildOpportunities(transactions, customers, trends, now);

  const wk = (from: number, to: number) =>
    transactions.filter((t) => t.ts > now - to * DAY && t.ts <= now - from * DAY && t.amount < 10_000); // operational view (whales excluded)
  const thisWeek = wk(0, 7);
  const lastWeek = wk(7, 14);
  const revThis = thisWeek.reduce((s, t) => s + t.amount, 0);
  const revLast = lastWeek.reduce((s, t) => s + t.amount, 0);
  const uniqueThis = new Set(thisWeek.map((t) => t.customerId)).size;
  const uniqueLast = new Set(lastWeek.map((t) => t.customerId)).size;

  const downTrendIds = new Set(trends.filter((t) => t.direction === "down").map((t) => t.id));
  const cards: InsightCard[] = opportunities.map((o) => ({
    id: `card_${o.id}`,
    // Severity from DATA semantics: an insight tied to an active DOWN trend is
    // a revenue leak (critical, red); high-confidence growth plays are
    // opportunities (cyan); the rest are watch (amber).
    severity:
      (o.relatedTrendId && downTrendIds.has(o.relatedTrendId)) || o.type === "reactivate_inactive"
        ? "critical"
        : o.confidence >= 0.6
        ? "opportunity"
        : "watch",
    signal:
      o.id === "opp_weekday_evening"
        ? `Weekday evening sales are ${Math.abs(trends.find((t) => t.id === "trend_weekday_evening")?.deltaPct ?? 0)}% below baseline`
        : o.id === "opp_reactivate"
        ? `${o.targetSize} customers have gone quiet`
        : o.id === "opp_retention"
        ? `${o.targetSize} regulars haven't visited in 2+ weeks`
        : `Your loyal regulars visit often but spend the same each time`,
    why: o.why,
    opportunity: o.title,
    action: o.action,
    impact: `${inr(o.impactLow)}–${inr(o.impactHigh)} ${o.impactPeriod} (AI estimate)`,
    ctaLabel: o.actionCta,
    linkedOpportunity: o,
  }));

  // Paytm-relevant: how this merchant actually gets paid (computed from data)
  const methodAgg = new Map<Transaction["method"], { count: number; amount: number }>();
  for (const t of transactions.filter((x) => x.ts > now - 30 * DAY)) {
    const agg = methodAgg.get(t.method) ?? { count: 0, amount: 0 };
    agg.count += 1;
    agg.amount += t.amount;
    methodAgg.set(t.method, agg);
  }
  const paymentMix = [...methodAgg.entries()]
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.amount - a.amount);

  return {
    merchantName,
    generatedAt: now,
    revenue: {
      total: transactions.reduce((s, t) => s + t.amount, 0),
      deltaPct: revLast ? Math.round(((revThis - revLast) / revLast) * 1000) / 10 : 0,
      thisWeek: revThis,
      lastWeek: revLast,
    },
    customers: {
      total: customers.length,
      deltaPct: uniqueLast ? Math.round(((uniqueThis - uniqueLast) / uniqueLast) * 1000) / 10 : 0,
      newThisWeek: customers.filter((c) => c.firstSeen > now - 7 * DAY).length,
    },
    avgTicket: {
      value: Math.round(revThis / Math.max(1, thisWeek.length)),
      deltaPct:
        trends.find((t) => t.id === "trend_avg_ticket")?.deltaPct ?? 0,
    },
    health,
    trends,
    anomalies,
    segments,
    cards,
    opportunities,
    paymentMix,
  };
}
