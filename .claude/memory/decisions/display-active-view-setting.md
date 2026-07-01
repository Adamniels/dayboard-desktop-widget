---
name: display-active-view-setting
description: The admin chooses one active view (day/week/month) via a display_setting singleton; the display shows exactly that, centered on now
type: decision
---

The wall display shows a single active view — day, week, or month — chosen by Adam from the
admin, never auto-rotating. State lives in a **`display_setting` singleton table** (`id`,
`activeView`, `updatedAt`; migration 0003). The api seeds one `week` row on first read.
`GET /config` includes `activeView`; `GET /display` returns it; `PATCH /display { activeView }`
validates against day/week/month, updates the row, and `broadcast({ type: "display.changed" })`.
The display refetches config + occurrences on that message and switches within ~1s. Each view
is centered on now: day -> today, week -> current Mon..Sun, month -> the 42-cell grid.

**Why:** single-user kiosk; a chosen view is simpler and calmer than rotation, and one settings
row leaves room for future display settings (e.g. day/night dimming) without new tables.

**How to apply:** add display-level settings as columns on `display_setting`, not new tables.
Drive display changes by broadcasting a WebSocket message the display already refetches on.
Realizes FR-VIEW-3 / US-VIEW2. Related: [[unified-event-model]], [[display-theme-tokens]].
