"use client";

import Radar, { type RadarBlip } from "@/components/Radar";
import Copilot from "@/components/Copilot";
import PaymentMix from "@/components/PaymentMix";
import MemoryPanel from "@/components/MemoryPanel";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import PlatformBar from "@/components/PlatformBar";
import {
  inr,
  pct,
  type OfferState,
  type OutcomeState,
} from "@/lib/useRadaarSession";
import type { BusinessSnapshot } from "@/lib/types";

/**
 * Design C — "Operator Terminal": a dense trading-desk layout. Every signal,
 * number and action is visible at once — built for a merchant who lives in
 * this screen daily, not a first-time visitor. Radar as top hero, KPI rail
 * down the left, action queue center, chat as a permanent right rail.
 */

interface Props {
  snap: BusinessSnapshot;
  dateLabel: string;
  blips: RadarBlip[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  offers: Record<string, OfferState>;
  outcome: OutcomeState | null;
  celebrate: boolean;
  memoryKey: number;
  createOffer: (id: string) => void;
  measureOutcome: (id: string) => void;
}

const SEV_ROW: Record<string, string> = {
  critical: "border-l-signal-down",
  watch: "border-l-signal-warn",
  opportunity: "border-l-paytm-cyan",
};

export default function OperatorTerminal(p: Props) {
  const { snap } = p;
  const story = snap.cards.find((c) => c.id === p.selectedId) ?? snap.cards[0];
  const offer = p.offers[story.id];

  return (
    <main className="mx-auto max-w-[1600px] space-y-3 p-3 lg:p-4">
      {/* ── slim status bar ─────────────────────────────────────────────── */}
      <header className="glass flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <span className="font-display text-sm font-black tracking-tight text-slate-50">
          RADAAR<span className="text-paytm-cyan">_</span>OPERATOR
        </span>
        <span className="text-[11px] text-slate-400">{snap.merchantName} · {p.dateLabel}</span>
        <PlatformBar compact />
        <div className="ml-auto flex items-center gap-3">
          <ThemeSwitcher />
          <span className="rounded-full bg-signal-up/10 px-2.5 py-1 text-[11px] font-bold text-signal-up">
            HEALTH {snap.health.score} · {snap.health.grade.toUpperCase()}
          </span>
        </div>
      </header>

      {/* ── 3-column terminal grid ──────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-[220px_1fr_320px]">
        {/* LEFT RAIL — all numbers, zero chrome; tiles 2-wide below lg */}
        <aside className="grid grid-cols-2 gap-3 lg:block lg:space-y-3">
          <div className="glass space-y-3 p-3.5">
            {[
              ["REVENUE / WK", inr(snap.revenue.thisWeek), snap.revenue.deltaPct],
              ["CUSTOMERS", snap.customers.total.toLocaleString("en-IN"), snap.customers.deltaPct],
              ["AVG TICKET", inr(snap.avgTicket.value), snap.avgTicket.deltaPct],
            ].map(([label, value, delta]) => (
              <div key={label as string}>
                <p className="kpi-label">{label}</p>
                <p className="font-display text-lg font-extrabold text-slate-50">{value}</p>
                <p className={`text-[11px] font-bold ${(delta as number) >= 0 ? "text-signal-up" : "text-signal-down"}`}>
                  {(delta as number) >= 0 ? "▲" : "▼"} {pct(delta as number)}
                </p>
              </div>
            ))}
          </div>

          <div className="glass p-3.5">
            <p className="kpi-label mb-2">TRENDS</p>
            <div className="space-y-1.5">
              {snap.trends.map((t) => (
                <p key={t.id} className="text-[11.5px] leading-tight text-slate-300">
                  <span className={t.direction === "up" ? "text-signal-up" : "text-signal-down"}>
                    {t.direction === "up" ? "▲" : "▼"}{Math.abs(t.deltaPct)}%
                  </span>{" "}
                  {t.window}
                </p>
              ))}
            </div>
          </div>

          <div className="glass p-3.5">
            <p className="kpi-label mb-2">ANOMALIES</p>
            <div className="space-y-1.5">
              {snap.anomalies.map((a) => (
                <p key={a.id} className="text-[11.5px] leading-tight text-slate-300">
                  <span className="mr-1 text-signal-warn">●</span>{a.description}
                </p>
              ))}
              {snap.anomalies.length === 0 && <p className="text-[11.5px] text-slate-500">none</p>}
            </div>
          </div>

          <PaymentMix mix={snap.paymentMix} compact />
        </aside>

        {/* CENTER — radar + action queue */}
        <section className="space-y-3">
          <div className="glass relative h-[380px] overflow-hidden">
            <Radar blips={p.blips} onSelect={p.onSelect} celebrate={p.celebrate} />
            {p.celebrate && p.outcome && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-signal-up/40 bg-ink-900/90 px-4 py-1 text-[11px] font-bold text-signal-up shadow-glow">
                ▲ {p.outcome.offerId}: +{inr(p.outcome.revenueDelta)} ({pct(p.outcome.upliftPct)}) — learned
              </div>
            )}
          </div>

          {/* action queue — every signal as a dense row */}
          <div className="glass p-3.5">
            <p className="kpi-label mb-2">ACTION QUEUE · {snap.cards.length}</p>
            <div className="space-y-1.5">
              {snap.cards.map((c) => {
                const selected = c.id === story.id;
                const o = p.offers[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => p.onSelect(c.id)}
                    className={`w-full border-l-2 px-3 py-2 text-left transition-colors ${SEV_ROW[c.severity]} ${
                      selected ? "bg-overlay-hover" : "bg-transparent hover:bg-overlay"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-bold text-slate-100">{c.signal}</span>
                      <span className="shrink-0 text-[11px] font-bold text-signal-up">{c.impact}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="truncate">{c.action}</span>
                      {o?.done ? (
                        <span className="shrink-0 font-bold text-signal-up">✓ live</span>
                      ) : (
                        <span className="shrink-0">{c.ctaLabel} →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* focused signal detail + one-screen action panel */}
          <div className="glass p-3.5">
            <p className="kpi-label">SELECTED · {story.signal}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"><b className="text-slate-100">Why:</b> {story.why}</p>
            <p className="mt-1 text-[12.5px] text-slate-300"><b className="text-slate-100">Do:</b> {story.action}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!offer?.done ? (
                <button
                  onClick={() => p.createOffer(story.id)}
                  disabled={offer?.pending}
                  className="rounded-xl bg-gradient-to-r from-paytm-blue to-paytm-cyan px-4 py-2 text-[12.5px] font-bold text-ink-950 disabled:opacity-50"
                >
                  {offer?.pending ? "running (Sarvam → n8n → Cognee)…" : story.ctaLabel}
                </button>
              ) : (
                <>
                  <span className="rounded-xl bg-signal-up/10 px-3 py-2 text-[12px] font-bold text-signal-up">
                    ✓ {offer.offerId} · {offer.audienceSize} customers
                  </span>
                  {!p.outcome && (
                    <button
                      onClick={() => p.measureOutcome(story.id)}
                      className="rounded-xl chip-border bg-overlay px-3 py-2 text-[12px] font-bold text-slate-200 hover:bg-overlay-hover"
                    >
                      measure outcome →
                    </button>
                  )}
                </>
              )}
              {p.outcome && (
                <span className="text-[12px] font-bold text-signal-up">
                  {pct(p.outcome.upliftPct)} · +{inr(p.outcome.revenueDelta)} · {p.outcome.verdict}
                </span>
              )}
            </div>
            {offer?.done && offer.nudgeHi && (
              <p className="mt-2 rounded-lg chip-border bg-ink-900/60 px-3 py-2 text-[12px] italic leading-relaxed text-slate-300">
                📱 “{offer.nudgeHi}” — Sarvam in n8n
              </p>
            )}
          </div>
        </section>

        {/* RIGHT RAIL — permanent chat + memory */}
        <aside className="space-y-3">
          <div className="h-[560px]">
            <Copilot />
          </div>
          <MemoryPanel refreshKey={p.memoryKey} />
        </aside>
      </div>

      <footer className="pb-3 text-center text-[10px] text-slate-600">
        RADAAR operator terminal · What happened → Why → What to do → Expected impact
      </footer>
    </main>
  );
}
