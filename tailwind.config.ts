import type { Config } from "tailwindcss";

/**
 * Phase 9.5 — Dark-mode fintech design tokens (single source of truth).
 *
 * The app is dark-first. Light mode is opt-in via a `light` class on <html>
 * (darkMode: "class"); the default with no class is the dark palette below.
 * Token NAMES are kept stable (ink/muted/canvas/surface/primary/...) so existing
 * utility usages flip to dark automatically, while new tokens (elevated/line and
 * the semantic finance colors) give pages a consistent vocabulary.
 *
 * Contrast: foreground tokens (ink/muted/primary/income/expense/...) all clear
 * WCAG AA on the surface/elevated backgrounds.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Layered backgrounds (deepest -> raised)
        canvas: "#0a0e16", // app background
        surface: "#121826", // card / panel surface
        elevated: "#1b2333", // inset / raised surface (inputs, chips, tracks)
        line: "#283449", // borders / dividers

        // Text
        ink: "#e7ecf4", // primary text (near-white)
        muted: "#94a3b8", // secondary / muted text
        faint: "#64748b", // tertiary text

        // Brand / accent (bright enough for text + icons on dark)
        primary: "#2dd4bf",
        "primary-strong": "#14b8a6",

        // Semantic finance colors
        income: "#34d399", // positive / inflow
        expense: "#fb7185", // negative / outflow
        danger: "#fb7185", // destructive (alias of expense)
        debt: "#a5b4fc", // debt obligations
        warning: "#fbbf24", // warning / due-soon / cards
        investment: "#60a5fa", // investment tracking
        neutral: "#94a3b8", // neutral metric
        success: "#34d399", // success (alias of income)
        cardpay: "#fbbf24" // credit-card lifecycle accent
      },
      boxShadow: {
        // Dark surfaces lean on depth + a faint accent glow rather than soft grey shadows.
        soft: "0 24px 60px rgba(0, 0, 0, 0.45)",
        card: "0 10px 30px rgba(0, 0, 0, 0.35)",
        glow: "0 0 0 1px rgba(45, 212, 191, 0.12), 0 20px 50px rgba(13, 148, 136, 0.18)"
      },
      borderRadius: {
        panel: "20px"
      },
      fontSize: {
        // Refined type scale layered on top of Tailwind defaults.
        caption: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
        stat: ["1.75rem", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        display: ["2.75rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-lg": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.025em" }]
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "Noto Sans Thai", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
