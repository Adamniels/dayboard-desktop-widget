# Project Memory — Index

This file is imported into context via `@memory/MEMORY.md` in `.claude/CLAUDE.md`, so
the index below is always visible. Each line points to a memory file; read that file
when its topic is relevant. Keep each entry to one line.

## How to add memory

1. Choose a category: `decisions/`, `conventions/`, or `context/`.
2. Create `category/kebab-case-name.md` using the format below.
3. Add a one-line pointer under the matching heading in this file.
4. Commit it with your code so it syncs across machines.

Memory file format:

```markdown
---
name: short-kebab-slug
description: one-line summary used to judge relevance
type: decision | convention | context
---

The fact. For decisions and conventions, include a **Why:** line and, where useful,
a **How to apply:** line. Link related memory with [[other-slug]].
```

Record only durable, cross-session project knowledge. Do not duplicate what git
already captures (file structure, past diffs) or notes that matter to a single
conversation.

## Decisions

- [Stack: TypeScript monorepo](decisions/stack-typescript-monorepo.md) — Node api, React display + admin, Postgres/Drizzle, FullCalendar, WebSocket.
- [Mac Mini is the brain](decisions/mac-mini-is-the-brain.md) — Mini hosts all; display + admin are thin clients of the api; Tailscale for remote.
- [App is source of truth](decisions/app-is-source-of-truth.md) — local DB is master, Google Calendar is a mirror.
- [Google two-way sync, single user](decisions/google-two-way-sync-single-user.md) — last-write-wins, poll in v1, recurrence read-only.
- [Unified event model](decisions/unified-event-model.md) — one Event with a type; Project/Todo/Reminder/Note are the extras; todos belong to projects.
- [PostgreSQL over SQLite](decisions/postgresql-over-sqlite.md) — Adam's call; production-grade engine.
- [Datetime + recurrence model](decisions/datetime-recurrence-model.md) — events are absolute datetimes + timezone with recurrence expanded to occurrences; the prototype's weekday-index shape is not the schema.
- [Display active view setting](decisions/display-active-view-setting.md) — admin picks one active view via a display_setting singleton; PATCH /display broadcasts display.changed and the kiosk switches.

## Conventions

- [Spec-driven workflow](conventions/spec-driven-workflow.md) — requirement → story → test → implementation → regenerated status.
- [Core stays pure](conventions/core-stays-pure.md) — `packages/core` has no clock or IO; pass time and data in.
- [Tests as contract](conventions/tests-as-contract.md) — every auto requirement maps to a passing test; review diffs + green, not every line.
- [Generated STATUS never edited](conventions/generated-status-never-edit.md) — `docs/STATUS.md` comes from the generator only.
- [Vertical slices](conventions/vertical-slices.md) — each feature is one thin end-to-end slice.
- [Leave changes uncommitted](conventions/leave-changes-uncommitted.md) — Adam reviews and commits himself.
- [Bundler module resolution](conventions/bundler-module-resolution.md) — "bundler" moduleResolution with extensionless internal imports; drizzle-kit drove it.
- [Display theme tokens](conventions/display-theme-tokens.md) — both frontends read a per-app theme.ts token module lifted from the prototype; inline styles, no hardcoded hex.

## Context

- [Devices and topology](context/devices-and-topology.md) — Mac Mini, always-on 15.6" kiosk (both orientations), main computer over Tailscale.
- [Domain glossary](context/domain-glossary.md) — event, time block, project, todo, reminder, note, display, admin.
- [Requirement ID scheme](context/requirement-id-scheme.md) — FR area prefixes, NFR scheme, verification types.
- [Design reference: the prototype](context/design-reference-prototype.md) — the approved interactive prototype is the canonical look and interaction reference; backend parts are mocked. See docs/prototype-gap-analysis.md.
- [Admin control room](context/admin-control-room.md) — the admin is the prototype's dark sidebar + tabs (Calendar/Projects/Reminders/Notes/Display) driving the REST api.
