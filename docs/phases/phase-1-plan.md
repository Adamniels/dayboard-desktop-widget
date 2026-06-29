# Phase 1 — Google integration spine: implementation plan

Status: **proposed, awaiting Adam's approval**. This phase turns the Phase 0 scaffold into
a working product: connect Google, pull events onto the display in a weekly view, push app
edits back to Google two way, and update the display live over the WebSocket. It is the
first phase that satisfies real requirements.

Requirements covered: **FR-CAL-1..6, FR-EVT-1..2, FR-VIEW-1..2, FR-RT-1**, and **NFR-REL-1,
NFR-SEC-1, NFR-PERF-1, NFR-MAINT-1** (per `docs/roadmap.md`). Stories: US-CAL1, US-CAL2,
US-CAL3, US-EVT1, US-VIEW1, US-NFR1.

Read before implementing: `docs/ai-workflow.md` (the loop is non negotiable),
`docs/prototype-gap-analysis.md`, the prototype at `Dayboard Interactive
Prototype/Dayboard.dc.html` (the `renderVals` contract and `seedEvents` shape), and the
memory decisions `datetime-recurrence-model`, `unified-event-model`,
`google-two-way-sync-single-user`, `app-is-source-of-truth`.

---

## 1. Decisions locked for Phase 1

From the planning questions plus items deferred out of Phase 0:

1. **Calendar selection at connect time.** The connect step lists the account's Google
   calendars and Adam picks one or more to sync. Selection is stored in a new
   `google_calendar` table; each selected calendar carries its own incremental sync token.
2. **Three event types: `meeting`, `block`, `general`.** `general` is added to
   `EVENT_TYPES` and is the default applied to every event imported from Google (Google has
   no meeting/block concept). Adam retypes to `meeting` or `block` in admin. This is a
   `shared` constant plus zod change; the `type` column is plain text, so no destructive
   migration.
3. **OAuth via a one off CLI script** run once on the Mini, not an admin button. It does
   the installed app consent flow, stores the refresh token, lists calendars, and writes
   the selection. (US-CAL1 currently says "from the admin app"; see §9 doc sync — the story
   wording is reconciled to "connect via the setup script".)
4. **Recurrence is read only in v1** (FR-CAL-6). Google recurring events expand for display
   but the app rejects edits to their recurrence rule.
5. **Last write wins by timestamp** for conflicts (single user), reconciliation kept pure
   in `packages/core`.
6. **The Phase 0 purity guard and the `event type schema` test land now**, turning
   NFR-MAINT-1 and FR-EVT-2 green (they were intentionally deferred from Phase 0).

---

## 2. Schema changes and migration

One new Drizzle migration (`0001_*`) generated from the shared schema and committed. All
table definitions stay in `packages/shared/src/schema/`.

**Edit `event`** — add sync bookkeeping columns (additive, non destructive):

| field | type | purpose |
| --- | --- | --- |
| `googleEtag` | text null | Google's ETag for the event; cheap change detection |
| `lastSyncedAt` | timestamptz null | when the row was last reconciled with Google; `updatedAt > lastSyncedAt` marks a pending local push |
| `googleUpdatedAt` | timestamptz null | Google's `updated` instant at last sync; the remote side of last write wins |
| `deletedAt` | timestamptz null | soft delete tombstone so deletions propagate both ways without losing the Google link |

**Add `EVENT_TYPES = ['meeting','block','general']`** in `schema/event.ts`; update the zod
`type` enum in `wire/index.ts`. No SQL change (text column).

**New table `google_credential`** (single row, the connected account):

`id` uuid pk · `accountEmail` text not null · `refreshToken` text not null · `accessToken`
text null · `accessTokenExpiresAt` timestamptz null · `scope` text not null · `createdAt` ·
`updatedAt`. Tokens live in the DB on the Mini (single user, no public ports); `secrets/`
on disk is the alternative and is already gitignored (see §9 open item).

**New table `google_calendar`** (sync targets chosen at connect time):

