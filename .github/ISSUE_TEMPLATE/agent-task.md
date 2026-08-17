---
name: Agent task
about: An outcome-oriented ticket for Claude Code's implement-ticket workflow.
title: ""
labels: []
assignees: []
---

# Outcome

Describe the user-visible or operational result that must exist.

# Context

Explain why this is wanted. Link relevant files, screenshots, examples, or prior issues.

# Acceptance criteria

- [ ] Observable result one
- [ ] Observable result two
- [ ] Required error, empty, loading, or edge-case behavior
- [ ] Required verification or visual evidence

# Boundaries

State what must not change and what is explicitly out of scope.

# Decisions already made

Record product, UX, compatibility, architecture, or dependency decisions that are
already settled. Write `None` if this is wide open.

# Permissions for this ticket

- [ ] Claude may create commits on an isolated branch.
- [ ] Claude may create a draft pull request after the completion gate passes.
- [ ] Claude may use existing browser or application-testing tools.

# Required human decisions

List known decisions Claude must ask about before proceeding. Write `None known` if
there aren't any yet.

# Verification

List required commands, test environments, viewports, screenshots, services, or manual
checks. If this ticket adds a new `FR-*`/`NFR-*` requirement (see
`docs/requirements.md`), say so — that routes it through the existing
`docs/ai-workflow.md` spec loop in addition to this template.
