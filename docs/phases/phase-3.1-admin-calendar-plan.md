# Phase 3.1 — Interactive admin calendar: implementation plan

Status: **implemented** (uncommitted, verified by Adam). This is a focused follow-up to Phase 3.
It turns the admin's Calendar tab from a list plus form into a Google-Calendar-style interactive
weekly grid: see the week laid out by hour, drag on the grid to create an event, click an event
to edit it, and drag an event or its edges to move and resize it. The goal is faster, more
visual planning. The pure model (`calendar-model.ts`) is sandbox-tested; the FullCalendar wiring
was typechecked, tested, and manually exercised on Adam's machine (drag create, click edit, move,
resize, week navigation, recurring lock all confirmed).

Requirement covered: **FR-EVT-3** (new). Story: **US-EVT2** (new). No schema change.

Read before implementing: `docs/ai-workflow.md`, the current admin Calendar tab
(`apps/admin/src/EventEditor.tsx`), the display week grid for the look
(`apps/display/src/WeekView.tsx`), and `.claude/memory/context/admin-control-room.md`.

---

## 1. Decisions locked (from the design discussion)

1. **Interactions, all four:** drag on empty grid to create, click an event to edit, drag an
   event to move, drag an event's edges to resize.
2. **Create flow:** a drag selection opens the existing side editor **prefilled** with the
   dragged start and end. The editor stays the single place to set title, type, and project.
3. **Views:** week only.
4. **Library: FullCalendar** (`timeGridWeek` + the interaction plugin). Chosen because it gives
   the smoothest, most complete drag, move, and resize with the least custom code, and styling
   fidelity does not matter for the admin. See §2 for the cost analysis.

## 2. Library choice and cost (why FullCalendar is safe)

FullCalendar's standard plugins are **MIT and free**, and that includes everything this feature
needs: `timeGrid` week/day views, the `interaction` plugin (drag to create via `select`, move
via `eventDrop`, edge resize via `eventResize`), and list/day/month views for the future. Only
the **Premium / Scheduler** set is paid: timeline views and resource lanes (multiple people or
rooms as side by side columns) and print optimization — enterprise scheduling a single-user
personal calendar will not use. So this feature, and any realistic future calendar feature,
stays free.

Alternatives considered: `Schedule-X` was ruled out because its drag and drop and resize are
**premium paid** plugins. `react-big-calendar` is fully MIT with no paid tier ever, and remains
the fallback if we ever want an absolute no-paywall guarantee, at the cost of rougher
interactions and writing more of the move/resize logic by hand.

