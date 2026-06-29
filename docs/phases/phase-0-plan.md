# Phase 0 — Foundations: implementation plan

Status: **proposed, awaiting Adam's approval**. This is plumbing only. No feature code,
no business logic beyond a minimal `expandOccurrences` with one smoke test. Phase 0 adds
**zero requirements**; `docs/STATUS.md` should stay almost entirely `NO TEST`, which is
correct (Phase 1 features are not built).

Goal restated: `pnpm dev` runs all five workspaces, `pnpm check` is green, the shared
schema and a Docker Postgres exist and migrate, the empty api to display WebSocket
connects, and `node scripts/verify-status.mjs` still regenerates `docs/STATUS.md`.

Read before implementing: `docs/ai-workflow.md`, `.claude/CLAUDE.md`,
`.claude/memory/decisions/datetime-recurrence-model.md`,
`.claude/memory/decisions/unified-event-model.md`, `docs/prototype-gap-analysis.md`.

---

## 1. Monorepo layout

A pnpm workspace monorepo. Two shared packages, three apps. Nothing here imports a
sibling's source directly; everything goes through the package's public entry.

```
calender-desktop-widget/
  package.json                 # root: workspace scripts, devDeps shared by all
  pnpm-workspace.yaml          # packages: "packages/*", "apps/*"
  tsconfig.base.json           # strict base config, extended by every package
  .nvmrc                       # pins Node major
  .env.example                 # committed; real .env is gitignored
  docker-compose.yml           # Postgres service
  packages/
    shared/                    # types + zod + Drizzle table definitions (the wire + DB contract)
    core/                      # pure domain logic (no clock, no IO, no DB)
  apps/
    api/                       # Node backend: REST stub, WebSocket hub, Drizzle, migrations
    display/                   # React + Vite kiosk (read only); connects the WS in Phase 0
    admin/                     # React + Vite control surface (shell only in Phase 0)
  docs/  scripts/  .claude/    # already exist
```

What each contains at the end of Phase 0:

- **`packages/shared`** — the single source of truth for data shape. Drizzle table
  definitions (`src/schema/*.ts`), zod schemas derived from them via `drizzle-zod` plus
  hand refined wire schemas (`src/wire/*.ts`), and the shared TypeScript types they infer.
  Exports a barrel `src/index.ts`. No runtime side effects. Both `apps/api` (for Drizzle
  and validation) and the React apps (for wire types) depend on it.
- **`packages/core`** — pure functions only. Ships `expandOccurrences` (minimal, one
  test) plus **type only** signatures for the now/next and surfaced todos rules that get
  lifted from the prototype in later phases. Imports types from `shared`, nothing else.
  A purity boundary is enforced by lint config (see §5); the runtime purity guard test is
  deferred to Phase 1 (decision 3).
- **`apps/api`** — a minimal Fastify server: a `GET /health` route, a `GET /ws` WebSocket
  endpoint that accepts a connection and does nothing else, a Drizzle client wired to
  `DATABASE_URL`, the `drizzle.config.ts`, and the generated migration for the Phase 0
  schema. No business endpoints yet.
- **`apps/display`** — a Vite React app that renders a placeholder screen and opens a
  WebSocket to the api to prove the channel (logs "connected"). No calendar UI in Phase 0
  (the prototype is realized starting Phase 1).
- **`apps/admin`** — a Vite React app shell (placeholder page). No editor yet.

---

## 2. Tooling and versions

Pinned, concrete versions. Treat these as the lockfile target; patch drift is fine.

Runtime and workspace:

- **Node 22 LTS** (`.nvmrc` = `22`, root `engines.node` = `>=22 <23`).
- **pnpm 10.x** (root `packageManager` field pins the exact version for reproducibility).
- **TypeScript 5.8.x**, `strict: true`, `moduleResolution: "bundler"` in the base config;
  apps override `module`/`moduleResolution` as their toolchain needs.

