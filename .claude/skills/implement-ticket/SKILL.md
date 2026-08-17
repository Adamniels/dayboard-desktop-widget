---
name: implement-ticket
description: >
  Implement one delegated ticket (a GitHub issue URL/number, or pasted ticket text) end
  to end: intake, plan, implement, independent verifier, conditional UI/security review,
  independent reviewer, bounded fix loop, then hand off a locally-verified result for
  Adam's review. Use when Adam gives a ticket to implement via Claude Dispatch or asks to
  "implement ticket X" / "work this issue". Do not use for open-ended exploration, for
  the repo's own spec/doc sync (use the spec-syncer agent or /sync-status for that), or
  for a brand-new feature idea with no ticket yet (use /new-feature to frame it first,
  then implement-ticket to build it).
---

# implement-ticket

Runs one delegated ticket through this repo's full lead → verifier → reviewer pipeline.
Adam is the only merge/deploy authority; the terminal state here is a locally verified
change, ready for his review — a draft PR only if the ticket explicitly authorizes one.

Full rationale and the human-facing version of this flow live in
`docs/agent-workflow.md`. The approval boundaries and quality floor referenced below are
defined once in `.claude/CLAUDE.md` — read them before step 1, they govern every step
here.

This repo already has a spec-driven workflow for *new features* — requirement ID → user
story → vertical slice → test → `docs/verification-map.json` → generated `STATUS.md`
(`docs/ai-workflow.md`, the `/new-feature` command, the `feature-builder` agent). This
skill does not replace that. It decides, per ticket, whether that machinery applies:

- **Feature-shaped ticket** (adds a new user-visible capability or rule): still needs an
  `FR-*`/`NFR-*` requirement ID and a story. Prefer delegating that part to the
  `feature-builder` agent, following `docs/ai-workflow.md` exactly, then continue this
  skill's verifier/reviewer steps on top of its output instead of duplicating its steps.
- **Smaller ticket** (bug fix, tweak, non-behavioral change): does not need a new
  requirement ID. Implement directly, still with a real test where the repo's test
  infrastructure makes that meaningful, and still through the same verifier/reviewer
  gate below. Don't force a requirement ID onto a one-line fix.

If it's ambiguous which kind of ticket this is, say which way you're leaning and why,
and proceed — this is a small, reversible judgment call, not a reason to stop and ask.

## 1. Intake

- Get the ticket from the argument: a GitHub issue URL/number, or pasted text. Only read
  a GitHub issue via `gh`/the `github` MCP tool if it's already authenticated in this
  session — if not, ask Adam to paste the ticket text instead of trying to authenticate.