Sources: [FullCalendar license](https://fullcalendar.io/license) ·
[FullCalendar premium plugins](https://fullcalendar.io/docs/premium) ·
[Schedule-X drag and drop (premium)](https://schedule-x.dev/docs/calendar/plugins/drag-and-drop) ·
[react-big-calendar on npm](https://www.npmjs.com/package/react-big-calendar).

## 3. Architecture

No `packages/core`, schema, or migration change. Two admin-side pieces:

- **`apps/admin/src/calendar-model.ts` (pure, tested).** The browser-free logic:
  - `occurrencesToEvents(occurrences)` → FullCalendar `EventInput[]`: id = `eventId`, title,
    start/end, color by type (block teal, meeting accent, general indigo), and `editable`
    false for recurring or Google-sourced occurrences (recurrence is read only in v1,
    FR-CAL-6).
  - `selectionToDraft(startISO, endISO)` → the editor's prefilled fields (local datetime input
    strings, default type `block`).
  - `moveResizeToPatch(startISO, endISO)` → the `{ start, end }` PATCH payload, with a minimum
    duration guard.
  This module has **no FullCalendar import**, so its test runs in the sandbox.

- **`apps/admin/src/EventEditor.tsx` (the Calendar tab).** Replaces the list and mini calendar
  with `<FullCalendar plugins={[timeGridPlugin, interactionPlugin]} initialView="timeGridWeek">`.
  Wiring: `events` from occurrences fetched for the visible week (refetched on `datesSet` for
  prev/next/today navigation); `select` opens the side editor prefilled; `eventClick` opens the
  editor for that event; `eventDrop` and `eventResize` call `updateEvent(id, patch)` then
  refetch, and revert for locked (recurring/Google) events. The existing side `Editor` stays
  beside the grid.

Settings: `firstDay` Monday, **full 24-hour day** (`slotMinTime` 00:00:00, `slotMaxTime`
24:00:00) like Google Calendar, `scrollTime` 07:00 so it opens near the morning but scrolls to
any hour, `snapDuration` 30 minutes, `allDaySlot` off for v1, move/resize persist immediately.
FullCalendar renders in the browser's local timezone, which matches how you read your own
calendar, so no config fetch is needed. Note this differs on purpose from the display, which
keeps its glanceable 07:00–21:00 window.

## 4. Vertical slices

1. **Deps + theme.** Add `@fullcalendar/core`, `/react`, `/timegrid`, `/interaction` to
   `apps/admin/package.json` (done) and a small dark CSS override so it fits the Control Room.
2. **`calendar-model.ts` + test.** The pure mappers above, with `apps/admin/src/calendar-model.test.ts`
   whose describe text contains **"interactive week calendar"** (the FR-EVT-3 matcher). Asserts
   occurrence→event mapping (colors, `editable` for recurring), selection→draft, and
   move/resize→patch with the min-duration guard.
3. **Calendar tab rebuild.** Swap the list/mini-calendar for the FullCalendar grid and wire
   select / click / drop / resize to the editor and the api, per §3.
4. **Guards.** Recurring or Google events are not draggable/resizable; the editor still shows
   them with the read-only recurrence note.
5. **Docs + status.** Add FR-EVT-3 to `requirements.md`, US-EVT2 to `user-stories.md`, the row
   to `definition-of-done.md`, the entry to `verification-map.json`
   (`{ "file": "admin", "name": "interactive week calendar" }`), regenerate `STATUS.md`, update
   `architecture.md` and `prototype-gap-analysis.md`, and add a memory note.

## 5. How we verify (division of labor)

The sandbox can fetch npm metadata but the proxy **blocks the FullCalendar package tarballs**,
so FullCalendar cannot be installed or type-checked here. We split the verification:

**I run in the sandbox (and paste results into the thread):**
- The pure model test: `pnpm --filter @dayboard/admin exec vitest run calendar-model` (imports
  only `calendar-model.ts`, no FullCalendar), giving FR-EVT-3 a real passing test.
- `node scripts/verify-status.mjs` and `node --test scripts/*.test.mjs`.
- Typecheck of the untouched packages (core, shared, api, display).

**You run on your machine (and paste the output back here so I can react and fix):**
1. `pnpm install` — installs FullCalendar.
2. `pnpm --filter @dayboard/admin typecheck` — the FullCalendar-importing tab (cannot run in
   sandbox).
3. `pnpm --filter @dayboard/admin test`
4. `pnpm --filter @dayboard/admin dev` — then the manual pass: drag to create opens the editor
   prefilled; click opens edit; drag moves; edge-drag resizes; prev/next changes the week; a
   recurring Google event refuses move/resize.
5. Optional full gate: `pnpm check`.

I will keep the FullCalendar wiring isolated in the Calendar tab so that if any step above
fails on your machine, the fix is contained and I can iterate quickly from your pasted output.

## 6. Acceptance criteria

Dragging across a time span in the admin week grid opens the editor prefilled with those times;
saving creates the event and it appears on the grid and the display. Clicking an event edits it.
Dragging an event moves it and dragging its edges resizes it, both persisting immediately.
Recurring Google events cannot be moved or resized. Week navigation refetches. FR-EVT-3 shows a
passing test in `STATUS.md`.

## 7. Open defaults (veto any)

- Week view only, Monday first, full 24-hour day (00:00–24:00) like Google Calendar, opening
  scrolled to the morning, 30-minute snap.
- New events default to type "focus block".
- The mini month calendar is removed (the week grid replaces it); it can return as a small
  navigator if wanted.
- No all-day row in v1.

---

**Ready for review.** Nothing is implemented; this plan is the only artifact (plus the
FullCalendar entry already added to `apps/admin/package.json`). On your approval I will build it
slice by slice, run my half in the sandbox, and hand you the exact commands to run and paste back
for the FullCalendar half. Tree stays uncommitted.
