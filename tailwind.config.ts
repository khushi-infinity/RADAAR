import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // All semantic colors resolve to CSS variables — runtime themeable.
        // Utilities like text-slate-200 keep working (mapped to tokens).
        ink: {
          950: "rgb(var(--bg-page-rgb) / <alpha-value>)",
          900: "rgb(var(--bg-page-rgb) / <alpha-value>)",
          850: "rgb(var(--bg-page-rgb) / <alpha-value>)",
          800: "rgb(var(--bg-page-rgb) / <alpha-value>)",
          700: "rgb(var(--bg-page-rgb) / <alpha-value>)",
        },
        slate: {
          50: "rgb(var(--text-hi-rgb) / <alpha-value>)",
          100: "rgb(var(--text-hi-rgb) / <alpha-value>)",
          200: "rgb(var(--text-body-rgb) / <alpha-value>)",
          300: "rgb(var(--text-body-rgb) / <alpha-value>)",
          400: "rgb(var(--text-mid-rgb) / <alpha-value>)",
          500: "rgb(var(--text-low-rgb) / <alpha-value>)",
          600: "rgb(var(--text-faint-rgb) / <alpha-value>)",
        },
        paytm: {
          blue: "rgb(var(--accent-strong-rgb) / <alpha-value>)",
          cyan: "rgb(var(--accent-rgb) / <alpha-value>)",
          teal: "rgb(var(--positive-rgb) / <alpha-value>)",
        },
        signal: {
          up: "rgb(var(--positive-rgb) / <alpha-value>)",
          down: "rgb(var(--negative-rgb) / <alpha-value>)",
          warn: "rgb(var(--warning-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "Sora", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glass: "var(--shadow-glass)",
        glow: "var(--shadow-glow)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
