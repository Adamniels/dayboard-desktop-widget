---
name: tests-as-contract
description: Tests prove requirements; review the diff + green tests, not every line
type: convention
---

Tests are the contract between a requirement and the code. Core logic gets unit tests
in `packages/*/src/*.test.ts`; api behavior gets integration tests. Every `auto*`
requirement in the verification map must resolve to a real, passing test — a missing
test shows up as a visible `No matching test` failure in `STATUS.md`, never a silent
pass. If a feature lands without a test, the test gets written before it is "done".

**Why:** This is what lets Adam trust the agent and move faster with less double
checking: he reviews the change and the passing tests rather than auditing every line.

**How to apply:** When adding a requirement, add its `testMatch` to the verification
map and confirm `STATUS.md` shows it green. Related: [[spec-driven-workflow]],
[[generated-status-never-edit]].
