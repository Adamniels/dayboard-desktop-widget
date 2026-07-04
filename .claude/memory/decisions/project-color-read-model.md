---
name: project-color-read-model
description: project color flows through api read models and resolves in core (project color wins over type color); admin grid stays type-colored
type: decision
---

Project color (FR-PROJ-4, post-MVP fixes item 8) reaches the display through the api
read models, not client-side joins: the occurrence read model (apps/api/src/repo/events.ts),
GET /notes, and GET /surfaced (apps/api/src/routes/planning.ts) all carry a
projectColor alongside projectId. The final color resolves through the pure
resolveEventColor(projectColor, typeColor) in packages/core/src/rules.ts: project
color wins; blank/missing falls back to the caller's per-app type color (colorForType).

**Why:** the api is the source of truth and renderVals is the contract — enriching the
read model keeps the display dumb and avoids duplicating the project join in three
views. Keeping the resolution rule in core makes it unit-testable without a DB.

**How to apply:** any new project-scoped read model the display consumes should carry
projectColor the same way (see withProjectColor in routes/planning.ts). Scope decisions
locked with Adam (2026-07-04): the admin FullCalendar grid deliberately stays colored
by type (calendar-model.ts untouched); the palette is a 10-swatch preset plus free hex
(PROJECT_COLORS in apps/admin/src/Planning.tsx).
Related: [[unified-event-model]], [[display-theme-tokens]].
