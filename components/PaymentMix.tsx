"use client";

import type { BusinessSnapshot } from "@/lib/types";

const LABELS: Record<string, { label: string; icon: string }> = {
  qr: { label: "Paytm QR", icon: "▧" },
  upi_collect: { label: "UPI Collect", icon: "⇄" },
  card: { label: "Card", icon: "▭" },
  wallet: { label: "Paytm Wallet", icon: "◎" },
};

const COLORS = ["bg-paytm-blue", "bg-paytm-teal", "bg-signal-warn", "bg-slate-500"];

export default function PaymentMix({ mix, compact = false }: { mix: BusinessSnapshot["paymentMix"]; compact?: boolean }) {
  const total = mix.reduce((s, m) => s + m.amount, 0) || 1;

  if (compact) {
    return (
      <div className="glass p-3.5">
        <p className="kpi-label mb-2">PAYMENTS · 30D</p>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-overlay">
          {mix.map((m, i) => (
            <div key={m.method} className={COLORS[i % COLORS.length]} style={{ width: `${(m.amount / total) * 100}%` }} />
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {mix.map((m, i) => (
            <p key={m.method} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${COLORS[i % COLORS.length]}`} />
              {LABELS[m.method]?.label ?? m.method}
              <span className="ml-auto font-semibold text-slate-300">{Math.round((m.amount / total) * 100)}%</span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="glass p-4">
      <h3 className="mb-1 font-display text-sm font-bold text-slate-100">⚡ How customers pay</h3>
      <p className="mb-3 text-[11px] text-slate-500">last 30 days · Paytm rails</p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-overlay">
        {mix.map((m, i) => (
          <div
            key={m.method}
            className={COLORS[i % COLORS.length]}
            style={{ width: `${(m.amount / total) * 100}%` }}
            title={`${LABELS[m.method]?.label ?? m.method}: ₹${Math.round(m.amount).toLocaleString("en-IN")}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {mix.map((m, i) => (
          <div key={m.method} className="flex items-center gap-2 text-[12px]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${COLORS[i % COLORS.length]}`} />
            <span className="text-slate-300">
              {LABELS[m.method]?.icon} {LABELS[m.method]?.label ?? m.method}
            </span>
            <span className="ml-auto font-semibold text-slate-400">
              {Math.round((m.amount / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
