# How AI works in this project

This is the most important document in the repo. It defines how an AI agent (and Adam)
build features here. The goal Adam set: move faster with less line-by-line checking by
trusting **specs and tests** instead. Everything below exists to make that trust
earned.

Read this first. Then `.claude/CLAUDE.md` and `.claude/memory/MEMORY.md` give you the
project's decisions and rules.

## The core idea

A feature is not "I wrote some code". A feature is:

> a **requirement** with an ID, described by a **user story**, proven by a **passing
> test**, and reflected in the generated **STATUS.md**.

If those four things exist and agree, the feature is done and trustworthy. If any is
missing, it is not done — no matter how good the code looks. This is what lets Adam
review a diff plus a green test run rather than auditing every line.

## The loop (run this for every feature)

1. **Frame the requirement.** Pick the area prefix (`FR-CAL`, `FR-EVT`, `FR-PROJ`,
   `FR-TODO`, `FR-REM`, `FR-NOTE`, `FR-VIEW`, `FR-RT`, or an `NFR-*` — see
   `.claude/memory/context/requirement-id-scheme.md`) and the next number. One feature
   often splits into several requirements (a server rule, a data rule, a UI rule).
   Add them to `docs/requirements.md` in "shall" wording.

2. **Write the story.** Add or extend a `US-*` story in `docs/user-stories.md` with
   Given/When/Then acceptance criteria and a `Covers:` line listing the requirement
   IDs.

3. **Build a vertical slice.** Implement end to end — schema → api → display/admin —
   for that one requirement, not a horizontal layer. Keep the brain rules (scheduling,
   recurrence, todo surfacing) in `packages/core` as **pure functions** (no clock, no
   IO; time and data are passed in). See
   `.claude/memory/conventions/core-stays-pure.md`. **If the slice has UI**, open the
   approved prototype (`Dayboard Interactive Prototype/Dayboard.dc.html`) first and match
   its look and interactions; its `renderVals` object is the contract for what the api
   must feed the screen. See `docs/prototype-gap-analysis.md` for what is real vs faked
   and which phase owns each part.

4. **Prove it with tests.** Write the test(s) that demonstrate the requirement: core
   unit tests in `packages/*/src/*.test.ts`, api behavior in integration tests. Every
   `auto*` requirement must resolve to a real passing test.

5. **Update the verification map.** Add one entry per requirement to
   `docs/verification-map.json` with a `testMatch` (file/name substrings), a
   human-readable `verify` string, the `story` id, and a `type`. Validate the JSON.

6. **Regenerate status.** Run `node scripts/verify-status.mjs`. It reads the map plus
   each package's `test-results.json` and rewrites `docs/STATUS.md`. Then run the
   generator's own tests: `node --test scripts/*.test.mjs`. Both must be clean and the
   new IDs must appear green in STATUS.md.

7. **Update the definition of done.** Add the requirement rows to
   `docs/definition-of-done.md` (the traceability matrix). Status column stays `Todo`
   there — STATUS.md is the live truth.

8. **Report and stop.** Give Adam a short numbered recap: requirement IDs and story
   added, which tests already existed vs. were **written because they were missing**,
   that STATUS.md was regenerated, and a reminder that changes are **uncommitted** and
   he should run `pnpm check` locally (Postgres up) as the final gate. Do not commit.

## Hard rules (do not violate)

- `packages/core` stays pure. If logic needs "now", it takes a `now: Date` argument.
- Every `auto*` requirement maps to a real passing test. `No matching test` in
  STATUS.md is a failure, not a pass.
- `docs/STATUS.md` is generated. Never hand edit it.
- Leave the working tree uncommitted. Adam reviews and commits.
- Single user, last-write-wins for Google sync. Do not add multi-user conflict logic.

## Why the sandbox can't be the final gate

The Cowork Linux sandbox has no Postgres and (initially) no pnpm. So the DB-backed
integration suite and full `pnpm check` run on **Adam's machine**, not here. That is
exactly why `packages/core` is pure: the hardest logic is unit-testable in the sandbox
with `node --test` / vitest and needs no database. In the sandbox you can run pure-Node
things (the generator, its tests, core unit tests); rely on the on-disk green
`test-results.json` for the DB-backed parts.

## Starting a feature

Use the `/new-feature` command (`.claude/commands/new-feature.md`) — it walks this loop
and points at the right files. Use the `feature-builder` agent
(`.claude/agents/feature-builder.md`) to implement a slice, the `spec-syncer` agent
(`.claude/agents/spec-syncer.md`) to bring the docs back in line after code lands, and
the `code-reviewer` agent before you consider a slice done.

## Where the AI runs *inside* the product (future)

Adam wants a future where you can tell the display things in natural language ("block
out my afternoon for deep work") and have the app act. That is **Phase 4** in
`docs/roadmap.md` and deliberately out of scope now, but the early architecture should
not block it: keep the api's write operations clean and well typed so an LLM tool layer
can call them later.