Per package dev dependencies (the concrete set):

**Root** (`package.json`, devDeps shared via workspace):
- `typescript`, `@types/node`, `vitest`, `eslint` + `@typescript-eslint/*`, `prettier`.

**`packages/shared`**:
- deps: `zod`, `drizzle-orm`, `drizzle-zod`.
- devDeps: `vitest`, `typescript` (inherits root config).

**`packages/core`**:
- deps: `@dayboard/shared` (workspace:*). Recurrence expansion library `rrule` is added
  **in Phase 1** when real expansion lands; Phase 0's minimal path needs no library. The
  RRULE string serialization is fixed now (decision 4) so the schema is stable.
- devDeps: `vitest`, `typescript`.

**`apps/api`**:
- deps: `@dayboard/shared`, `@dayboard/core`, `fastify`, `@fastify/websocket`,
  `drizzle-orm`, `pg`, `dotenv`.
- devDeps: `drizzle-kit`, `@types/pg`, `vitest`, `tsx` (dev runner), `typescript`.

**`apps/display`** and **`apps/admin`** (identical toolchain):
- deps: `react`, `react-dom`, `@dayboard/shared`.
- devDeps: `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`,
  `vitest`, `jsdom`, `typescript`.
- FullCalendar is **not** added in Phase 0; it arrives with the Phase 1 week view.

Workspace internal names: `@dayboard/shared`, `@dayboard/core`, `@dayboard/api`,
`@dayboard/display`, `@dayboard/admin`, referenced as `workspace:*`.

---

## 3. Postgres via Docker

Postgres runs locally through Docker Compose, never a native install (per Adam's rule and
`postgresql-over-sqlite`). The sandbox has no Postgres, so DB backed tests run on Adam's
machine; Phase 0 only needs the container to come up and one migration to apply.

`docker-compose.yml` defines one service:

```yaml
services:
  db:
    image: postgres:16
    container_name: dayboard-db
    environment:
      POSTGRES_USER: dayboard
      POSTGRES_PASSWORD: dayboard
      POSTGRES_DB: dayboard
    ports:
      - "5432:5432"
    volumes:
      - dayboard-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dayboard"]
      interval: 5s
      timeout: 3s
      retries: 10
volumes:
  dayboard-pgdata:
```

Connection and config:

- The api reads `DATABASE_URL` from `.env` via `dotenv`. `.env` is gitignored;
  `.env.example` is committed with:
  ```
  DATABASE_URL=postgres://dayboard:dayboard@localhost:5432/dayboard
  ```
- `apps/api/drizzle.config.ts` points `schema` at the shared table definitions
  (`../../packages/shared/src/schema/*.ts`), `out` at `apps/api/drizzle/`, dialect
  `postgresql`, and reads `DATABASE_URL` from the environment.

Migration workflow (documented in the api README and the root scripts):

1. `docker compose up -d db` — start Postgres.
2. `pnpm --filter @dayboard/api db:generate` — `drizzle-kit generate` emits SQL migrations
   into `apps/api/drizzle/` from the shared schema. The Phase 0 migration (all tables) is
   generated and **committed**.
3. `pnpm --filter @dayboard/api db:migrate` — `drizzle-kit migrate` applies them.
4. `pnpm --filter @dayboard/api db:studio` — optional Drizzle Studio for inspection.

Migrations are committed so the schema history is reproducible; the database volume is not.

---

## 4. The shared schema (`packages/shared`)

Drizzle tables define the database; `drizzle-zod` derives insert/select zod schemas from
them; hand refined wire schemas sit on top for validation that crosses the network. The
**event time model is absolute datetimes plus an IANA timezone plus a recurrence rule**;
the prototype's weekday index shape is explicitly rejected
(`datetime-recurrence-model.md`).

### Event (unified, one table with a `type`)

