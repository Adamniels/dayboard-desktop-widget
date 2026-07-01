---
name: admin-control-room
description: The admin is the prototype's dark "Control Room" — a sidebar (Calendar/Projects/Reminders/Notes/Display) over tab components that drive the REST api
type: context
---

`apps/admin` is styled as the prototype's dark **Control Room**, not a plain form. `App.tsx`
renders a left sidebar (Calendar, Projects, Reminders & timers, Notes, Display & sync) plus a
"Source of truth" note, and routes to tab components: `EventEditor.tsx` exports the Calendar tab
(mini month calendar + Today's schedule + styled event editor); `Planning.tsx` exports
`ProjectsTab`, `RemindersTab` (reminder form/list + Pomodoro control), `NotesTab`, and
`DisplayTab` (the day/week/month switcher via `GET`/`PATCH /display` + Google sync status).
Shared styled primitives live in `ui.tsx`; tokens in `theme.ts`. All tabs drive the existing
REST api; the display reflects changes live. The Pomodoro is started/controlled here and mirrors
to the display, which always shows the card (idle 25:00 when nothing runs).

**How to apply:** add an admin feature as a new tab component + a NAV entry in `App.tsx`, built
from `ui.tsx` primitives and `theme.ts` tokens. The display stays read-only; control lives here.
Related: [[display-theme-tokens]], [[display-active-view-setting]], [[design-reference-prototype]].
