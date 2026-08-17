---
name: delegated-ticket-workflow
description: sequential lead → verifier → reviewer (→ ui-reviewer) pipeline for tickets dispatched from mobile, separate from the FR/NFR feature loop
type: decision
---

Tickets dispatched to Claude Code on the Mac mini (typically via Claude Dispatch from
Adam's phone) run through a small sequential pipeline, not the full spec-driven feature
loop by default: the main session acts as lead/implementer, then a fresh `verifier`
subagent checks acceptance criteria against evidence, then a fresh `reviewer` subagent
reviews the diff, with a `ui-reviewer` joining only when `apps/display`/`apps/admin`
visible behavior changed. Entry point is the `implement-ticket` skill
(`.claude/skills/implement-ticket/SKILL.md`); full rationale and the human-facing
version is `docs/agent-workflow.md`.

**Why:** Adam is the sole operator, reviewer, and merge/deploy authority — this isn't a
team, so the pipeline stays sequential and small (no agent teams, no parallel
implementation, no permanent security/research/architecture agents created speculatively
[[core-stays-pure]]-style minimalism applied to process, not just code). Not every
delegated ticket is a new feature: `docs/ai-workflow.md`'s requirement-ID → story →
`STATUS.md` loop is real and stays mandatory for feature-shaped work, but forcing every
small fix or tweak through it would make trivial tickets slower to spec than to
implement. The Mac mini already runs Dayboard in production
(`docs/DEPLOY-RUNBOOK.md`), so this pipeline's approval boundaries treat any
deploy/restart action as always requiring Adam explicitly, never bundled into an
otherwise-approved ticket.

**How to apply:** when a ticket is feature-shaped (adds a new user-visible capability or
rule), still route the implementation portion through `feature-builder` /
`docs/ai-workflow.md` for the requirement ID and story, then continue with this
pipeline's verifier/reviewer steps on top instead of skipping them. When a ticket is a
smaller fix, skip the requirement-ID step but keep the verifier/reviewer gate — it's
what replaces "team code review" for a single-operator project. Merge and deploy stay
Adam-only in every case, regardless of pipeline verdicts.