| field | type | notes |
| --- | --- | --- |
| `id` | uuid pk | generated |
| `title` | text not null | |
| `description` | text null | |
| `type` | text not null | enum check: `'meeting' \| 'block'`; extend via this field, never new tables |
| `start` | timestamptz not null | absolute instant (UTC stored); the recurrence DTSTART anchor |
| `end` | timestamptz not null | absolute instant; duration = end − start |
| `timezone` | text not null | IANA, e.g. `America/Denver`; the wall clock zone for expansion and display |
| `allDay` | boolean not null default false | for Google all day events |
| `recurrence` | text null | RFC 5545 RRULE string (e.g. `FREQ=WEEKLY;BYDAY=MO`); null = single occurrence (decision 4) |
| `googleEventId` | text null unique | mirror link; null for app native events |
| `googleCalendarId` | text null | which Google calendar it came from (sync bookkeeping) |
| `projectId` | uuid null fk → project.id | optional link that drives todo surfacing |
| `createdAt` | timestamptz not null default now | |
| `updatedAt` | timestamptz not null default now | drives last write wins for Google sync |

### EventOverride (recurrence exceptions)

Recurrence is the rule on the master Event; a moved or cancelled instance is a row here,
keyed by the original occurrence instant (the RFC 5545 `RECURRENCE-ID`). `expandOccurrences`
applies these on top of the expanded series.

| field | type | notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `eventId` | uuid not null fk → event.id | the recurring master |
| `occurrenceStart` | timestamptz not null | identifies which occurrence (its original start) |
| `cancelled` | boolean not null default false | true = this instance removed |
| `start` | timestamptz null | overridden start (null = unchanged) |
| `end` | timestamptz null | overridden end |
| `title` | text null | per instance override |
| `description` | text null | per instance override |
| `createdAt`/`updatedAt` | timestamptz | |
| | | unique on (`eventId`, `occurrenceStart`) |

### Project

`id` uuid pk · `name` text not null · `color` text null · `archived` boolean default
false · `createdAt`/`updatedAt`.

### Todo

`id` uuid pk · `projectId` uuid not null fk → project.id · `title` text not null ·
`status` text not null (check `'open' | 'in_progress' | 'done'`) · `dueAt` timestamptz
null · `completedAt` timestamptz null · `createdAt`/`updatedAt`. Todos belong to projects,
not to events (`unified-event-model`); surfacing is computed at read time in `core`.

### Reminder (schema only; scheduler is Phase 2)

`id` uuid pk · `title` text not null · `kind` text not null (check `'absolute' |
'relative'`) · `fireAt` timestamptz null (absolute kind) · `offsetMinutes` integer null
(relative kind, e.g. Pomodoro) · `recurrence` text null (RRULE) · `chime` boolean default
false · `projectId` uuid null fk → project.id · `createdAt`/`updatedAt`.

### Note

`id` uuid pk · `body` text not null · `projectId` uuid null fk → project.id (null =
general) · `createdAt`/`updatedAt`.

### How recurrence and overrides are represented (summary)

A single event has `recurrence = null` and no override rows. A recurring event carries an
RRULE string anchored at `start` in `timezone`; `core` expands it across a query window,
then applies any `EventOverride` rows (cancel or move specific instances). v1 syncs Google
recurring events read only, matching `FR-CAL-6`, so app side recurrence editing is not
built yet; the schema simply needs to store and round trip the rule.

---

## 5. `packages/core` (pure)

No `Date.now()`, no IO, no DB; time and data are arguments (`core-stays-pure`). Phase 0
ships exactly one working function plus type only contracts.

`expandOccurrences` — the only function with a body and a test in Phase 0:

