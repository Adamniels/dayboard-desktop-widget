// Admin theme tokens, lifted from the prototype's admin surface so the control room matches
// the wall display's palette. Mirrors apps/display/src/theme.ts (separate app, so duplicated
// rather than shared across the package boundary).
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`;
}

export const colors = {
  bg: "#141019",
  accent: "#7C6CF6",
  accentSoft: "#A99CFF",
  accentBright: "#BCB2FF",
  teal: "#3FB8AF",
  tealText: "#9FE3DE",
  red: "#FF6B6B",
  redText: "#FF9A9A",
  text: "#EDEAF2",
  textMuted: "rgba(255,255,255,.6)",
  textDim: "rgba(255,255,255,.5)",
  textFaint: "rgba(255,255,255,.4)",
  textGhost: "rgba(255,255,255,.35)",
  surface: "rgba(255,255,255,.03)",
  surfaceUp: "rgba(255,255,255,.06)",
  inputBg: "rgba(255,255,255,.04)",
  border: "rgba(255,255,255,.08)",
  borderInput: "rgba(255,255,255,.12)",
  borderFaint: "rgba(255,255,255,.06)",
  divider: "rgba(255,255,255,.07)",
} as const;

export const KEYFRAMES = `
@keyframes dbPop { from { opacity: 0; transform: scale(.98) } to { opacity: 1; transform: none } }
`;

/** Event color by type (block teal, meeting accent, general soft indigo). */
export function colorForType(type: "meeting" | "block" | "general"): string {
  if (type === "block") return colors.teal;
  if (type === "meeting") return colors.accent;
  return "#8E8AAE";
}