- Restate, before writing any code: the interpreted outcome, the acceptance criteria
  (verbatim from the ticket's template if it used `.github/ISSUE_TEMPLATE/agent-task.md`),
  the stated boundaries/out-of-scope items, any decisions already made, and the
  permissions granted for this ticket (commit? draft PR? — see the template's
  "Permissions for this ticket" section; if the ticket predates the template, ask).
- Ask Adam only about ambiguity that would change user-visible behavior, architecture,
  dependencies, data/schema, security, scope, or an external effect. For a small,
  reversible implementation detail consistent with existing patterns in this repo, state
  the assumption in your report and proceed.

## 2. Safety and baseline

- `git status` first. Protect anything not already committed that isn't yours from this
  ticket.
- Confirm you're on (or create) an isolated branch off `main` using this repo's naming —
  short kebab, prefixed by type if the recent log uses one (`feat/`, `fix/`, `chore/`).
  Don't create a nested worktree if Claude Desktop already placed you in an isolated one.
- Identify which verification commands apply: `pnpm --filter <pkg> typecheck`,
  `pnpm --filter <pkg> test`, `pnpm check` (needs Postgres — `pnpm db:up`), `pnpm lint`.
  If `pnpm`/`corepack`/Postgres aren't reachable in your shell, note that now, don't
  discover it as a surprise at step 5.
- Run a proportional baseline (typecheck/test on the packages you're about to touch) so
  you can tell a pre-existing failure from a regression you introduce later.
- Stop and ask if the working tree can't be isolated safely.

## 3. Proportional plan

- Short plan tied directly to the acceptance criteria: which files change, which package
  boundary they fall in (`packages/core` stays pure — no clock, no IO), the test
  strategy, and whether this is feature-shaped (see above).
- Skip the architecture exercise for a ticket that doesn't need one. Invoke a temporary
  focused specialist (research, test design) only when unfamiliar or complex behavior
  genuinely warrants it before writing code — don't invoke one by default.
- Ask Adam before any architectural decision or dependency change; per
  `.claude/CLAUDE.md`, that's a hard stop, not a judgment call.

## 4. Implementation

- Follow the conventions in `.claude/CLAUDE.md` and the linked
  `.claude/memory/decisions/` and `.claude/memory/conventions/` files for the areas
  you're touching.
- Stay inside the ticket's boundary. No unrelated refactoring.
- Add or update tests using this repo's existing infrastructure (vitest; core/shared
  unit tests, `apps/api` integration tests in `api.integration.test.ts` against a real
  test Postgres via `global-setup.ts`).
- Never touch `docs/STATUS.md` by hand — if this ticket is feature-shaped, update
  `docs/verification-map.json` and regenerate via `node scripts/verify-status.mjs`.
- Never read or print `.env*`, `secrets/`, or anything under those gitignore rules,
  beyond confirming a variable name exists if strictly necessary.
- Give a short progress update at meaningful milestones, not every file edit.

## 5. Implementer verification

- Run the fast checks for what you touched during implementation.
- Run the full gate (`pnpm check`, with Postgres up) before moving to review, if your
  shell can reach it. If it can't, say so explicitly — don't claim a gate you didn't run.
- Exercise the actual behavior, not just compilation, where the environment allows it
  (e.g. `app.inject(...)` in the integration tests, not just types lining up).
- Record exact commands run, results, anything skipped, and why.

## 6. Independent verifier

- Invoke the `verifier` agent fresh (`.claude/agents/verifier.md`). Give it the ticket,
  acceptance criteria, the actual diff, and your claimed evidence from step 5 — do not
  ask it to trust your summary.
- `NOT VERIFIED`: look at its evidence, fix valid in-scope problems, rerun the affected
  checks.
- `BLOCKED`: try a safe in-scope resolution; if that's not possible, ask Adam with the
  precise blocker.

## 7. Conditional specialist review

- If the ticket changed anything visible or interactive in `apps/display` or
  `apps/admin`: invoke the `ui-reviewer` agent (`.claude/agents/ui-reviewer.md`). It has
  no browser tool here — expect it to flag what it genuinely cannot confirm without eyes
  on the real screen, and carry that into your final report rather than treating it as a
  failure.
- If the ticket touches auth, Google OAuth credentials/tokens, secrets, or a trust
  boundary: invoke a focused, temporary security-minded read of the diff (reuse the
  `reviewer` agent's security checklist, or ask Adam if a dedicated pass is warranted —
  don't create a permanent new agent file for a single ticket).
- Don't invoke specialists that aren't warranted by this specific ticket.

## 8. Independent code review

- Invoke the `reviewer` agent fresh (`.claude/agents/reviewer.md`). Give it the ticket,
  the relevant parts of `.claude/CLAUDE.md`/memory, the correct diff, the relevant source
  and tests, and the verifier's evidence.
- Evaluate every finding — don't apply them blindly. Fix valid `BLOCKING` findings and
  normally fix valid in-scope `IMPORTANT` findings. Leave `OPTIONAL` findings unless
  trivial, clearly beneficial, and in scope.

## 9. Bounded correction loop

- After a fix, rerun only the affected verification and review, not everything from
  scratch.
- Maximum two full review-and-fix cycles (step 6 through step 8, per BLOCKING/NOT
  VERIFIED finding set counted as one cycle).
- After two cycles, stop. Report the exact unresolved evidence to Adam instead of
  continuing to iterate.

## 10. Completion gate

Ready only when: every acceptance criterion is met or explicitly flagged unresolved;
work stayed in scope; required checks passed or a real limitation is disclosed; the
behavior was actually exercised; a UI-changing ticket got the ui-reviewer's read (even if
its verdict is `BLOCKED` pending Adam's eyes); the verifier concluded `VERIFIED`; the
reviewer concluded `APPROVE`; no unresolved blocking finding remains; and nothing was
committed, pushed, merged, deployed, or had a secret exposed beyond what the ticket
explicitly authorized.

## 11. Git and remote result

- Commit only if this ticket's permissions authorize it. Before committing, confirm
  `git diff`/`git status` show only intended files.
- Open a draft PR only if this ticket explicitly authorizes one and step 10 fully
  passed. Never merge. Never deploy — that also means never running
  `docker compose ... up/restart/down` against the live `dayboard-prod-*` stack that's
  actually serving the kiosk on this Mini (see `docs/DEPLOY-RUNBOOK.md`); that's Adam's
  call, always.
- A draft PR body must map changes to acceptance criteria, list what was verified and
  how, disclose limitations, and name any decision Adam still needs to make.

## 12. Final handoff

Report, concisely: outcome; acceptance-criteria status; files changed; verification
commands and results; verifier conclusion; reviewer verdict and which findings were
fixed vs. left; UI evidence/limitations if applicable; assumptions made; known
limitations or skipped checks; branch/commit/draft-PR link only if created; an explicit
statement that nothing was merged or deployed; and the one next action Adam should take.
