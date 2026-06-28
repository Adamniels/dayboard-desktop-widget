---
description: Start a new feature using the spec-driven loop (requirement -> story -> slice -> test -> status).
---

Begin a new feature: $ARGUMENTS

Follow `docs/ai-workflow.md` exactly. Steps:

1. Frame the requirement(s): pick the area prefix and next number
   (see `.claude/memory/context/requirement-id-scheme.md`) and add them to
   `docs/requirements.md` in "shall" wording. Split into multiple requirements if the
   feature has distinct testable rules.
2. Add or extend a `US-*` story in `docs/user-stories.md` with Given/When/Then and a
   `Covers:` line.
3. Implement as a vertical slice (schema → api → display/admin), keeping brain logic
   pure in `packages/core`.
4. Write the proving test(s).
5. Add to `docs/verification-map.json`, run `node scripts/verify-status.mjs`, confirm
   the new IDs are not `NO TEST`.
6. Add rows to `docs/definition-of-done.md`.
7. Report the recap and leave changes uncommitted.

Prefer delegating the build to the `feature-builder` agent. If $ARGUMENTS is empty, ask
which feature to start before writing anything.
