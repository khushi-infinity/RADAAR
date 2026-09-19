"use client";

import { useEffect, useState } from "react";

export type ThemeName = "money" | "radar" | "heritage";

const OPTIONS: Array<{ id: ThemeName; label: string; swatch: string }> = [
  { id: "money", label: "Money", swatch: "linear-gradient(135deg,#0a0d0a 50%,#e3c05a 50%)" },
  { id: "radar", label: "Radar", swatch: "linear-gradient(135deg,#04070f 50%,#00d4ff 50%)" },
  { id: "heritage", label: "Heritage", swatch: "linear-gradient(135deg,#f4f7fb 50%,#0088cc 50%)" },
];

export const THEME_EVENT = "radaar-theme";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeName>("radar");

  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get("theme");
    const saved = (url as ThemeName) ?? (localStorage.getItem("radaar-theme") as ThemeName) ?? "radar";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
    if (url) localStorage.setItem("radaar-theme", saved);
  }, []);

  function pick(t: ThemeName) {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem("radaar-theme", t);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: t }));
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-glass bg-chip p-1" title="UI theme">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => pick(o.id)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
            theme === o.id ? "shadow-glow" : "opacity-60 hover:opacity-100"
          }`}
          style={theme === o.id ? { background: "var(--bg-glass-hover)" } : undefined}
          aria-pressed={theme === o.id}
        >
          <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: o.swatch }} />
          <span style={{ color: "var(--text-mid)" }}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
