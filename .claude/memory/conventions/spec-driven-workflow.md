---
name: spec-driven-workflow
description: Every feature flows requirement -> story -> test -> implementation -> regenerated status
type: convention
---

Work is spec driven. A feature is not "done" until it maps to a requirement ID
(`FR-*`/`NFR-*`) with a user story and at least one passing test recorded in the
verification map. The full loop is documented in `docs/ai-workflow.md`. Short version:
pick/define the requirement, write the story with Given/When/Then, build the feature
as a vertical slice with tests, add the requirement to `docs/verification-map.json`,
then regenerate `docs/STATUS.md`.

**Why:** This is the workflow Adam wants to live in — strong specs let an AI agent
implement reliably and let Adam review the diff and the green tests instead of every
line. It pays off across a long-lived personal project.

**How to apply:** Never ship a feature without a requirement ID and a test. Use the
`/new-feature` command to start one. Related: [[tests-as-contract]],
[[generated-status-never-edit]], [[vertical-slices]].
