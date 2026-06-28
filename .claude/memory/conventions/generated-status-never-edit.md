---
name: generated-status-never-edit
description: docs/STATUS.md is generated from the map + test results — never hand-edit
type: convention
---

`docs/STATUS.md` is produced by `node scripts/verify-status.mjs`, which reads
`docs/verification-map.json` plus each package's `test-results.json`. Never hand edit
it. To change what it says, change the verification map (or fix the tests) and
regenerate. The generator has its own unit tests (`node --test scripts/*.test.mjs`).

**Why:** A generated status is the single live source of truth for "what works". If it
could be hand edited, it would drift and stop being trustworthy.

**How to apply:** After any requirement or test change, run the generator and commit
the regenerated `STATUS.md` alongside. Related: [[tests-as-contract]],
[[spec-driven-workflow]].
