# Roadmap

Phased so each stage is demonstrable on its own. Requirement IDs link to
`docs/requirements.md`.

## Design reference (read before any UI phase)

The approved interactive prototype at `Dayboard Interactive Prototype/Dayboard.dc.html`
is the canonical picture of how Dayboard should look and behave — about 80 to 90 percent
of the frontend is there. Each phase below realizes a slice of it. Before building UI,
open the prototype, match its look and interactions, and treat its `renderVals` object as
the contract for what the api must feed each screen. The full fidelity table and the
per-phase mapping live in `docs/prototype-gap-analysis.md`; the parts the prototype faked
(Google sync, realtime, the scheduler, recurrence, real datetimes) are called out per
phase below as "Builds for real". The prototype's weekday-index time shape is **not** the
schema — see `.claude/memory/decisions/datetime-recurrence-model.md`.

## Phase 0 — Foundations (before features)

Scaffold the pnpm monorepo: `packages/core`, `packages/shared`, `apps/api`,
`apps/display`, `apps/admin`. Stand up PostgreSQL + Drizzle, the test runner, and the
`pnpm check` gate. Wire the empty WebSocket channel api → display. Goal: `pnpm dev`
runs all apps and `pnpm check` is green with zero requirements yet. This is the only
phase that is plumbing rather than user-visible.

**From the prototype:** no UI yet. The key job is to define the real event schema
(absolute datetimes + timezone + recurrence) and deliberately reject the prototype's
weekday-index shape, so everything built on top binds to the right model.

## Phase 1 — Google integration spine (v1)

The real foundation Adam wants first. Connect Google, pull everything onto the display
in a weekly view, and make app edits flow back to Google (two-way). Live updates over
WebSocket. Covers **FR-CAL-1..6, FR-EVT-1..2, FR-VIEW-1..2, FR-RT-1**, and **NFR-REL-1,
NFR-SEC-1, NFR-PERF-1, NFR-MAINT-1**.

Outcome: a wall display that mirrors your Google calendar and an admin where creating an
event also creates it in Google.

**From the prototype:** realizes the calendar (week view, meeting vs block styling, the
now line, day/week/month, both orientations) and the admin event editor — match them
closely. **Builds for real** what the prototype faked: the Google toggle becomes the
actual two way sync engine, the shared in browser state becomes REST reads plus live
WebSocket push between the separate display and admin clients, and weekday indices become
real occurrences off the Phase 0 schema.

## Phase 2 — Planning layer

The things Google can't hold, layered on the spine: projects, to dos (with the
surfacing-during-a-linked-block rule), reminders and timers (incl. Pomodoro) with the
display takeover + chime, and notes. Covers **FR-PROJ-1, FR-TODO-1..2, FR-REM-1..4,
FR-NOTE-1**.

**From the prototype:** realizes the projects panel, the surfaced-todos behavior, the
reminders admin, the Pomodoro ring, the takeover overlay, and notes — all present in the
mockup. Lift the prototype's two pure rules (now/next and surfaced todos) into
`packages/core`. **Builds for real:** a reminder/timer scheduler on the Mini that fires on
the real clock, instead of the prototype's manual takeover button.

## Phase 3 — More views and polish

Daily and monthly views with admin-driven view switching, day/night dimming on the
display, and layout refinement for glanceability. Covers **FR-VIEW-3** plus polish
items added as requirements when they arise.

**From the prototype:** the day and month views and admin-driven view switching are
already sketched; make them real over live data. **Builds for real:** day/night dimming
and polish the prototype does not cover.

## Phase 4 — AI inside the product (future work, not scoped yet)

Natural-language control of the app: "block out my afternoon for deep work", "what's my
next free hour", spoken or typed, with an LLM tool layer calling the api's typed write
operations. Deliberately deferred — but Phase 0–1 architecture keeps api writes clean
and well-typed so this stays cheap to add later. No requirements are written for this
yet; they will be when the phase begins.

## Working order within a phase

Per `docs/ai-workflow.md`: one requirement at a time, as a vertical slice, with its
test, then regenerate STATUS.md. Don't batch many half-finished slices.
