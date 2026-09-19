import type { Transaction, Customer, Trend, Anomaly, SegmentStats } from "./types";

const DAY = 86_400_000;

// ─── Trend detection ────────────────────────────────────────────────────────

export interface HourCell {
  date: string; // YYYY-MM-DD — one cell per calendar day, so averages are
  // per-occurrence and comparable across windows of different lengths
  dow: number; // 0=Sun
  hour: number;
  revenue: number;
  count: number;
}

export function buildHourCells(txs: Transaction[], days: number, now: number): HourCell[] {
  const cutoff = now - days * DAY;
  const map = new Map<string, HourCell>();
  for (const t of txs) {
    if (t.ts < cutoff) continue;
    const d = new Date(t.ts);
    const dow = d.getUTCDay();
    const hour = d.getUTCHours();
    const date = d.toISOString().slice(0, 10);
    const key = `${date}-${hour}`;
    const cell = map.get(key) ?? { date, dow, hour, revenue: 0, count: 0 };
    cell.revenue += t.amount;
    cell.count += 1;
    map.set(key, cell);
  }
  return [...map.values()];
}

function avgRevenue(cells: HourCell[], filter: (c: HourCell) => boolean): number {
  const matched = cells.filter(filter);
  if (matched.length === 0) return 0;
  return matched.reduce((s, c) => s + c.revenue, 0) / matched.length;
}

export function detectTrends(txs: Transaction[], customers: Customer[], now: number): Trend[] {
  // Operational view: exclude one-off whale transactions (≥ ₹10K) from trend
  // math — they're surfaced separately by the anomaly detector.
  const ops = txs.filter((t) => t.amount < 10_000);
  const recent = buildHourCells(ops.filter((t) => t.ts > now - 21 * DAY), 21, now);
  // baseline: 25–63 days ago, starts at 25 to stay clear of the festive window
  const baseline = buildHourCells(ops.filter((t) => t.ts <= now - 25 * DAY && t.ts > now - 63 * DAY), 38, now);
  const trends: Trend[] = [];

  // Hero scenario: weekday evenings (17–20) vs weekend evenings
  const recentWkEv = avgRevenue(recent, (c) => c.dow >= 1 && c.dow <= 5 && c.hour >= 17 && c.hour <= 20);
  const baseWkEv = avgRevenue(baseline, (c) => c.dow >= 1 && c.dow <= 5 && c.hour >= 17 && c.hour <= 20);
  if (baseWkEv > 0) {
    const deltaPct = ((recentWkEv - baseWkEv) / baseWkEv) * 100;
    if (Math.abs(deltaPct) >= 8) {
      trends.push({
        id: "trend_weekday_evening",
        metric: "revenue",
        window: "weekday evenings (5–8 PM)",
        direction: deltaPct < 0 ? "down" : "up",
        deltaPct: Math.round(deltaPct * 10) / 10,
        baselineLabel: "pre-taper weekday baseline (weeks 3–9)",
        evidence: { current: Math.round(recentWkEv), baseline: Math.round(baseWkEv), sampleSize: recent.filter((c) => c.dow >= 1 && c.dow <= 5 && c.hour >= 17 && c.hour <= 20).length },
      });
    }
  }

  // Overall revenue trend: last 7 days vs previous 7 (operational view)
  const wk = (from: number, to: number) => ops.filter((t) => t.ts > now - to * DAY && t.ts <= now - from * DAY);
  const thisWeek = wk(0, 7).reduce((s, t) => s + t.amount, 0);
  const lastWeek = wk(7, 14).reduce((s, t) => s + t.amount, 0);
  if (lastWeek > 0) {
    const deltaPct = ((thisWeek - lastWeek) / lastWeek) * 100;
    trends.push({
      id: "trend_weekly_revenue",
      metric: "revenue",
      window: "this week vs last week",
      direction: deltaPct >= 0 ? "up" : "down",
      deltaPct: Math.round(deltaPct * 10) / 10,
      baselineLabel: "previous 7 days",
      evidence: { current: thisWeek, baseline: lastWeek, sampleSize: wk(0, 7).length },
    });
  }

  // Avg ticket trend
  const tThis = wk(0, 7);
  const tLast = wk(7, 14);
  if (tThis.length > 0 && tLast.length > 0) {
    const aThis = thisWeek / tThis.length;
    const aLast = lastWeek / tLast.length;
    const deltaPct = ((aThis - aLast) / aLast) * 100;
    trends.push({
      id: "trend_avg_ticket",
      metric: "avg_ticket",
      window: "average transaction value",
      direction: deltaPct >= 0 ? "up" : "down",
      deltaPct: Math.round(deltaPct * 10) / 10,
      baselineLabel: "previous 7 days",
      evidence: { current: Math.round(aThis), baseline: Math.round(aLast), sampleSize: tThis.length },
    });
  }

  return trends;
}

