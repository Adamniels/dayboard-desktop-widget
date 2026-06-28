---
name: leave-changes-uncommitted
description: Make edits but leave them uncommitted; Adam reviews and commits
type: convention
---

Make all edits but do not stage, commit, or push. Adam reviews the working tree and
commits himself. The final gate is `pnpm check` run locally with Postgres up, since
the Cowork sandbox has no Postgres and cannot run the DB-backed suite.

**Why:** Adam wants to learn the workflow and keep control of history; he reviews diffs
and green tests before anything enters git.

**How to apply:** End a feature by reporting what changed (and which tests were added),
and remind Adam to run `pnpm check` and commit. Related: [[tests-as-contract]].
