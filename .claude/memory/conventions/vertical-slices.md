---
name: vertical-slices
description: Build each feature as one thin end-to-end slice: DB -> api -> display/admin -> test
type: convention
---

Implement features as vertical slices, not horizontal layers. One feature touches the
schema, the api endpoint/socket event, the relevant frontend, and its tests — small
but end to end and demonstrable — rather than "build all the models, then all the
endpoints, then all the UI".

**Why:** A working thin slice is reviewable, testable, and shippable on its own, which
keeps the agent loop tight and avoids large half-integrated changes.

**How to apply:** Scope each `/new-feature` to something demonstrable end to end. If a
slice feels too big, split the requirement. Related: [[spec-driven-workflow]].
