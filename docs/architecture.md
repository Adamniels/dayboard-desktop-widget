# Architecture

## One-paragraph shape

A Mac Mini hosts the whole system. `apps/api` (Node + TypeScript) owns a PostgreSQL
database, runs a Google Calendar sync engine and a reminder/timer scheduler, exposes a
REST API, and pushes live updates over a WebSocket. Two React frontends consume it:
`apps/display` (the always-on kiosk on a 15.6" screen, read only) and `apps/admin` (the
control surface on Adam's main computer, reached over Tailscale). Pure domain logic
lives in `packages/core`; shared types and zod schemas in `packages/shared`. The
display and admin never talk to each other — both talk only to the api.

## Components

```
                        Mac Mini (the brain)
   ┌───────────────────────────────────────────────────────────┐
   │  apps/api  (Node, TypeScript)                              │
   │   ├─ REST endpoints (CRUD: events, projects, todos, ...)   │
   │   ├─ WebSocket hub  ── live push ─────────────┐            │
   │   ├─ Google sync engine (sync token, poll)    │            │
   │   ├─ Reminder/timer scheduler                 │            │
   │   └─ Drizzle ─► PostgreSQL                     │            │
   │            ▲                                   │            │
   │            │ uses                              │            │
   │   packages/core  (pure logic)                 │            │
   │   packages/shared (types + zod)               │            │
   └────────────┼──────────────────────────────────┼───────────┘
                │ REST                              │ WS (live)
        ┌───────┴────────┐                  ┌───────┴─────────┐
        │  apps/admin    │                  │  apps/display   │
        │ (main computer │                  │ (kiosk, 15.6",  │
        │  via Tailscale)│                  │  always on)     │
        └────────────────┘                  └─────────────────┘
                │                                   ▲
                └──────── writes flow api ──────────┘
                         ▲
                         │ two-way sync
                  ┌──────┴───────┐
                  │ Google Calendar │  (mirror, not master)
                  └────────────────┘
```

## Data flow

- **Adam edits in admin** → REST call to api → DB write → api pushes the change over
  WebSocket → display updates instantly → sync engine pushes the change to Google.
- **Adam edits in Google (phone)** → sync engine pulls via incremental sync token
  (polled every 30–60s in v1) → DB reconciled (last-write-wins) → WebSocket push →
  display updates.
- **A reminder/timer fires** → scheduler emits → WebSocket push → display shows a
  visual takeover plus optional chime.

## Data model (entities)

See `.claude/memory/decisions/unified-event-model.md` for the authoritative version.
Event (unified, `type`, optional `googleEventId`, optional `projectId`) · Project ·
Todo (belongs to Project, surfaces during a linked time block) · Reminder
(absolute/relative time, optional recurrence) · Note (general or project-linked) ·
DisplaySetting (singleton row holding the admin-chosen active view: day, week, or month;
migration 0003).

## Frontend structure

Both React apps use inline styles that read a shared token module per app
(`apps/display/src/theme.ts`, `apps/admin/src/theme.ts`: colors, spacing, radii, type,
and `hexA`), all lifted from the approved prototype so the look changes in one place.

The **display** composes a presentational `DisplayShell` (kiosk clock header, status pill,
framed calendar card, side panel) around one of `WeekView` / `DayView` / `MonthView`,
chosen by `config.activeView`. Pure view bucketing (`buildWeek`, `buildDay`, `buildMonth`,
`tzDateKey`, `nowScrollTop`) lives in `apps/display/src` and is unit tested; the components only
turn the buckets into pixels. The day and week grids span the full 00:00–24:00 day and scroll to
keep the now line centered, clamped so the window never runs past midnight or the end of day
(`nowScrollTop` + the `useNowScroll` hook); the month view is unaffected. `App` fetches per-view windows and re-renders on the `display.changed`
WebSocket message so an admin view switch propagates within about a second.

The **admin** is the dark "Control Room": a sidebar (Calendar, Projects, Reminders &
timers, Notes, Display & sync) over tab components that drive the REST API. The
Display & sync tab holds the active-view switcher (`GET`/`PATCH /display`) and the Google
sync status. The Calendar tab is an interactive weekly grid built on **FullCalendar**
(timeGrid week + interaction, the free MIT plugins): drag to create (which prefills the side
editor), click to edit, and drag to move or resize, with the browser-free mapping and patch
logic in `apps/admin/src/calendar-model.ts` (unit tested, FR-EVT-3). It shows the full 24-hour
day, unlike the display's glanceable 07:00–21:00 window.

## Deployment

Mac Mini runs the api and Postgres as long-lived services (launchd or pm2 + a local
Postgres via Docker or native). The display is a fullscreen Chromium kiosk pointed at
the display app. Remote admin access is via Tailscale; no public ports. Google push
webhooks (needing a public HTTPS endpoint, e.g. Tailscale Funnel) are a later upgrade
from v1 polling.

## Key boundaries (why they exist)

- **core is pure** so the brain is deterministic and testable without a DB — keeps the
  AI loop fast.
- **api is the only writer** so display and admin stay dumb and consistent.
- **app DB is the source of truth**, Google a mirror — lets the product stand alone
  while still backing up to the phone.
