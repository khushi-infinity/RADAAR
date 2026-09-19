"use client";

import { useCallback, useEffect, useState } from "react";

export default function MemoryPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [facts, setFacts] = useState<string[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/memory");
      const j = (await res.json()) as { ok: boolean; facts: string[]; graph?: string };
      setFacts(j.facts ?? []);
      // "empty" (no memories yet — do something) vs "error" (transport broke)
      setState(j.facts.length > 0 ? "ok" : j.ok === false && j.graph === "unreachable" ? "error" : "empty");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const visible = open ? facts.slice(0, 12) : facts.slice(0, 2);

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-100">🧠 What RADAAR remembers</h3>
          <p className="text-[11px] text-slate-500">live from the Cognee memory graph</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              state === "ok" ? "bg-paytm-teal" : state === "loading" ? "bg-signal-warn animate-pulse" : "bg-slate-600"
            }`}
          />
          <button
            onClick={() => void load()}
            className="rounded-lg bg-overlay px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-overlay-hover"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {state === "loading" && <p className="text-[12px] text-slate-500">reading the graph…</p>}
        {state === "empty" && (
          <p className="text-[12px] text-slate-500">
            memory is empty — run an offer from a card above, then refresh.
          </p>
        )}
        {state === "error" && (
          <p className="text-[12px] text-signal-warn">couldn't reach the memory service — check connection.</p>
        )}
        {visible.map((f, i) => (
          <p
            key={i}
            className="rounded-lg chip-border bg-ink-900/50 px-2.5 py-2 text-[11.5px] leading-relaxed text-slate-400"
          >
            {f.length > 220 ? f.slice(0, 217) + "…" : f}
          </p>
        ))}
        {facts.length > 2 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[11px] font-semibold text-paytm-cyan hover:underline"
          >
            {open ? "show less" : `show all ${facts.length} memories`}
          </button>
        )}
      </div>
    </div>
  );
}
