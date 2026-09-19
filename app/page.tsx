"use client";

import OperatorTerminal from "@/components/designs/OperatorTerminal";
import { useRadaarSession } from "@/lib/useRadaarSession";

/**
 * RADAAR — Operator Terminal is THE product surface.
 * (Design evaluation ran with three candidates; this one won and the others
 * were removed. The evaluation record lives in PROGRESS.md.)
 */
export default function Dashboard() {
  const session = useRadaarSession();

  if (session.error && !session.snap) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="glass max-w-md p-6 text-center">
          <p className="font-display text-lg font-bold text-signal-down">RADAAR couldn&apos;t load</p>
          <p className="mt-2 text-sm text-slate-400">{session.error}</p>
        </div>
      </main>
    );
  }

  if (!session.snap) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-paytm-blue/30 border-t-paytm-blue" />
          <p className="text-xs uppercase tracking-widest text-slate-500">booting operator terminal…</p>
        </div>
      </main>
    );
  }

  return (
    <OperatorTerminal
      snap={session.snap}
      dateLabel={session.dateLabel}
      blips={session.blips}
      selectedId={session.selectedId}
      onSelect={session.setSelectedId}
      offers={session.offers}
      outcome={session.outcome}
      celebrate={session.celebrate}
      memoryKey={session.memoryKey}
      createOffer={(id) => void session.createOffer(id)}
      measureOutcome={(id) => void session.measureOutcome(id)}
    />
  );
}
