---
name: admin-interactive-calendar
description: The admin Calendar tab is a FullCalendar week grid (drag create/move/resize); pure mapping/patch logic is in calendar-model.ts (tested), FullCalendar wiring in EventEditor.tsx
type: context
---

The admin's Calendar tab is an interactive weekly grid built on **FullCalendar** (`timeGridWeek`
+ interaction plugin, the free MIT packages) instead of a list. Drag on the grid to create (which
prefills the side editor), click an event to edit, drag to move, drag edges to resize; move and
resize persist immediately via `PATCH /events/:id`. Recurring events are locked from dragging
(`editable:false`) because recurrence is read-only in v1 ([[google-two-way-sync-single-user]],
FR-CAL-6). The grid shows the full 24-hour day (unlike the display's 07:00-21:00 window),
Monday first, 30-minute snap, browser-local timezone.

Browser-free logic lives in `apps/admin/src/calendar-model.ts` and is unit tested
(`occurrencesToEvents`, `selectionToDraft`, `moveResizeToPatch`; describe "interactive week
calendar" = the FR-EVT-3 matcher). The FullCalendar wiring is `apps/admin/src/EventEditor.tsx`.
FullCalendar cannot be installed in the sandbox (the proxy blocks its tarballs), so the tab is
typecheck/build verified on Adam's machine after `pnpm install`; the pure model is verified in the
sandbox. Realizes FR-EVT-3 / US-EVT2. Related: [[admin-control-room]], [[display-theme-tokens]].
