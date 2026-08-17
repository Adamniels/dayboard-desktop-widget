# Delegated ticket workflow

This is for Adam, not something Claude reads every session. It explains the
lead → verifier → reviewer pipeline for tickets dispatched to Claude Code on the Mac
mini, why it's shaped this way, and how to run it.

This is separate from `docs/ai-workflow.md`, which is the spec-driven loop for *new
features* (requirement ID → user story → test → `STATUS.md`). The two overlap: a
feature-shaped ticket still goes through that loop, just as one step inside this
pipeline. A small bug-fix ticket doesn't need a requirement ID at all. See
`.claude/skills/implement-ticket/SKILL.md` for exactly how that decision gets made.

## Purpose and non-goals

The goal is reliable, reviewable completion of small-to-medium tickets with a sensible
quality floor — not a simulated engineering org. One main session acts as lead and
implementer; a fresh verifier subagent checks the acceptance criteria against evidence;
a fresh independent reviewer checks the diff; a UI reviewer joins only for visible
changes. Roles run sequentially, never in parallel, and never spin up an agent team.
Security/research/test-design/architecture specialists are invoked ad hoc, only when a
specific ticket warrants them — none of those get a permanent agent file from this
bootstrap.

## Topology

The Mac mini is the whole execution host: it already runs Dayboard in production
(`dayboard-prod-{db,api,display,admin}` via `docker-compose.prod.yml`, see
`docs/DEPLOY-RUNBOOK.md`) *and* is where Claude Code runs for delegated work. GitHub
(`Adamniels/dayboard-desktop-widget`) is the synchronization boundary — where tickets
live and where a draft PR eventually lands for review. Claude Dispatch from Adam's phone
to Claude Desktop on the Mini is the intended entry point for a ticket; nothing here
requires being at the Mini in person.

Because the same host runs the live kiosk, a compromised or careless "must ask before"
boundary here is not abstract — an unauthorized `docker compose ... restart` or
`up --build` against `dayboard-prod-*` would affect the screen currently on the wall.
That's why deploy/restart actions are always Adam's call, never automatic, even inside
an otherwise-approved ticket.

## Autonomy and approval boundaries

Defined once, in `.claude/CLAUDE.md`, so every session (this pipeline or ad hoc work)
sees the same rules. In short: normal inspection/edit/test/local-commit work proceeds
without asking; dependency changes, architectural decisions, schema/data changes, auth
or secrets changes, scope expansion, deletions, infrastructure changes, remote PRs,
deploys, and merges all require Adam's explicit go-ahead for that specific ticket.

Agents never merge or deploy — full stop, not just "usually." Merge and deployment stay
Adam-only regardless of how clean a pipeline run looks, because verification here is
strong evidence, not a substitute for a human decision on a system that's live.

## The bounded correction loop

At most two full verify-and-review cycles per ticket. If a `BLOCKING` finding or a `NOT
VERIFIED` result survives two rounds of fixes, the pipeline stops and reports the exact
unresolved evidence instead of continuing to iterate — that's a sign the ticket, the
acceptance criteria, or the approach needs Adam's input, not more agent time.

## Writing a useful ticket

Use `.github/ISSUE_TEMPLATE/agent-task.md` — outcome, acceptance criteria, boundaries,
decisions already made, permissions granted for that ticket, and required verification.
Outcome-oriented beats implementation-prescriptive: say what must be true when it's
done, not which functions to write. Keep it proportional — a small dashboard tweak
should take less time to describe than to implement.

## Running a ticket

From the mobile app, dispatch a session into this repo and invoke `/implement-ticket`
with the issue URL/number or pasted text. See the reusable prompt below.

## Reading the verdicts

- `VERIFIED` / `NOT VERIFIED` / `BLOCKED` — the verifier's read on whether acceptance
  criteria are met, with evidence. `BLOCKED` means the environment couldn't answer the
  question (missing service/credential/tool), not that the ticket failed.
- `APPROVE` / `CHANGES REQUIRED` / `BLOCKED` — the reviewer's (and UI reviewer's) verdict
  on the diff itself. `CHANGES REQUIRED` names specific `BLOCKING`/`IMPORTANT` findings;
  `OPTIONAL` findings never block.

## Running the pilot safely

Start with the first real ticket below (or something similarly small). Don't grant
commit/PR permissions on the first run — review the local diff yourself first, the same
way this bootstrap's own diff should be reviewed before it's trusted. Add those
permissions to future tickets once you've seen a full pipeline run hold together.

## Known limitations, discovered while setting this up

- **No CI.** `pnpm check` is real but manual — nothing runs it automatically today. The
  Claude Code sandbox this pipeline runs in may not have `pnpm`/`corepack` on `PATH` or a
  reachable Postgres; when that happens the agents are instructed to disclose it rather
  than fake a passing gate. Confirm the full gate yourself before merging if a session
  reported that limitation.
- **No browser/screenshot tool is configured.** The `ui-reviewer` agent reviews source
  statically (theme tokens, JSX, state handling) and explicitly flags what it can't
  confirm — expect to eyeball the actual kiosk (15.6", both orientations) or the admin
  over Tailscale yourself for anything it calls out as unverifiable.
- **`gh`/GitHub MCP auth is session-dependent.** If a session can't read the issue
  directly, paste the ticket text into the dispatch prompt instead.

## Revising this workflow

Once a few real tickets have gone through the pipeline, revisit this doc and
`.claude/CLAUDE.md`'s approval boundaries based on what actually happened — where the
verifier/reviewer were too strict, too lax, or where a ticket type this doesn't cover
well showed up. Keep changes evidence-driven, not speculative.

## Dispatch prompt

```text
Open a Claude Code session for the dayboard-desktop-widget repository and implement
<ISSUE URL OR TICKET>.

Use the repository's implement-ticket skill. Work in the existing isolated Claude
worktree, or create safe isolation if needed. Ask me before every action covered by the
repository's approval boundaries. Use the verifier and independent reviewer
sequentially. Use the UI reviewer when visible behavior changes. Run the complete
verification gate and create a draft pull request only if the ticket authorizes it and
every completion condition passes. Do not merge or deploy. Notify me when you need a
material decision or when the verified result is ready for review.
```
