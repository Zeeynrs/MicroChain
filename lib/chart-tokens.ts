/**
 * Hex mirrors of the Vantage app tokens in app/tokens.css, for SVG libraries (Recharts, React Flow)
 * that take colours as attributes, where CSS variables do not resolve reliably.
 * Keep in step with tokens.css: card-ink (paper here: bars and committed lines), card-muted,
 * app-rule, app-line, app-tint, warn-ink.
 */
export const chartTokens = {
  paper: "#111a1f",
  cardMuted: "#525c63",
  rule: "#dce0e3",
  line: "#b1b9bd",
  tint: "#eff2f4",
  warnInk: "#71440c",
} as const;
