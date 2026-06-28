---
name: design-reference-prototype
description: The interactive prototype is the canonical "how Adam wants it" for UI/interactions; ~80–90% of the frontend, backend is mocked
type: context
---

`Dayboard Interactive Prototype/Dayboard.dc.html` (with `support.js` and `screenshots/`)
is the **approved** visual and interaction reference. Treat it as the source of truth for
layout, styling, both orientations, view switching, event styling (meeting vs block), the
now/next card, the surfaced-todos behavior, the Pomodoro ring, the reminder takeover, and
the admin panels. Roughly 80–90% of the frontend is represented and should be matched.

**Real vs mocked:** it runs on in-memory state with no backend. Mocked or absent: Postgres
persistence, Google two-way sync (a boolean toggle), WebSocket/realtime (display + admin
share one in-browser state), the reminder scheduler (the takeover is a manual button),
recurrence expansion, and real datetimes (the clock is fixed; events use weekday-index +
hour ints — see [[datetime-recurrence-model]]). It is built on a prototype runtime (`x-dc`
templates + `support.js`); the real app rebuilds these as React + Vite — transcription,
not redesign.

**How to apply:** When implementing a UI feature, open the prototype and match its look
and interactions; treat the `renderVals` object as the contract for what the api must feed
each screen. Read `docs/prototype-gap-analysis.md` for the full per-phase mapping and
fidelity table. Related: [[datetime-recurrence-model]], [[mac-mini-is-the-brain]].
