---
description: Regenerate docs/STATUS.md from the verification map and on-disk test results.
---

Bring the generated status in line with reality.

Steps:

1. Run `node scripts/verify-status.mjs` to rewrite `docs/STATUS.md`.
2. Run `node --test scripts/*.test.mjs` to confirm the generator itself is healthy.
3. Report the summary line (pass / fail / no test counts) and call out any `auto*`
   requirement reading `NO TEST` or `FAIL` as a gap to close.

Never hand-edit `docs/STATUS.md`. If a status is wrong, fix the test or the
`testMatch` in `docs/verification-map.json`, then regenerate. For a fuller doc sync
(requirements, stories, definition of done) use the `spec-syncer` agent instead.
