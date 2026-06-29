# Phase 2 — Planning layer: implementation plan

Status: **proposed, awaiting Adam's approval**. This phase adds the things Google can't
hold, layered on the Phase 1 spine: projects, to dos with the surfacing rule, reminders
and timers (including Pomodoro) with the display takeover and chime, and notes.

Requirements covered: **FR-PROJ-1, FR-TODO-1, FR-TODO-2, FR-REM-1, FR-REM-2, FR-REM-3,
FR-REM-4, FR-NOTE-1** (per `docs/roadmap.md`). Stories: US-TODO1, US-REM1, US-NOTE1.

Read before implementing: `docs/ai-workflow.md`, the prototype's planning surfaces in
`Dayboard Interactive Prototype/Dayboard.dc.html` (the surfaced todos panel, the Pomodoro
ring, the reminder takeover overlay, the notes panel), and the memory decisions
`unified-event-model`, `app-is-source-of-truth`, `core-stays-pure`.

---

## 1. Decisions locked for Phase 2

From the planning questions:

1. **Surfacing trigger: any linked event.** A project's open to dos surface whenever `now`
   is inside any event (block, meeting, or general) that has that `projectId`, not only time
   blocks. More flexible; you link an event to a project and being inside it raises the
   tasks.
2. **Scheduler durability: persist and rehydrate everything.** Reminders and running timers
   are stored with a computed absolute fire/end instant. On api restart the scheduler
   reloads from the database and re-arms every pending reminder and running timer, so a
   reboot of the always on Mini loses nothing. (My recommendation, per your "do what's
   best".)
3. **Pomodoro durations specified on start.** No baked in 25/5 defaults; the admin chooses
   work and break lengths each time a Pomodoro starts.

---

## 2. Schema changes (migration 0002)

Projects, todos, reminders, and notes tables already exist from Phase 0 and need only
small additions; timers are new. One new migration generated from the shared schema.

**Edit `reminder`** (additive):

| field | type | purpose |
| --- | --- | --- |
| `enabled` | boolean not null default true | a reminder can be paused without deleting it (the prototype's toggle) |
| `lastFiredAt` | timestamptz null | for recurring reminders, the last fire, so the next occurrence advances correctly |

Relative reminders store a **computed `fireAt`** at creation (`now + offsetMinutes`), so the
scheduler and the restart rehydrate work uniformly off `fireAt`. `offsetMinutes` is kept for
reference and for "restart this timer".

**New table `timer`** (running countdowns and Pomodoro sessions; persisted so they survive
restart):

`id` uuid pk · `label` text · `mode` text (`countdown` | `pomodoro`) · `status` text
(`running` | `paused` | `done`) · `phase` text null (`work` | `short_break` | `long_break`) ·
`endsAt` timestamptz null (absolute instant the current phase ends; the scheduler arms off
this) · `remainingMs` integer null (set when paused) · `workMinutes` integer null ·
`breakMinutes` integer null · `longBreakMinutes` integer null · `cyclesTarget` integer null ·
`cyclesDone` integer not null default 0 · `chime` boolean not null default false ·
`projectId` uuid null fk → project.id · timestamps.

A plain countdown is `mode: countdown` with one phase. A Pomodoro is `mode: pomodoro` whose
phase advances work → short_break → work … → long_break per `cyclesTarget`.

---

## 3. `packages/core` — pure planning logic (no clock, no IO)

All scheduling and surfacing math is pure; the api supplies `now` and does the timers and
IO. Each function names the test that proves its requirement so the existing
`docs/verification-map.json` matchers resolve.

**`surfaceTodos(now, occurrences, todos)` (FR-TODO-2).** Implement the Phase 0 stub. Find
the occurrences that contain `now` and carry a `projectId` (any linked event, decision 1),
collect those project ids, and return the open todos belonging to them, in a stable order.
Outside any linked event it returns an empty list. Test text contains **"surface todos
during linked block"**.

**`nextReminderFire(reminder, now)` (FR-REM-1, FR-REM-3).** For an absolute reminder returns
`fireAt`; for a recurring one (RRULE), returns the next instant strictly after
`max(now, lastFiredAt)`. Tests: **"absolute reminder fires"** and **"recurring reminder next
occurrence"**.

**`computeTimerEnd(now, offsetMinutes)` and the relative case (FR-REM-2).** `now + offset`.
Test text contains **"relative timer fires"**.

**`buildReminderTakeover(reminder)` (FR-REM-4).** Maps a fired reminder to the display
takeover payload `{ title, chime, kind }`. Test text contains **"reminder fire payload"**.

**`nextTimerPhase(timer, now)` (Pomodoro/countdown transitions).** Pure phase machine: given
a timer and the instant its phase ended, returns the next `{ phase, durationMinutes, endsAt,
cyclesDone, status }` (work → break → work, long break every `cyclesTarget`, then `done`).
Tested (no requirement row of its own; it underpins FR-REM-2/4 for Pomodoro).

The Phase 1 `nowNext` and `expandOccurrences` are reused unchanged.

---

## 4. `apps/api` — CRUD, the scheduler, and surfacing

**REST endpoints** (validated with the shared zod schemas, each write broadcasts a change):

- Projects: `GET/POST/PATCH/DELETE /projects` (FR-PROJ-1).
- Todos: `GET /projects/:id/todos`, `POST /projects/:id/todos`, `PATCH/DELETE /todos/:id`
  with status (FR-TODO-1).
- Notes: `GET/POST/PATCH/DELETE /notes`, general or `?projectId=` (FR-NOTE-1).
- Reminders: `GET/POST/PATCH/DELETE /reminders` (absolute/relative/recurring, enable toggle,
  chime) (FR-REM-1/2/3).
- Timers: `POST /timers` (start a countdown or Pomodoro, durations required),
  `POST /timers/:id/pause`, `/resume`, `/reset`, `DELETE /timers/:id` (FR-REM-2).
- Surfacing: `GET /surfaced` returns the currently surfaced todos, computed server side via
  `core.surfaceTodos(now, occurrences, todos)` so the rule lives in one place and the display
  stays dumb (FR-TODO-2).
- The Phase 1 event editor gains a `projectId`, so events can be linked to projects (the
  hook the surfacing rule needs). The api already accepts `projectId` on events; Phase 2 just
  exposes it.

**The scheduler** (`src/scheduler/`), started with the server (like the sync loop):

- On boot it **rehydrates**: loads enabled reminders with a future `fireAt` and running
  timers with a future `endsAt`, and arms a timer for each (decision 2). Reminders/timers
  whose instant passed during downtime are resolved without a flood: a recurring reminder
  advances to its next future occurrence; a one shot overdue reminder is marked fired; an
  overdue timer phase is advanced via `core.nextTimerPhase`.
- When a reminder fires, it builds the takeover via `core.buildReminderTakeover`, broadcasts
  `{ type: "reminder.fired", payload }` over the WebSocket, advances recurring reminders to
  the next occurrence (`core.nextReminderFire`), and stamps `lastFiredAt`.
- When a timer phase ends, it advances via `core.nextTimerPhase`, persists the new phase and
  `endsAt`, and broadcasts `{ type: "timer.updated", timer }` (and `reminder.fired` style
  takeover + chime at the end of a work/break or the whole session).
- Real clock and `setTimeout` live here; all decisions come from `core`.

**WebSocket messages** added this phase: `reminder.fired`, `timer.updated`, and generic
`{ type: "<resource>.changed" }` invalidations (projects, todos, notes, surfaced) that the
display and admin refetch on. The Phase 1 `events.changed` is unchanged.

**Integration tests** (`*.api.integration.test.ts`, run on Adam's machine):
**"project crud"** (FR-PROJ-1), **"todo crud"** (FR-TODO-1), **"note crud"** (FR-NOTE-1).
Scheduler firing is unit tested in core; an api test can assert a due reminder broadcasts.

---

## 5. `apps/display` — surfaced todos, Pomodoro, takeover, notes

Transcribe the prototype's side panel and overlay; bind to real data and the new WS
messages. The display stays read only (controls live in admin).

- **Surfaced todos panel** (FR-TODO-2): the "Focus · <project>" card showing the project's
  open todos, fed by `GET /surfaced`, recomputed on the minute tick and on
  `*.changed`/`events.changed`. Matches the prototype's teal focus card.
- **Pomodoro ring**: the SVG ring with `mm:ss` and phase label, driven by `timer.updated`
  pushes plus a local per second tick between pushes. Read only here.
- **Reminder takeover overlay** (FR-REM-4): a fullscreen overlay shown on `reminder.fired`,
  auto dismissing after a few seconds, with an optional **chime** (a short audio clip played
  when `chime` is true). The kiosk Chromium needs autoplay allowed (see open items).
- **Notes panel**: read only list of notes (general and project linked), refreshed on
  `notes.changed`.

## 6. `apps/admin` — manage projects, todos, reminders, timers, notes

- **Projects and todos**: create/manage projects; add todos under a project with a status,
  check them off (FR-PROJ-1, FR-TODO-1).
- **Event ↔ project link**: the event editor gets a project dropdown so an event can be
  linked, enabling surfacing.
- **Reminders**: create absolute ("at 8pm"), relative ("in N minutes"), and recurring
  reminders, with an enable toggle and a chime toggle (FR-REM-1/2/3).
- **Timers / Pomodoro**: start a countdown or a Pomodoro (choosing work/break lengths each
  time, decision 3), with pause/resume/reset (FR-REM-2). The prototype's ring controls live
  here.
- **Notes**: create/edit notes, general or attached to a project (FR-NOTE-1).

---

## 7. Verification map mapping

The Phase 2 rows already exist in `docs/verification-map.json`:

| Req | type | test file | test name contains |
| --- | --- | --- | --- |
| FR-PROJ-1 | auto | api.integration | project crud |
| FR-TODO-1 | auto | api.integration | todo crud |
| FR-TODO-2 | auto | core | surface todos during linked block |
| FR-REM-1 | auto | core | absolute reminder fires |
| FR-REM-2 | auto | core | relative timer fires |
| FR-REM-3 | auto | core | recurring reminder next occurrence |
| FR-REM-4 | auto+review | core | reminder fire payload |
| FR-NOTE-1 | auto | api.integration | note crud |

Each slice runs `node scripts/verify-status.mjs` so the IDs flip to PASS as their tests land.

---

## 8. Vertical slice order

1. `core`: `surfaceTodos` (FR-TODO-2) with tests.
2. `api`: projects + todos CRUD and `GET /surfaced` (FR-PROJ-1, FR-TODO-1) + WS; event editor
   gains `projectId`.
3. `display`/`admin`: surfaced todos panel; projects/todos admin; event→project link.
4. `core`: reminder scheduling math and timer phase machine (FR-REM-1/2/3/4) with tests.
5. `api`: scheduler service + reminders/timers CRUD + rehydrate on boot + fire broadcast,
   migration 0002.
6. `display`/`admin`: takeover overlay + chime + Pomodoro ring; reminders and Pomodoro
   controls.
7. `notes`: api CRUD (FR-NOTE-1) + admin notes + display notes; doc sync; regenerate STATUS.

I will build the phase in this order, running `pnpm check` and the generator as I go, then
present it for review. Say the word if you would rather I stop after each slice.

---

## 9. Acceptance criteria and open items

**Phase 2 is done when:** projects and todos can be created and managed; linking an event to
a project and being inside that event surfaces the project's open todos on the display, and
they leave when the event ends; absolute, relative, and recurring reminders fire at the right
time and trigger a display takeover (with chime when set); a countdown and a Pomodoro can be
started from admin and the display shows the ring and the end takeover; notes can be created
general or project linked and appear on the display; the scheduler rehydrates cleanly after
an api restart; and the Phase 2 automated rows read PASS in `docs/STATUS.md`.

**Doc sync this phase triggers:** none of the requirement wordings change; add the Phase 2
rows' status notes to `docs/definition-of-done.md` as needed. `docs/verification-map.json`
already has the rows.

**Resolved decisions:**

1. **Kiosk audio for the chime.** The Mini's Chromium kiosk launches with
   `--autoplay-policy=no-user-gesture-required` so the chime plays unattended (documented as
   a deployment note, not code).
2. **Takeover dismissal.** Auto dismiss after a configurable few seconds (default ~8s).
3. **Overdue reminders on boot.** A one shot reminder that came due while the Mini was off is
   marked fired silently, with no late takeover.
4. **Surfaced todo ordering.** Open todos are ordered by `dueAt`, then creation time.

---

**Ready for review.** Nothing is implemented; this plan is the only artifact. On your
approval (and any notes on §9) I will build Phase 2 slice by slice and leave the tree
uncommitted for you to review and commit.
