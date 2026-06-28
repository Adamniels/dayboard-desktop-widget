---
name: requirement-id-scheme
description: FR area prefixes and NFR scheme used across requirements, stories, and the verification map
type: context
---

Requirement IDs group by area; increment the number within an area:
- **FR-CAL** — Google Calendar connection + two-way sync engine.
- **FR-EVT** — events / time blocks (CRUD, types).
- **FR-PROJ** — projects.
- **FR-TODO** — to dos and the time-block surfacing rule.
- **FR-REM** — reminders and timers (scheduling, recurrence, the display takeover).
- **FR-NOTE** — notes.
- **FR-VIEW** — display views (day/week/month, orientation).
- **FR-RT** — realtime push (api → display over WebSocket).
- **NFR-*** — non-functional: NFR-PERF, NFR-REL (reliability/offline-from-Google),
  NFR-SEC (Tailscale-gated, no login in v1), NFR-MAINT.

Verification `type` per requirement is one of: `auto`, `manual`, `auto+manual`,
`auto+review`, `review`, `ci`, `na`. Used in `docs/requirements.md`,
`docs/user-stories.md`, `docs/definition-of-done.md`, and `docs/verification-map.json`.

Related: [[spec-driven-workflow]].
