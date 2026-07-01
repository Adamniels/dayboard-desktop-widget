---
name: display-theme-tokens
description: Both frontends read a per-app theme.ts token module (colors/space/radii/type + hexA) lifted from the prototype; components use inline styles, no hardcoded hex
type: convention
---

The display and admin use inline styles that reference a per-app token module —
`apps/display/src/theme.ts` and `apps/admin/src/theme.ts` — holding `colors`, `space`,
`radii`, `font`, and helpers (`hexA(hex, alpha)`, `card`, `colorForType`), all lifted from the
approved prototype. Components read tokens instead of hardcoded hex, so the look changes in one
place. The two modules are duplicated on purpose: display and admin are separate apps, so tokens
are not shared across the package boundary. The display root uses `colors.bgDeep` (`#08080B`,
the kiosk device interior) and both index.html files carry a small CSS reset
(`html, body, #root { margin: 0; height: 100% }`) so the app fills the screen with no white
frame. Global keyframes (pulse/rise/fade) are injected once at each app root.

**Why:** consistency and one-place theming without a component library; matches the prototype
faithfully; the reset fixes the white border the default body margin caused.

**How to apply:** when adding UI, pull colors/spacing from `theme.ts`; do not inline new hex.
Keep the display and admin token modules in sync when a shared value changes.
Related: [[design-reference-prototype]], [[display-active-view-setting]], [[admin-control-room]].
