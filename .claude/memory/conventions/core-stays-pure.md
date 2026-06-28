---
name: core-stays-pure
description: packages/core has no clock, no IO — time and data are passed in
type: convention
---

`packages/core` contains only pure functions. No `Date.now()`, no `new Date()` for
"now", no network, no database, no filesystem. Anything time dependent takes the
current time as a parameter. The brain's rules live here: reminder scheduling,
recurrence expansion, and the todo-surfacing rule.

**Why:** Purity makes the hardest logic deterministic and trivially unit testable
without a database or fake clock — which is exactly what keeps the AI loop fast, since
most tests then run in the sandbox with plain `node --test` / vitest and need no
Postgres.

**How to apply:** If a function needs "now", add a `now: Date` parameter. If it needs
data, pass it in; the api fetches and supplies it. Related:
[[postgresql-over-sqlite]], [[tests-as-contract]].
