---
name: domain-glossary
description: Shared vocabulary — event, time block, project, todo, reminder, note, display, admin
type: context
---

- **Event** — any item on the calendar. Unified entity with a `type`. Has an optional
  Google mirror and an optional project link.
- **Time block** — an Event with `type: block`: time Adam reserves for focused work,
  not a meeting. Often linked to a project.
- **Project** — a container for related to dos.
- **Todo** — a task inside a project. Surfaces on the display while inside a linked
  time block; otherwise lives in the project backlog.
- **Reminder** — a prompt at an absolute time or relative offset, optionally
  recurring, that triggers a visual takeover on the display plus optional chime.
- **Timer** — a countdown (e.g. Pomodoro); shares the scheduler with reminders.
- **Note** — freeform text, general or linked to a project.
- **Display** — the always-on kiosk frontend. Read only. Never touched.
- **Admin** — the control frontend on the main computer. The only place Adam inputs.

Related: [[unified-event-model]].
