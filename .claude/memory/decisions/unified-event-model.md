---
name: unified-event-model
description: One Event entity with a type field; Project/Todo/Reminder/Note are the extras
type: decision
---

Data model entities:
- **Event** — one unified table with a `type` field (e.g. `meeting`, `block`), an
  optional `googleEventId`, and an optional `projectId`. A time block is just an
  Event with `type: block`; it is not a separate table.
- **Project** — a container that has many to dos.
- **Todo** — belongs to a Project, has a status. Surfaces at the top of the display
  while the current time is inside an Event linked to that Project. Unscheduled to dos
  sit in their project backlog.
- **Reminder** — supports both an absolute clock time and a relative offset ("in 25
  min"), with optional recurrence. Needs a small scheduler on the Mini (shared with
  timer logic).
- **Note** — general, or optionally linked to a Project.

To dos are **not** owned by time blocks; they are owned by projects and merely surface
during a linked block.

**Why:** A single Event type keeps the calendar simple and lets the display color
types differently. Tying to dos to projects (not blocks) matches how Adam actually
plans: a block points at a project, and being inside it raises that project's tasks.

**How to apply:** Add event kinds via the `type` field, not new tables. Surfacing
logic lives in `packages/core` as a pure function of (now, events, todos). Related:
[[google-two-way-sync-single-user]], [[app-is-source-of-truth]].
