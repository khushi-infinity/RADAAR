import type { Transaction, Customer } from "./types";

// Seeded PRNG (mulberry32) so runs are reproducible for demos
export function makeRng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
const FIRST_NAMES = [
  "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Neha", "Arjun", "Kavya",
  "Rahul", "Sneha", "Karan", "Pooja", "Dev", "Ishita", "Aditya", "Meera",
  "Suresh", "Lakshmi", "Manoj", "Divya",
];

export interface GeneratorOptions {
  days?: number;
  seed?: number;
  merchantName?: string;
}

export interface GeneratedData {
  transactions: Transaction[];
  customers: Customer[];
  now: number;
  merchantName: string;
}

// UTC-midnight anchor of "today", so day/hour buckets are stable
function utcMidnight(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Behavioral model (per day-hour cell, all times UTC day-anchored):
 *  - ~1,050 transactions/week, avg ticket ≈ ₹350 (deck-scale KPIs)
 *  - weekends ~1.5x weekday baseline; evening (17–20) is the strongest slot
 *  - festive days spike 2.2x — placed OUTSIDE all comparison windows
 *  - weekday evenings taper to ~0.62x during the LAST 21 days (hero scenario)
 *  - ~180 previously-regular customers go quiet ~30 days ago (win-back pool)
 *  - ~140 genuinely new customers trickle in over the final 35 days
 *  - planted anomalies: ₹24.5K whale, ₹1.8K burst, one slow day (9/9/8 days ago)
 */
export function generateMerchantData(opts: GeneratorOptions = {}): GeneratedData {
  const days = opts.days ?? 90;
  const seed = opts.seed ?? 42;
  const rng = makeRng(seed);
  const merchantName = opts.merchantName ?? "Sharma General Store";
  const todayUtc = utcMidnight(Date.now());
  const start = todayUtc - (days - 1) * DAY;

  const inactiveSince = start + 59 * DAY; // ~30 days before the end of the window

  const customers: Customer[] = [];
  const byId = new Map<string, Customer>();
  const pool: { id: string; eveningRegular: boolean; inactive: boolean; newSince: number }[] = [];

  const TOTAL_CUSTOMERS = 1_300;
  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    const id = `cust_${String(i).padStart(4, "0")}`;
    const eveningRegular = rng() < 0.3;
    const inactive = i < 190 && rng() < 0.95;
    // last ~140 indexes appear only in the final 35 days (new acquisition)
    const newSince = i >= TOTAL_CUSTOMERS - 140 ? start + (50 + rng() * 39) * DAY : 0;
    pool.push({ id, eveningRegular, inactive, newSince });
    const c: Customer = {
      id,
      name: `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${String.fromCharCode(65 + (i % 26))}.`,
      firstSeen: 0,
      lastSeen: 0,
      visitCount: 0,
      totalSpend: 0,
      segment: "new",
      isWeekdayEveningRegular: eveningRegular,
    };
    customers.push(c);
    byId.set(id, c);
  }

  const eveningOnes = pool.filter((c) => c.eveningRegular);
  const transactions: Transaction[] = [];
  let txCount = 0;

  for (let d = 0; d < days; d++) {
    const dayStart = start + d * DAY;
    const dow = new Date(dayStart).getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const daysFromEnd = days - 1 - d; // 0 = today

    // Festive windows: 24–22 and 60–58 days from end (outside trend + KPI windows)
    const isFestive = (daysFromEnd >= 22 && daysFromEnd <= 24) || (daysFromEnd >= 58 && daysFromEnd <= 60);

    // Hero taper: last 21 days, weekday evenings weaken progressively
    const taperActive = daysFromEnd <= 21;
    const taperFactor = taperActive ? 0.75 + 0.25 * (daysFromEnd / 21) : 1;

    for (let hour = 8; hour <= 22; hour++) {
      let base = 0.5;
      if (hour >= 10 && hour <= 13) base = 1.0;
      if (hour >= 17 && hour <= 20) base = 1.35;
      if (hour === 21) base = 0.8;

      if (isWeekend) base *= 1.5;
      if (isFestive) base *= 2.2;

      const isWeekdayEvening = !isWeekend && hour >= 17 && hour <= 20;
      const hourFactor = isWeekdayEvening ? taperFactor : 1;

      // slow day planted 8 days from end (weekday): traffic collapses to ~1/3
      const isSlowDay = daysFromEnd === 8 && !isWeekend;
      if (isSlowDay && rng() < 0.68) continue;

      const expected = base * hourFactor * 10;
      const n = Math.floor(expected + rng() * (expected + 1));

      for (let k = 0; k < n; k++) {
        let cust = pool[Math.floor(rng() * pool.length)];
        if (hour >= 17 && hour <= 20 && rng() < 0.35) {
          cust = eveningOnes[Math.floor(rng() * eveningOnes.length)];
        }
        if (cust.inactive && dayStart >= inactiveSince && rng() < 0.97) continue;
        if (dayStart < cust.newSince) continue; // future customer — no tx yet

        // stable amount distribution: mean ≈ ₹350, moderate tail to ~₹600
        const amount = Math.round((150 + Math.pow(rng(), 1.3) * 450) * (isFestive ? 1.4 : 1));
        const ts = dayStart + hour * 3_600_000 + Math.floor(rng() * 3_500_000);
        transactions.push({
          id: `tx_${String(txCount++).padStart(6, "0")}`,
          ts,
          amount,
          method: rng() < 0.78 ? "qr" : rng() < 0.6 ? "upi_collect" : rng() < 0.8 ? "wallet" : "card",
          customerId: cust.id,
          isRepeat: false,
        });

        const c = byId.get(cust.id)!;
        if (c.firstSeen === 0 || ts < c.firstSeen) c.firstSeen = ts;
        if (ts > c.lastSeen) c.lastSeen = ts;
        c.visitCount++;
        c.totalSpend += amount;
      }
    }
  }

  // mark repeats (seen before within prior 30 days)
  const seen = new Map<string, number[]>();
  for (const t of transactions) {
    const arr = seen.get(t.customerId) ?? [];
    t.isRepeat = arr.some((ts) => t.ts - ts < 30 * DAY);
    arr.push(t.ts);
    seen.set(t.customerId, arr);
  }

  // ── planted anomalies (burst + slow day 9/8 days ago: inside the 10-day
  //    anomaly scan, OUTSIDE the 7-day KPI window) ──
  const burstDay = todayUtc - 9 * DAY;
  for (let i = 0; i < 10; i++) {
    const p = pool[Math.floor(rng() * pool.length)];
    transactions.push({
      id: `tx_${String(txCount++).padStart(6, "0")}`,
      ts: burstDay + 14 * 3_600_000 + i * 240_000,
      amount: 1_800 + Math.floor(rng() * 400),
      method: "qr",
      customerId: p.id,
      isRepeat: true,
    });
    const ac = byId.get(p.id)!;
    if (ac.lastSeen < burstDay) ac.lastSeen = burstDay;
    ac.visitCount++;
    ac.totalSpend += 1_800;
  }

  // one whale 9 days ago: flagged by anomaly scan, excluded from weekly KPIs
  const whale = pool[Math.floor(rng() * pool.length)];
  transactions.push({
    id: `tx_${String(txCount++).padStart(6, "0")}`,
    ts: todayUtc - 9 * DAY + 11 * 3_600_000,
    amount: 24_500,
    method: "card",
    customerId: whale.id,
    isRepeat: false,
  });
  const wc = byId.get(whale.id)!;
  if (wc.lastSeen < todayUtc - 9 * DAY) wc.lastSeen = todayUtc - 9 * DAY;
  wc.visitCount++;
  wc.totalSpend += 24_500;

  transactions.sort((a, b) => a.ts - b.ts);

  for (const c of customers) {
    if (c.visitCount === 0) continue; // never transacted → not counted
    const daysSince = (todayUtc - utcMidnight(c.lastSeen)) / DAY;
    if (daysSince > 28) c.segment = "inactive";
    else if (daysSince > 14 && c.visitCount >= 5) c.segment = "at_risk";
    else if (c.visitCount >= 6) c.segment = "regular";
    else c.segment = "new";
  }

  return { transactions, customers, now: todayUtc + DAY, merchantName };
}
