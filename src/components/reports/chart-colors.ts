// Recharts needs literal hex values (SVG props), not Tailwind classes, so this is
// a small hex mirror of the existing Phase 9.5 tokens in tailwind.config.ts. Do not
// add new tokens here — every color below has a matching token (income/expense/
// debt/warning/investment/primary). Axis/grid use a muted gray chosen to read on
// both the dark (default) and light themes.
export const CHART_COLORS = {
  income: "#34d399", // token: income
  expense: "#fb7185", // token: expense / danger
  net: "#2dd4bf", // token: primary
  debt: "#a5b4fc", // token: debt
  investment: "#60a5fa", // token: investment
  warning: "#fbbf24", // token: warning
  axis: "#94a3b8", // token: muted
  grid: "rgba(148, 163, 184, 0.18)" // muted at low opacity, reads on dark + light
} as const;

// Categorical palette for the category donut + its ranked list dots. Reuses the
// same hues as the semantic tokens above plus two extra accents for variety,
// mirroring the previous BAR_COLORS list but as literal hex for chart SVGs.
export const CATEGORY_PALETTE = [
  CHART_COLORS.net,
  CHART_COLORS.investment,
  CHART_COLORS.warning,
  CHART_COLORS.income,
  CHART_COLORS.expense,
  CHART_COLORS.debt,
  "#94a3b8",
  "#e879f9"
] as const;