```ts
export interface RecurrenceInput {
  start: Date;            // DTSTART instant
  end: Date;              // gives the occurrence duration
  timezone: string;       // IANA, e.g. "America/Denver"
  rrule: string | null;   // RFC 5545 RRULE; null = single occurrence
  overrides?: OccurrenceOverride[];
}
export interface Window { from: Date; to: Date }
export interface Occurrence { start: Date; end: Date; isOverride: boolean; cancelled: boolean }

export function expandOccurrences(
  input: RecurrenceInput,
  window: Window,
  now: Date,            // passed in, never read from the system clock
): Occurrence[];
```

Phase 0 implementation is deliberately minimal: when `rrule` is null, return the single
occurrence if it overlaps `window`, else an empty array; throw a clear "recurrence
expansion lands in Phase 1" error for a non null `rrule`. The `now` parameter is part of
the settled contract (`datetime-recurrence-model.md`) and is wired through even though the
minimal path does not branch on it yet. Real RRULE expansion (via the `rrule` library) and
override application arrive in Phase 1 under `FR-CAL-6`.

**One test** (`packages/core/src/occurrences.test.ts`): a single non recurring event whose
window overlaps returns exactly one occurrence with the right start/end; a window that does
not overlap returns none. The test name is chosen to **not** match any matcher in
`docs/verification-map.json` (it must not contain the phrase "recurrence expands
occurrences", which belongs to `FR-CAL-6`). Proposed name:
`"expandOccurrences smoke: single non recurring event maps to one occurrence in window"`.
This keeps STATUS honest: Phase 0 satisfies no requirement.

Type only signatures (no bodies, no tests, so they cannot accidentally satisfy a
requirement) for the rules lifted later from the prototype's `renderVals`:

```ts
// Phase 2 (FR-TODO-2): surface a linked project's open todos when now is inside its block.
export function surfaceTodos(now: Date, events: EventOccurrence[], todos: Todo[]): Todo[];
// Phase 1/2: the now line + now/next card derivation.
export function nowNext(now: Date, occurrences: Occurrence[]): { current: Occurrence | null; next: Occurrence | null };
```

These ship as declared signatures with a `throw new Error("not implemented until Phase N")`
body so types compile but no behavior is claimed. Purity is guarded structurally by an
ESLint rule banning `Date.now`, `fs`, `pg`, and network imports inside `packages/core`; the
runtime purity guard test that would satisfy `NFR-MAINT-1` is deferred to Phase 1
(decision 3).

---

## 6. The empty WebSocket channel (api → display)

Connection only. In `apps/api`, register `@fastify/websocket` and expose `GET /ws`. On
connect the server holds the socket in an in memory set and logs the connection; it pushes
nothing (the real broadcast on data change is `FR-RT-1`, Phase 1). `apps/display` opens a
`WebSocket` to `ws://localhost:<port>/ws` on mount, logs open/close, and retries on close
with a simple backoff. Proving Phase 0 means: start the api, load the display, see
"connected" on both sides. No message schema, no broadcast, no reconnect storm handling
beyond a basic delay.

---

## 7. Scripts and the verification wiring

Root `package.json` scripts (pnpm recursive, no extra task runner; decision 6):

- `pnpm install` — installs the workspace; `packageManager` pins pnpm.
- `pnpm dev` → `pnpm -r --parallel run dev`. Each app defines `dev`: api runs
  `tsx watch src/server.ts`, display and admin run `vite`. The two shared packages need no
  dev server (consumed as source/types).
- `pnpm check` → the gate: `pnpm -r run typecheck && pnpm -r run test`. `typecheck` is
  `tsc --noEmit` per package. `test` is `vitest run` per package.
- `pnpm gen:status` → `node scripts/verify-status.mjs` (regenerates `docs/STATUS.md`).
- `pnpm test:gen` → `node --test scripts/*.test.mjs` (the generator's own unit tests).

How vitest feeds the existing generator: each package's `vitest.config.ts` sets
`reporters: ['default', 'json']` with `outputFile: './test-results.json'`. After
`pnpm check`, every package has a `test-results.json` at its root (gitignored per the
existing `.gitignore`). `scripts/verify-status.mjs` already walks the tree for files named
`test-results.json` (skipping `node_modules`, `.git`, `dist`), reads each suite's `name`
(the absolute test file path) and its assertions, and matches them against
`verification-map.json`. The matchers key on path substrings, so the test file **naming
convention** matters and is fixed now:

- `packages/core/**/*.test.ts` → path contains `core` (matches `{ "file": "core" }`).
- `packages/shared/**/*.test.ts` → path contains `shared`.
- `apps/display/**/*.test.ts` → path contains `display`.
- api integration suites are named `*.api.integration.test.ts` so the path contains
  `api.integration` (matches the `FR-*` integration rows).

No generator code changes are needed; Phase 0 only has to produce `test-results.json` in
the right shape, which vitest's JSON reporter (jest compatible: `testResults[].name` +
`assertionResults[]`) already does. Sandbox note: `pnpm gen:status` and `pnpm test:gen`
run on plain Node with no Postgres, so they work here; the DB backed integration suites run
on Adam's machine.

---

## 8. Phase 0 acceptance criteria

Phase 0 is done when all of these hold:

1. `pnpm install` succeeds against the committed `pnpm-lock.yaml`.
2. `pnpm dev` starts all five workspaces: api (Fastify, `GET /health` returns ok, `/ws`
   accepts a socket), display and admin Vite dev servers, with shared and core compiling.
3. `pnpm check` is green: every package typechecks (`tsc --noEmit`) and `vitest run`
   passes, with the single core smoke test passing and each package emitting a
   `test-results.json`.
4. The display connects to the api WebSocket and both sides log the connection.
5. `docker compose up -d db` brings Postgres up healthy; `db:generate` produces the
   committed Phase 0 migration and `db:migrate` applies all tables cleanly to an empty
   database.
6. The shared schema exists: Drizzle tables for Event, EventOverride, Project, Todo,
   Reminder, Note, plus their derived zod schemas, exported from `@dayboard/shared`.
7. `node scripts/verify-status.mjs` regenerates `docs/STATUS.md` and the result is
   essentially unchanged from today: every automated requirement reads `NO TEST`
   (a correct gap, since no Phase 1 feature exists), manual/review rows unchanged. The
   core smoke test does **not** flip any requirement green.
8. `node --test scripts/*.test.mjs` passes (generator self tests still clean).
9. The working tree is left **uncommitted** for Adam to review and commit.

---

## 9. Decisions (resolved)

All eight are locked to the recommended defaults; the plan above reflects them.

1. **api framework — Fastify** + `@fastify/websocket`. Clean TypeScript, plugin model,
   straightforward `/ws`.
2. **Node version — Node 22 LTS.** `.nvmrc` = `22`, `engines.node` = `>=22 <23`.
3. **Requirement free Phase 0.** Phase 0 satisfies **no** requirement; STATUS stays all
   `NO TEST`. The `core` purity guard (`NFR-MAINT-1`) and the `event type schema` test
   (`FR-EVT-2`) are deferred to their feature phases.
4. **Recurrence serialization — RFC 5545 RRULE string** in the `recurrence` column; the
   `rrule` library is adopted in Phase 1 for expansion.
5. **Build all planning tables now.** Event, EventOverride, Project, Todo, Reminder, Note
   are all created in the Phase 0 migration (schema only, no endpoints) so later phases add
   no destructive migration.
6. **Task runner — plain pnpm recursive** (`-r --parallel`). Turborepo can be added later
   for caching if dev start gets slow.
7. **Event time fields — absolute `timestamptz` (UTC) `start`/`end` plus an IANA
   `timezone` string plus an `allDay` flag.**
8. **zod via `drizzle-zod`** derived from the Drizzle tables, with refined wire schemas on
   top.

---

**Ready for review.** Nothing is implemented; this plan is the only artifact, with all
decisions resolved. On your approval the build is mechanical, and I will leave the tree
uncommitted.