`id` text pk (the Google calendar id) · `summary` text not null · `selected` boolean not
null default true · `primaryWrite` boolean not null default false (the calendar app native
events are written to; exactly one row true) · `syncToken` text null (per calendar
incremental token) · `lastSyncedAt` timestamptz null · `createdAt` · `updatedAt`.

The existing `googleCalendarId` on `event` references which calendar an event came from.

---

## 3. `packages/core` — the pure brain (no clock, no IO, no DB)

All Google reasoning is pure functions over data passed in; the api does the IO and calls
these. New dependency: **`rrule`** (pure RFC 5545 expansion, no clock/IO — allowed in
core). Each function below names the test that proves its requirement so the matcher in
`docs/verification-map.json` resolves.

**`expandOccurrences(input, window, now)` — real implementation (FR-CAL-6).** Replace the
Phase 0 stub: when `rrule` is set, build an `RRule` anchored at `start` in `timezone`,
enumerate instants within `[window.from, window.to)`, attach the event duration, then apply
`overrides` (cancel or move specific instances by `occurrenceStart`). Returns
`Occurrence[]`. Test (`packages/core/.../occurrences.test.ts`): describe/it text contains
**"recurrence expands occurrences"** (weekly rule yields the right instants; a cancelled
override removes one; a moved override shifts one).

**`nowNext(now, occurrences)` (lifted from the prototype).** Returns `{ current, next }` for
the now line and now/next card. Pure; test lives in core (no map row required, but keep it
tested).

**`reconcile(local, remote, syncToken)` (FR-CAL-3).** Pure function taking local rows and a
batch of remote (Google) changes; returns the list of upserts/deletes to apply to the DB
and the new sync token. Test text contains **"reconcile applies remote changes"**.

**`buildGooglePush(localEvent)` (FR-CAL-4).** Maps a local event to the Google API write
payload (summary, start/end with timezone, recurrence passthrough for app native events).
Test text contains **"local change produces google push"**.

**`resolveConflict(local, remote)` (FR-CAL-5).** Last write wins by comparing
`local.updatedAt` to `remote.updatedAt`; returns the winner. Test text contains **"last
write wins"**.

**Purity guard (NFR-MAINT-1).** A test that asserts `packages/core/src` imports none of
`fs`, `pg`, `drizzle-orm`, `http`, or `node:*` IO modules (scan the source files). Test text
contains **"core stays pure"**. This also keeps the ESLint boundary honest.

`surfaceTodos` stays a Phase 2 stub.

---

## 4. `apps/api` — sync engine, REST, realtime

New deps: `googleapis` (Calendar API + types) and `google-auth-library` (OAuth). These are
IO and live only in the api.

**REST endpoints** (Fastify, validated with the shared zod schemas):

- `GET /config` → `{ timezone, startHour: 7, endHour: 21 }` so the display positions
  occurrences in the Mini's timezone (see §9 timezone item).
- `GET /events?from=&to=` → expanded **occurrences** for the window. The api loads events
  overlapping the window and calls `core.expandOccurrences` per event, so the display stays
  dumb. Shape mirrors the prototype's event fields (id, title, type, start, end, projectId,
  color?).
- `POST /events`, `PATCH /events/:id`, `DELETE /events/:id` (admin CRUD, FR-EVT-1). Delete
  is soft (`deletedAt`) so the deletion can propagate to Google. Editing the recurrence of a
  Google sourced recurring event is rejected (FR-CAL-6).
- `GET /calendars` → the selected `google_calendar` rows (status display).
- `GET /sync/status` → `{ connected, lastSyncedAt }` for the prototype's sync label.

Every write (REST or sync engine) calls `broadcast` on the WebSocket hub.

**Sync engine** (`src/sync/`), a scheduler started with the server:

- **Pull**, every 30 to 60s per selected calendar (FR-CAL-3): call Google `events.list` with
  the stored `syncToken` (full list on first run, FR-CAL-2), assemble the remote batch, call
  `core.reconcile`, apply upserts/deletes to the DB, persist the new `syncToken`, set
  `lastSyncedAt`/`googleUpdatedAt`/`googleEtag` so applied rows are not seen as locally
  dirty, then `broadcast`. Google recurring masters import with their RRULE; Google
  exception instances map to `event_override` rows.
