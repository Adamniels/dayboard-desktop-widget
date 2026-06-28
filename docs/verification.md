# How verification works

This explains the machinery that turns "we wrote tests" into a trustworthy, generated
status. Read this if `STATUS.md` looks wrong or you are adding requirements.

## The pieces

- **`docs/verification-map.json`** — the source of truth for *which test proves which
  requirement*. You edit this by hand.
- **per-package `test-results.json`** — machine-readable test output (vitest's JSON
  reporter, or any reporter that emits the same shape). Gitignored; regenerated when
  Adam runs the suite locally. The generator reads whatever is on disk.
- **`scripts/verify-status.mjs`** — the generator. Reads the map plus every
  `test-results.json` it can find, matches requirements to tests, and rewrites
  `docs/STATUS.md`.
- **`docs/STATUS.md`** — generated output. The live answer to "what actually works".
  Never hand-edit it.

## Matching rules

Each requirement of an `auto*` type has a `testMatch`: an array of matchers. A matcher
hits a test when **both** its `file` substring appears in the test suite's file path
**and** its `name` substring appears in the test's full name (its `describe` chain plus
`it` text, space-joined). Matchers in the array are OR'd, so a requirement can be
proven by any of several tests.

## Status values in STATUS.md

- **PASS** — every matched test passed (and at least one matched).
- **FAIL** — a matched test failed.
- **NO TEST** — an `auto*` requirement matched nothing on disk. This is a *visible
  failure*, not a pass: it means the contract is unmet. (Everything reads NO TEST today
  because no code exists yet.)
- **MANUAL / REVIEW / N/A** — non-automated types; STATUS lists them so they are not
  forgotten, but they do not gate on tests.

## Running it

```bash
node scripts/verify-status.mjs       # regenerate docs/STATUS.md
node --test scripts/*.test.mjs       # the generator's own unit tests
```

Both run with plain Node — no pnpm, no Postgres — so they work in the Cowork sandbox.
The DB-backed integration tests that feed `test-results.json` run on Adam's machine via
`pnpm check`.

## When you add a requirement

1. Add it to `docs/requirements.md` and a story in `docs/user-stories.md`.
2. Add its entry (with `testMatch` for `auto*`) to `docs/verification-map.json`.
3. Write the test so the matcher resolves.
4. Regenerate STATUS.md and confirm the new ID reads PASS.
5. Add the row to `docs/definition-of-done.md`.
