# Dayboard (working name) — Project Context

> Project-level context for Claude. This stacks on top of the global
> `~/.claude/CLAUDE.md`; it does not replace it. Keep this file tight: durable detail
> belongs in `.claude/memory/`, not here.

@memory/MEMORY.md

## What this project is

A self hosted calendar and planning display. A Mac Mini is the whole brain: it runs
the backend, owns the database, syncs two ways with Google Calendar, and serves two
web frontends. An always on 15.6 inch screen shows the **display** (kiosk, read only,
never touched). Adam controls everything from the **admin** web app on his main
computer, reached over Tailscale. The app is the source of truth; Google Calendar is
a mirror so plans survive away from the desk.

## Architecture

pnpm monorepo. `packages/core` holds pure domain logic (no clock, no IO): reminder
scheduling math, recurrence handling, the rule that surfaces a project's open to dos
while you are inside a linked time block. `packages/shared` holds types and zod
schemas shared across the wire. `apps/api` is the Node backend on the Mini: REST plus
a WebSocket channel that pushes live updates to the display, a Google Calendar sync
engine (incremental sync token, polling in v1), and a reminder/timer scheduler;
PostgreSQL via Drizzle. `apps/display` is the React kiosk frontend (FullCalendar,
multiple views). `apps/admin` is the React control frontend. The display and admin
never talk to each other; both talk only to the api. See
`.claude/memory/decisions/` for the why behind each of these and `docs/architecture.md`
for the full picture.

## Design reference

The approved interactive prototype at `Dayboard Interactive Prototype/Dayboard.dc.html`
is the canonical picture of how Dayboard should look and behave (about 80–90% of the
frontend). Before building any UI, open it and match its look and interactions, and treat
its `renderVals` object as the contract for what the api feeds each screen. What the
prototype faked (Google sync, realtime, the scheduler, recurrence, real datetimes) and the
per-phase mapping are in `docs/prototype-gap-analysis.md`. The prototype's weekday-index
time shape is NOT the schema — see `.claude/memory/decisions/datetime-recurrence-model.md`.

## Key commands

- Install: `pnpm install`
- Dev (all apps): `pnpm dev`
- Test + typecheck (the gate): `pnpm check`
- Regenerate status doc: `node scripts/verify-status.mjs`
- Status generator self tests: `node --test scripts/*.test.mjs`

(Code is not scaffolded yet — these are the agreed commands the first feature should
honor. Keep them stable so the AI workflow stays predictable.)

## Constraints and conventions

- **Spec driven.** Every feature maps to a requirement ID and a passing test before it
  is "done". The flow is in `docs/ai-workflow.md`; the rules are non negotiable.
- **`packages/core` stays pure** — no Date.now(), no network, no DB. Pass time and data
  in. This is what makes the brain testable.
- **Single user, last write wins** for Google sync. Do not build multi user conflict
  machinery.
- **`docs/STATUS.md` is generated** — never hand edit it. Change
  `docs/verification-map.json` and rerun the generator.
- **Leave changes uncommitted.** Adam reviews and commits himself.
- Detail and rationale live in `.claude/memory/conventions/` and `decisions/`.

## Delegated tickets (Claude Dispatch)

This Mac Mini already runs Dayboard in **production** (`dayboard-prod-*` containers,
`docs/DEPLOY-RUNBOOK.md`) as well as being where delegated Claude Code work happens.
For a ticket dispatched from mobile, use the `implement-ticket` skill
(`.claude/skills/implement-ticket/SKILL.md`); it runs a lead → verifier → reviewer
(→ ui-reviewer for visible changes) pipeline, sequential only, no agent teams. Full
rationale: `docs/agent-workflow.md` and
`.claude/memory/decisions/delegated-ticket-workflow.md`. This is separate from the
`FR-*`/`NFR-*` feature loop above — a feature-shaped ticket still goes through that loop
as one step; a small fix does not need a requirement ID.

**Ask Adam first, always, regardless of what a ticket authorizes:** dependency changes,
architectural decisions, schema/data changes, auth/secret/permission changes, scope
expansion beyond the ticket, deletions, infrastructure changes, and anything with an
external side effect — most importantly, any `docker compose ... up/restart/down`
against the live `dayboard-prod-*` stack. Commit, push, and draft-PR only when the
specific ticket explicitly grants it. **Never merge or deploy** — that stays Adam-only
in every case.

**Never read or print** `.env*`, `secrets/`, or anything else covered by those
`.gitignore` rules, beyond confirming a variable name exists if strictly necessary.

A delegated ticket is done when: its acceptance criteria are met with evidence (not a
summary), it stayed in scope, the verifier concluded `VERIFIED`, the reviewer concluded
`APPROVE`, and nothing was committed/pushed/merged/deployed beyond what was authorized.
This is a different bar than the FR/NFR "definition of done"
(`docs/definition-of-done.md`), which is the traceability matrix for spec'd features —
use whichever applies to the ticket at hand.

## How memory works here

Durable knowledge for this project lives in `.claude/memory/` and is committed to git,
so it syncs across machines. When you learn something that should outlive this session
— a decision and its rationale, a convention, or a non-obvious domain fact — write it
as a file under the matching category and add a pointer line to `memory/MEMORY.md`.
Read a linked memory file when its topic is relevant.