- **Push** (FR-CAL-4): find locally dirty events (`updatedAt > lastSyncedAt`, excluding
  read only Google recurring masters), call `core.buildGooglePush`, write to Google, then
  set `lastSyncedAt`/`googleEtag`. On a both sides change, `core.resolveConflict` decides
  (FR-CAL-5).
- **Loop prevention**: `lastSyncedAt` vs `updatedAt` is the dirty test; applying a remote
  change always advances `lastSyncedAt`, so it never bounces back as a push.
- **Offline (NFR-REL-1)**: Google errors are caught and logged; reads and writes keep
  working against Postgres, and the next poll resumes from the stored token.

**OAuth CLI script** `src/scripts/google-connect.ts`, run as `pnpm --filter @dayboard/api
google:connect`: runs the loopback OAuth consent (scopes
`https://www.googleapis.com/auth/calendar` for read/write plus
`calendar.calendarlist.readonly`), stores the refresh token in `google_credential`
(FR-CAL-1), lists calendars, prompts for which to sync, and writes `google_calendar` rows.

**Integration tests** (`*.api.integration.test.ts`, run on Adam's machine against the Docker
Postgres; the Google client is mocked):

- "event crud" (FR-EVT-1), "google connect stores tokens" (FR-CAL-1), "initial sync imports
  events" (FR-CAL-2), "websocket pushes change" (FR-RT-1), "works when google unreachable"
  (NFR-REL-1). Each describe/it text contains the quoted matcher substring.

A test database is created from the committed migrations before the suite (a
`db:test:setup` script); these tests are the part of `pnpm check` that needs Postgres.

---

## 5. `apps/display` — the weekly view, for real

Rebuild the prototype's display surface as React + Vite components, matching its look and
interactions (transcription, not redesign). Bind to `GET /events` occurrences and refetch on
a WebSocket message.

- **Week grid** (FR-VIEW-1): day columns Mon to Sun, hour gutter from `startHour` to
  `endHour`, events positioned from real datetimes in the configured timezone. Styling by
  type matches `evColor`: `block` teal, `meeting` accent purple, `general` a neutral tone;
  per event `color` override respected.
- **Now line + scroll to now** and the **now/next card**, driven by `core.nowNext` fed the
  real clock on the client.
- **Both orientations** (FR-VIEW-2): portrait and landscape layouts per the prototype's
  orientation aware styles. Verified manually on the 15.6" screen.
- **Live updates** (FR-RT-1): the existing `useDisplaySocket` consumes a change message and
  refetches the visible window, targeting about one second end to end (NFR-PERF-1).
- **Bucketing test** (FR-VIEW-1): a pure `buildWeek(occurrences, weekStart, tz)` util in
  `apps/display/src/` with a vitest test whose text contains **"weekly view groups events"**
  (occurrences land in the correct day column and time slot).

The day/week/month switcher and month/day views are sketched but belong to Phase 3
(FR-VIEW-3); Phase 1 ships week only, with the tab present and fixed on week.

---

## 6. `apps/admin` — event editor and connection status

- **Event editor** (FR-EVT-1/2) matching the prototype: create, edit, delete events with
  `type` (meeting/block/general), title, start/end datetimes (real, with the timezone), and
  an optional project link. Writes go through the REST API, persist, and flow to Google.
- **Recurring Google events** render read only (no recurrence editing), satisfying FR-CAL-6
  on the admin side.
- **Connection status** from `GET /sync/status` and `GET /calendars`: shows the connected
  account, selected calendars, and last sync time (the real version of the prototype's
  Google toggle and "synced 2m ago" label).

`FR-EVT-2` is proven by a `shared` test whose text contains **"event type schema"** (the zod
`type` enum accepts meeting/block/general and rejects others).

---

## 7. Verification map mapping

The Phase 1 rows already exist in `docs/verification-map.json`; implementation must produce
tests whose names match. Summary of what each row binds to:

