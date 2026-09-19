// ─── Core domain types for RADAAR intelligence spine ────────────────────────

export type PaymentMethod = "qr" | "upi_collect" | "card" | "wallet";

export interface Transaction {
  id: string;
  ts: number; // epoch ms
  amount: number; // ₹
  method: PaymentMethod;
  customerId: string;
  isRepeat: boolean; // customer has transacted before within window
}

export interface Customer {
  id: string;
  name: string;
  firstSeen: number;
  lastSeen: number;
  visitCount: number;
  totalSpend: number;
  segment: "regular" | "new" | "at_risk" | "inactive";
  isWeekdayEveningRegular: boolean; // buys 5–8 PM on weekdays often
}

// ─── Feature layer outputs ──────────────────────────────────────────────────

export interface Trend {
  id: string;
  metric: "revenue" | "transactions" | "avg_ticket" | "unique_customers";
  window: string; // human label e.g. "weekday evenings (5–8 PM)"
  direction: "up" | "down";
  deltaPct: number; // vs baseline
  baselineLabel: string; // e.g. "weekend baseline"
  evidence: {
    current: number;
    baseline: number;
    sampleSize: number;
  };
}

export interface Anomaly {
  id: string;
  ts: number;
  kind: "refund_burst" | "large_transaction" | "traffic_drop" | "duplicate_pattern";
  description: string;
  amount?: number;
  zScore: number;
}

export interface SegmentStats {
  segment: Customer["segment"];
  count: number;
  totalSpend: number;
  avgTicket: number;
  lastSeenWithinDays: number | null;
  description: string;
}

// ─── Insight card (the 4-step loop from the deck) ───────────────────────────

export type OpportunityType =
  | "reactivate_inactive"
  | "weekday_evening_offer"
  | "festive_bundling"
  | "retention_offer"
  | "upsell_bundle";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string; // "What happened"
  why: string; // AI explanation
  action: string; // recommended action
  actionCta: string;
  targetSize: number; // customers affected
  impactLow: number; // ₹ low estimate
  impactHigh: number; // ₹ high estimate
  impactPeriod: string; // "weekly"
  confidence: number; // 0..1
  relatedTrendId?: string;
}

export interface InsightCard {
  id: string;
  severity: "opportunity" | "watch" | "critical";
  signal: string; // What happened
  why: string; // Why
  opportunity: string; // What's worth acting on
  action: string; // What to do
  impact: string; // Expected impact (₹ range, AI estimate)
  ctaLabel: string;
  linkedOpportunity?: Opportunity;
}

export interface BusinessHealth {
  score: number; // 0..100
  revenueTrendPct: number;
  uniqueCustomers: number;
  repeatRate: number;
  activeRiskCount: number;
  grade: "excellent" | "good" | "fair" | "needs-attention";
}

export interface BusinessSnapshot {
  merchantName: string;
  generatedAt: number;
  revenue: { total: number; deltaPct: number; thisWeek: number; lastWeek: number };
  customers: { total: number; deltaPct: number; newThisWeek: number };
  avgTicket: { value: number; deltaPct: number };
  health: BusinessHealth;
  trends: Trend[];
  anomalies: Anomaly[];
  segments: SegmentStats[];
  cards: InsightCard[];
  opportunities: Opportunity[];
  paymentMix: Array<{ method: Transaction["method"]; count: number; amount: number }>;
}
