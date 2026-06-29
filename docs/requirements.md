# Requirements

Functional requirements (`FR-*`) and non-functional requirements (`NFR-*`). Each is
written in "shall" wording and carries an ID used by `docs/user-stories.md`,
`docs/definition-of-done.md`, and `docs/verification-map.json`. Area prefixes and
verification types are defined in
`.claude/memory/context/requirement-id-scheme.md`.

This is the living spec. Nothing here is implemented yet — `docs/STATUS.md` is the
live truth on what actually passes. Phase grouping mirrors `docs/roadmap.md`.

## Phase 1 — Google integration spine

### FR-CAL — Google Calendar sync
- **FR-CAL-1** The system shall let Adam connect a Google account via OAuth and store
  the tokens securely on the Mini.
- **FR-CAL-2** On first connection, the system shall pull all events from the chosen
  Google calendar into the local database.
- **FR-CAL-3** The system shall incrementally pull Google changes using a stored sync
  token, polled every 30–60 seconds.
- **FR-CAL-4** The system shall push events created or edited in the app to Google, so
  the same plan appears in Google Calendar.
- **FR-CAL-5** When the same event changed on both sides, the system shall resolve the
  conflict by last-write-wins using the `updatedAt` timestamp.
- **FR-CAL-6** The system shall sync recurring Google events read-only: it shall
  display them but shall not edit recurrences in v1.

### FR-EVT — Events
- **FR-EVT-1** Adam shall create, read, update, and delete events from the admin app.
- **FR-EVT-2** Each event shall carry a `type` of `meeting`, `block`, or `general`, where
  a time block is an event reserved for focused work rather than a meeting, and `general`
  is the default applied to events imported from Google (which has no meeting/block
  concept).

### FR-VIEW — Display views
- **FR-VIEW-1** The display shall show a weekly view of events by default.
- **FR-VIEW-2** The display shall render correctly in both portrait and landscape
  orientations.

### FR-RT — Realtime
- **FR-RT-1** When data changes in the app, the display shall update within about one
  second without a manual refresh, via WebSocket push.

## Phase 2 — Planning layer (the stuff Google can't hold)

### FR-PROJ — Projects
- **FR-PROJ-1** Adam shall create and manage projects that act as containers for to
  dos.

### FR-TODO — To dos
- **FR-TODO-1** Adam shall create to dos under a project, each with a status.
- **FR-TODO-2** While the current time falls inside an event linked to a project, the
  display shall surface that project's open to dos at the top.

### FR-REM — Reminders and timers
- **FR-REM-1** Adam shall create a reminder at an absolute clock time.
- **FR-REM-2** Adam shall create a relative reminder or timer ("in N minutes"),
  including a Pomodoro-style countdown.
- **FR-REM-3** A reminder shall optionally recur on a schedule.
- **FR-REM-4** When a reminder or timer fires, the display shall show a visual takeover
  and optionally play a chime.

### FR-NOTE — Notes
- **FR-NOTE-1** Adam shall create notes, either general or linked to a project.

## Phase 3 — More views and polish

- **FR-VIEW-3** The display shall additionally offer daily and monthly views, and allow
  switching the active view from the admin.

## Non-functional

- **NFR-REL-1** The app (display and admin) shall keep functioning when Google
  Calendar is unreachable, using the local database.
- **NFR-SEC-1** Admin access shall be gated by the Tailscale network; no login screen
  is required in v1.
- **NFR-PERF-1** An admin change shall be reflected on the display within about one
  second under normal conditions.
- **NFR-MAINT-1** All brain logic (scheduling, recurrence, todo surfacing) shall live
  in `packages/core` as pure functions to remain unit-testable without a database.