| Req | type | test file | test name contains |
| --- | --- | --- | --- |
| FR-CAL-1 | auto+manual | api.integration | google connect stores tokens |
| FR-CAL-2 | auto | api.integration | initial sync imports events |
| FR-CAL-3 | auto | core | reconcile applies remote changes |
| FR-CAL-4 | auto | core | local change produces google push |
| FR-CAL-5 | auto | core | last write wins |
| FR-CAL-6 | auto+manual | core | recurrence expands occurrences |
| FR-EVT-1 | auto | api.integration | event crud |
| FR-EVT-2 | auto | shared | event type schema |
| FR-VIEW-1 | auto+review | display | weekly view groups events |
| FR-VIEW-2 | manual | — | portrait/landscape on the screen |
| FR-RT-1 | auto | api.integration | websocket pushes change |
| NFR-REL-1 | auto | api.integration | works when google unreachable |
| NFR-SEC-1 | review | — | Tailscale only, no public port |
| NFR-PERF-1 | manual | — | admin change visible in ~1s |
| NFR-MAINT-1 | auto | core | core stays pure |

Each slice runs `node scripts/verify-status.mjs` so the new IDs flip from NO TEST to PASS as
their tests land.

---

## 8. Vertical slice order

Per `docs/ai-workflow.md`, one requirement at a time, end to end, with its test, then
regenerate STATUS. Proposed order (dependencies first):

1. Schema + migration (general type, event columns, google tables) and the FR-EVT-2 zod test.
2. `core`: real `expandOccurrences` (FR-CAL-6) and the purity guard (NFR-MAINT-1).
3. `api`: event CRUD + WS broadcast (FR-EVT-1, FR-RT-1).
4. `display`: week view bound to `GET /events` + now line (FR-VIEW-1, FR-VIEW-2 manual).
5. `core`: `reconcile`, `buildGooglePush`, `resolveConflict` (FR-CAL-3/4/5).
6. `api`: OAuth CLI + initial import + poll/push sync engine (FR-CAL-1/2), NFR-REL-1.
7. `admin`: event editor + connection status (FR-EVT-1/2 UI), NFR-SEC-1 review.

I will implement the whole phase in this order, running `pnpm check` and the generator as I
go, then present it for your review and commit. Say the word if you would rather I stop after
each slice for a look.

---

## 9. Acceptance criteria, doc sync, and open items

**Phase 1 is done when:** `pnpm google:connect` connects an account and selects calendars;
the display shows the real weekly calendar in both orientations; creating/editing/deleting an
event in admin persists, appears on the display within about a second, and shows up in Google;
an edit made in Google appears in the app within a poll cycle; conflicting edits resolve to
the newer one; Google recurring events display correctly and cannot have their recurrence
edited; everything keeps working with Google unreachable; and `docs/STATUS.md` shows the
Phase 1 automated rows PASS with the manual/review rows listed.

**Doc sync this phase triggers** (part of the loop, not afterthoughts): add `general` to the
FR-EVT-2 wording in `docs/requirements.md`; reconcile US-CAL1 in `docs/user-stories.md` to
"connect via the setup script and pick calendars"; add the new rows to
`docs/definition-of-done.md`. `docs/verification-map.json` already has the rows.

**Resolved decisions (Adam):**

1. **Token storage** — DB table `google_credential` on the Mini (backed up with the
   database), not a file under `secrets/`.
2. **Display timezone source** — `GET /config` returns the timezone the display uses to place
   events. It comes from an optional `DISPLAY_TZ` in `.env`; when unset, the api falls back to
   the Mini's system timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). This keeps
   the wall display deterministic when set and zero config when not.
3. **Calendar write target** — app native events are written to a designated "primary write"
   calendar chosen during `google:connect` (stored as a flag on `google_calendar`).
4. **Sync interval** — poll every **45s**, as a single configurable constant.

---

**Ready for review.** Nothing is implemented; this plan is the only artifact. On your
approval (and answers to §9) I will build Phase 1 slice by slice and leave the tree
uncommitted for you to review and commit.
