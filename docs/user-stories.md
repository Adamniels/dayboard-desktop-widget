# User stories

Each story has Given/When/Then acceptance criteria and a `Covers:` line listing the
requirement IDs it satisfies. Adam is the only user. Epics group by area.

## Epic: Calendar sync

### US-CAL1 — Connect Google and see my calendar
**Covers:** FR-CAL-1, FR-CAL-2, FR-VIEW-1

- **Given** I have not connected a Google account
- **When** I connect one with the setup script (`pnpm --filter @dayboard/api
  google:connect`) and pick which calendars to sync
- **Then** all their events import into the app and appear in the weekly view on the
  display.

### US-CAL2 — My two worlds stay in sync
**Covers:** FR-CAL-3, FR-CAL-4, FR-CAL-5

- **Given** the app is connected to Google
- **When** I add an event in the admin, or change one in Google on my phone
- **Then** within a minute both sides show the same thing, and if I edited the same
  event in both places the most recent edit wins.

### US-CAL3 — Recurring meetings show up safely
**Covers:** FR-CAL-6

- **Given** my Google calendar has recurring events
- **When** they sync into the app
- **Then** every occurrence displays correctly, and the app does not let me edit the
  recurrence rule (v1).

## Epic: Events

### US-EVT1 — Plan my day with blocks and meetings
**Covers:** FR-EVT-1, FR-EVT-2, FR-EVT-4

- **Given** I am in the admin app
- **When** I create, edit, or delete an event and set its type to meeting, block, or general
- **Then** it persists, pushes to Google, and the display shows blocks and meetings
  styled differently.
- **And** when I click Delete on an event, I am asked to confirm first, and nothing is
  deleted if I cancel.

### US-EVT2 — Plan visually on a calendar
**Covers:** FR-EVT-3

- **Given** the admin's Calendar tab shows an interactive weekly grid
- **When** I drag across a time span, click an event, or drag an event or its edges
- **Then** dragging opens the editor prefilled with those times, clicking opens that event,
  and moving or resizing persists immediately (recurring events stay locked).

## Epic: Display

### US-VIEW1 — Glanceable from across the room
**Covers:** FR-VIEW-1, FR-VIEW-2, FR-RT-1

- **Given** the display is running on the 15.6" screen
- **When** I mount it in portrait or landscape and change data in the admin
- **Then** the layout fits the orientation and updates within about a second without me
  touching the screen.

## Epic: Projects and to dos

### US-TODO1 — Tasks surface when I'm working on them
**Covers:** FR-PROJ-1, FR-PROJ-2, FR-TODO-1, FR-TODO-2, FR-TODO-3

- **Given** I have a project with open to dos and a time block linked to that project
- **When** the current time enters that block
- **Then** the project's open to dos appear at the top of the display; outside the
  block they stay in the backlog.
- **And** deleting a project or a to do asks me to confirm first, and the project
  confirmation makes clear its to dos go with it.

## Epic: Reminders and timers

### US-REM1 — Nudge me at the right moment
**Covers:** FR-REM-1, FR-REM-2, FR-REM-3, FR-REM-4

- **Given** I set a reminder (absolute or "in N minutes"), optionally recurring, or
  start a Pomodoro
- **When** it fires
- **Then** the display shows a visual takeover and optionally chimes, then returns to
  the normal view.

## Epic: Notes

### US-NOTE1 — Keep context next to my plan
**Covers:** FR-NOTE-1, FR-NOTE-2

- **Given** I want to jot something down
- **When** I write a note, general or attached to a project
- **Then** it is saved and visible in the admin (and surfaced with its project where
  relevant).
- **And** deleting a note asks me to confirm first.

## Epic: Views

### US-VIEW2 — See the right horizon
**Covers:** FR-VIEW-3

- **Given** the display is running
- **When** I switch the active view from the admin
- **Then** the display shows day, week, or month as chosen.

## Epic: Non-functional

### US-NFR1 — Works even when Google is down
**Covers:** NFR-REL-1, NFR-SEC-1, NFR-PERF-1

- **Given** Google Calendar is unreachable, and I am on my Tailscale network
- **When** I use the admin and watch the display
- **Then** everything keeps working from the local database, no login is required, and
  changes still reflect within about a second.
