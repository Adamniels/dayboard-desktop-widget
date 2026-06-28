---
description: Capture a durable project fact into .claude/memory/ and index it in MEMORY.md.
---

Capture the following into project memory: $ARGUMENTS

Steps:

1. Decide the category: a decision (a choice plus its rationale), a convention (a rule
   or pattern), or context (domain knowledge).
2. Create `.claude/memory/<category>/<kebab-name>.md` with frontmatter
   (`name`, `description`, `type`) and the fact, including the *why* for decisions and
   conventions.
3. Add a one-line pointer to the matching section of `.claude/memory/MEMORY.md`.
4. Show me the new file and remind me to commit it so it syncs across machines.

If $ARGUMENTS is empty, ask what I want to remember before writing anything.