// ─── Anomaly detection ──────────────────────────────────────────────────────

export function detectAnomalies(txs: Transaction[], now: number): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const amounts = txs.map((t) => t.amount);
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const std = Math.sqrt(amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length);

  // 1. Abnormally large transactions (z > 10 → true whales; smaller clusters
  //    are the burst detector's job)
  for (const t of txs) {
    const z = (t.amount - mean) / std;
    if (z > 10 && t.ts > now - 10 * DAY) {
      anomalies.push({
        id: `anom_large_${t.id}`,
        ts: t.ts,
        kind: "large_transaction",
        description: `Unusually large transaction of ₹${t.amount.toLocaleString("en-IN")} (≈${Math.round(z)}σ above normal)`,
        amount: t.amount,
        zScore: Math.round(z * 10) / 10,
      });
    }
  }

  // 2. Refund-like burst: ≥8 similarly-sized transactions within 2 hours
  //    (bucket by rounded amount so ordinary mixed traffic doesn't mask it)
  const recent = txs.filter((t) => t.ts > now - 10 * DAY);
  const buckets = new Map<number, Transaction[]>();
  for (const t of recent) {
    const key = Math.round(t.amount / 500);
    const arr = buckets.get(key) ?? [];
    arr.push(t);
    buckets.set(key, arr);
  }
  for (const group of buckets.values()) {
    if (group.length < 8) continue;
    // ordinary small tickets don't count as "similar bursts" — real duplicate
    // charges / refund waves involve non-trivial amounts
    if (Math.min(...group.map((t) => t.amount)) < 500) continue;
    const sorted = [...group].sort((a, b) => a.ts - b.ts);
    for (let i = 0; i + 7 < sorted.length; i++) {
      const window8 = sorted.slice(i, i + 8);
      if (window8[7].ts - window8[0].ts > 2 * 3_600_000) continue;
      const amounts = window8.map((t) => t.amount);
      const lo = Math.min(...amounts);
      const hi = Math.max(...amounts);
      if (hi / Math.max(1, lo) > 1.25) continue; // amounts must actually be similar
      anomalies.push({
        id: `anom_burst_${window8[0].id}`,
        ts: window8[0].ts,
        kind: "duplicate_pattern",
        description: `${window8.length} similar ₹${lo.toLocaleString("en-IN")}+ transactions within 2 hours — possible duplicate charges or refund wave`,
        amount: amounts.reduce((s, a) => s + a, 0),
        zScore: group.length,
      });
      break;
    }
    if (anomalies.some((a) => a.kind === "duplicate_pattern")) break;
  }

  // 3. Traffic drop: a day with transactions < 40% of trailing 7-day daily mean
  const dailyCounts = new Map<string, number>();
  for (const t of txs) {
    const key = new Date(t.ts).toISOString().slice(0, 10);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }
  const days = [...dailyCounts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  for (let i = 7; i < days.length; i++) {
    const trailing = days.slice(i - 7, i).map((d) => d[1]);
    const tMean = trailing.reduce((s, n) => s + n, 0) / 7;
    if (days[i][1] < tMean * 0.4 && new Date(days[i][0]).getTime() > now - 10 * DAY) {
      anomalies.push({
        id: `anom_drop_${days[i][0]}`,
        ts: new Date(days[i][0]).getTime(),
        kind: "traffic_drop",
        description: `Traffic dropped to ${days[i][1]} transactions vs ~${Math.round(tMean)} daily average`,
        zScore: Math.round(((tMean - days[i][1]) / tMean) * 100),
      });
      break;
    }
  }

  return anomalies;
}

// ─── Segmentation ───────────────────────────────────────────────────────────

export function computeSegments(customers: Customer[], now: number): SegmentStats[] {
  const segments: SegmentStats[] = [];
  const defs: { seg: Customer["segment"]; desc: string }[] = [
    { seg: "regular", desc: "Visit 6+ times — your core earners" },
    { seg: "new", desc: "First-time or rare visitors — nurture them" },
    { seg: "at_risk", desc: "Were regular, haven't visited in 2+ weeks" },
    { seg: "inactive", desc: "Gone quiet for 4+ weeks — win them back" },
  ];
  const real = customers.filter((c) => c.visitCount > 0); // never-transacted customers don't count
  for (const { seg, desc } of defs) {
    const group = real.filter((c) => c.segment === seg);
    if (group.length === 0) continue;
    const totalSpend = group.reduce((s, c) => s + c.totalSpend, 0);
    const lastSeenMax = Math.max(...group.map((c) => c.lastSeen));
    segments.push({
      segment: seg,
      count: group.length,
      totalSpend,
      avgTicket: Math.round(totalSpend / Math.max(1, group.reduce((s, c) => s + c.visitCount, 0))),
      lastSeenWithinDays: Math.round((now - lastSeenMax) / DAY),
      description: desc,
    });
  }
  return segments;
}
