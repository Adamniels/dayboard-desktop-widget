// Display theme tokens (Phase 3 polish). A single source for the colors, spacing, radii, and
// type scale lifted from the approved prototype (Dayboard.dc.html), so every display
// component reads tokens instead of hardcoded hex and the look changes in one place. Pure
// data + two tiny helpers; no React here.

/** Convert a #rrggbb hex and an alpha into an rgba() string (prototype's hexA). */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const colors = {
  bg: "#161118",
  bgDeep: "#08080B", // the kiosk device interior in the prototype; the fullscreen display bg
  accent: "#7C6CF6", // meetings
  accentSoft: "#A99CFF", // accent text (up-next relative time, day-header label)
  teal: "#3FB8AF", // blocks
  tealText: "#9FE3DE",
  red: "#FF6B6B", // now line / alerts
  redText: "#FF9A9A",
  amber: "#E2A23B",
  // text
  text: "#EDEAF2",
  textBright: "#F4F3FA",
  textMuted: "rgba(255,255,255,.6)",
  textFaint: "rgba(255,255,255,.4)",
  textGhost: "rgba(255,255,255,.32)",
  // surfaces / borders
  surface: "rgba(255,255,255,.04)",
  surfaceDim: "rgba(255,255,255,.02)",
  border: "rgba(255,255,255,.08)",
  borderFaint: "rgba(255,255,255,.06)",
  hairline: "rgba(255,255,255,.05)",
} as const;

export const radii = { sm: 7, md: 9, lg: 12, xl: 16 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

export const font = {
  hour: 10.5,
  chip: 9.5,
  meta: 12,
  body: 13,
  title: 14,
  h1Landscape: 22,
  h1Portrait: 18,
} as const;

/** Hour pixel heights, matching the prototype (taller for the single day column). */
export const hourPx = { week: 54, day: 64 } as const;

/** The standard panel/card surface used across the display. */
export const card: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  padding: space.lg,
  color: colors.text,
};

/** Event fill color by type (block teal, meeting accent), matching the prototype's evColor. */
export function colorForType(type: "meeting" | "block" | "general"): string {
  if (type === "block") return colors.teal;
  if (type === "meeting") return colors.accent;
  return "#8E8AAE"; // general (untyped Google events) — soft indigo so it isn't a dull gray
}

// Keyframes the display relies on (the sync-pill pulse, the focus-card rise, the takeover
// fade). Injected once at the display root since components use inline styles.
export const KEYFRAMES = `
@keyframes dbPulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes dbUp { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
`;

