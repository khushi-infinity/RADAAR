import Link from "next/link";

/**
 * /themes — design-evaluation gallery.
 * Renders the same four design elements under each theme so they can be
 * compared directly. The [data-theme] attribute cascades CSS variables to
 * any subtree, so no client JS is needed here.
 */

const DEMO = (
  <>
    {/* KPI card */}
    <div className="glass p-4">
      <p className="kpi-label">Revenue this week</p>
      <p className="font-display text-3xl font-extrabold text-slate-50">₹4,59,820</p>
      <p className="mt-1 text-xs font-semibold text-signal-up">▲ 6.2% vs last week</p>
    </div>
    {/* Insight card */}
    <div className="glass border-l-2 border-l-signal-down p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-signal-down/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal-down">
          critical
        </span>
        <span className="text-[11px] text-slate-500">confidence 78%</span>
      </div>
      <h3 className="mt-2 font-display text-[15px] font-bold text-slate-100">
        5–8 PM regulars are drifting away
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Weekday evening revenue is down 18.9% — your evening regulars are visiting less.
      </p>
      <button className="mt-3 rounded-xl bg-paytm-blue px-3.5 py-2 text-xs font-bold text-white shadow-glow">
        Create evening offer
      </button>
    </div>
    {/* WhatsApp bubble */}
    <div className="glass p-4">
      <p className="kpi-label">WhatsApp nudge</p>
      <div className="mt-2 rounded-2xl rounded-bl-md bg-overlay px-3.5 py-2.5 text-[13px] text-slate-200">
        Evening special combo ₹478 mein. Aaj hi order karein! 🌆
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Sarvam-written · dispatched to 935 customers</p>
    </div>
    {/* Status row */}
    <div className="glass flex items-center justify-between p-4">
      <div>
        <p className="kpi-label">Offer outcome</p>
        <p className="font-display text-lg font-bold text-signal-up">+₹28,049 (+6.1%)</p>
      </div>
      <span className="rounded-full bg-signal-up/10 px-3 py-1 text-xs font-bold text-signal-up">
        learned ✓
      </span>
    </div>
  </>
);

const THEMES = [
  { id: "radar", name: "Radar Blue", tag: "deep-space command center", href: "/?theme=radar" },
  { id: "money", name: "Money Vibe", tag: "private-banking wealth terminal", href: "/?theme=money" },
  { id: "heritage", name: "Paytm Heritage", tag: "light, Paytm-app daylight", href: "/?theme=heritage" },
] as const;

export default function ThemesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-50">RADAAR design evaluation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Same elements, three candidate themes — identical WCAG-AA-checked type tiers.
          </p>
        </div>
        <Link href="/" className="rounded-xl bg-paytm-blue px-4 py-2 text-sm font-bold text-white">
          ← Open the app
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {THEMES.map((t) => (
          <section key={t.id} data-theme={t.id} className="space-y-4 rounded-3xl p-4" style={{ background: "var(--bg-page)" }}>
            <header className="flex items-baseline justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-100">{t.name}</h2>
                <p className="text-xs text-slate-500">{t.tag}</p>
              </div>
              <span
                className="h-6 w-6 rounded-full border border-white/20"
                style={{ background: "linear-gradient(135deg, var(--bg-page) 50%, var(--accent) 50%)" }}
              />
            </header>
            {DEMO}
            <Link
              href={t.href}
              className="block rounded-xl chip-border bg-overlay py-2 text-center text-xs font-bold text-slate-200 hover:bg-overlay-hover"
            >
              View full dashboard in {t.name} →
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}
