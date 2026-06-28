# Dayboard (working name)

A self hosted calendar and planning display. A Mac Mini is the whole brain — it runs
the backend, owns the database, syncs two ways with Google Calendar, and serves two web
frontends. An always on 15.6" screen shows the **display** (a read only kiosk, never
touched). Everything is controlled from the **admin** web app on the main computer, over
Tailscale. The app is the source of truth; Google Calendar is a mirror so plans follow
you to your phone.

> Name is provisional — rename freely.

## Status

Specs and the AI workflow are set up; no application code yet. Phase 0 (monorepo
scaffold) is the next step. Live build status is in [`docs/STATUS.md`](docs/STATUS.md)
(generated).

## How this repo is meant to be built

This is a spec-driven project built largely by an AI agent. Start here:

- **[docs/ai-workflow.md](docs/ai-workflow.md)** — how features get built (read first).
- **[docs/architecture.md](docs/architecture.md)** — system shape and boundaries.
- **[docs/requirements.md](docs/requirements.md)** — what it shall do (`FR-*` / `NFR-*`).
- **[docs/user-stories.md](docs/user-stories.md)** — stories with acceptance criteria.
- **[docs/definition-of-done.md](docs/definition-of-done.md)** — traceability matrix.
- **[docs/verification.md](docs/verification.md)** — how STATUS.md is generated.
- **[docs/roadmap.md](docs/roadmap.md)** — phased plan.

Project memory and conventions live in [`.claude/`](.claude/) and travel with the repo
through git, so moving between machines is just `git pull`. `.claude/CLAUDE.md` is the
entry point.

## Planned stack

TypeScript pnpm monorepo. `apps/api` (Node, PostgreSQL via Drizzle, REST + WebSocket,
Google sync engine, reminder scheduler), `apps/display` and `apps/admin` (React + Vite,
FullCalendar), `packages/core` (pure domain logic), `packages/shared` (types + zod).

## Commands (once code exists)

```bash
pnpm install                     # install
pnpm dev                         # run all apps
pnpm check                       # tests + typecheck — the gate (needs Postgres)
node scripts/verify-status.mjs   # regenerate docs/STATUS.md
node --test scripts/*.test.mjs   # status generator self-tests
```

The status generator and its tests run with plain Node, no database — they work
anywhere. The DB-backed suite runs locally with Postgres up.
