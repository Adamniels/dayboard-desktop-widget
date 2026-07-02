# Dayboard — Post-MVP Fixes & Additions Plan

Status: proposed (not yet implemented). Owner: Adam. Drafted 2026-07-02.

This plan turns eight post-MVP items into ordered, testable phases. It follows the
project's spec-driven rule: every item gets a requirement ID, a passing test, and a
`docs/verification-map.json` + `docs/STATUS.md` update before it counts as done. Leave
all changes uncommitted for Adam to review.

## Summary of the eight items

| # | Item | Verdict after code review | Effort |
|---|------|---------------------------|--------|
| 1 | "Are you sure?" on delete | Absent everywhere. Build it. | Small |
| 2 | Date/time doesn't fit in the box | Real layout bug in the event editor. | Tiny |
| 3 | A "normal" event type | The `general` type already exists in data; just expose it. | Tiny |
| 4 | Notes must respect line breaks | Absent; upgrade to basic markdown. | Small |
| 5 | Must be able to update notes | Backend ready; wire admin UI. | Small |
| 6 | Portrait/landscape switch | **Already works** (auto-detect). Dropped. | — |
| 7 | Edit project name | Backend ready; add inline rename. | Small |
| 8 | Color on projects | `color` field exists; wire picker + apply everywhere. | Medium |

Item 6 is intentionally excluded: the display already auto-switches orientation from
the screen dimensions (`apps/display/src/App.tsx`), which you confirmed is fine.

## Decisions locked in (from our Q&A)

- **Delete confirmation** applies to *everything deletable*: events, projects, todos, notes.
- **Item 2** is the admin "add/edit event" editor (screenshot still welcome to confirm).
- **Item 3**: expose the existing `general` type, labeled "General". Default stays `block`.
- **Notes** get *basic markdown* (line breaks, bold, bullet lists, links).
- **Note editing** uses the simplest inline approach.
- **Project rename** is inline (click the name, edit in place).
- **Project color** shows up in: display event/timeblock boxes, admin dots/labels,
  notes & todos, and the Now/Next side panel card.

---

## Phase 0 — API client wiring (foundation)

Small enabling step so later phases don't repeat it. The backend already exposes
`PATCH /projects/:id` and `PATCH /notes/:id`; the admin client just never called them.

**Files**
- `apps/admin/src/api.ts` — add `updateProject(id, patch)` and `updateNote(id, patch)`
  following the existing `send()` helper pattern.

**Verification**
- Type-check passes (`pnpm check`).
- A quick unit/integration check that each helper issues a `PATCH` to the right path.

---

## Phase 1 — Delete confirmation (Item 1)

**Goal.** Every destructive action asks "Are you sure?" before it runs.

**Approach.** One reusable confirm dialog rather than four ad-hoc ones. Add a
`ConfirmDialog` (and a tiny `useConfirm()` helper) to `apps/admin/src/ui.tsx`, styled to
match the existing dark card look (`card`, `colors`, the `dbPop` animation already used
by the editor). It shows a title, a line naming what will be deleted, and Cancel /
Delete buttons, with the destructive button in the existing red style.

**Wire it into the four delete sites:**
- `apps/admin/src/EventEditor.tsx` — `remove()` (event delete, ~line 189/267).
- `apps/admin/src/Planning.tsx` — `ProjectCard` delete (~line 84).
- `apps/admin/src/Planning.tsx` — todo `×` delete (~line 111).
- `apps/admin/src/Planning.tsx` — note delete (~line 334).

Each site names the target ("Delete event 'Standup'?", "Delete project 'Website' and its
to-dos?", etc.). Soft-delete on the backend is unchanged.

**Requirement ID (proposed).** `FR-DEL-1` — destructive actions require confirmation.

**Verification.**
- Component test: dialog renders, Cancel resolves false / does nothing, Delete resolves
  true / fires the handler exactly once.
- Manual: each of the four buttons opens the dialog; Cancel leaves the item intact.

---

## Phase 2 — Event editor: fit date/time + add the "General" type (Items 2 & 3)

Two small, isolated changes in the same file, so they ship together.

### 2a. Date/time fits (Item 2)
**Cause.** In `apps/admin/src/EventEditor.tsx` (~line 235) Start and End are two
`datetime-local` inputs in a `gridTemplateColumns: "1fr 1fr"` grid inside a 380px panel,
so each is ~160px wide and clips the value.

**Fix (recommended).** Stack the two fields full-width (one per row) instead of side by
side. Optionally nudge the panel from 380px to ~400px (the `flex: "0 0 380px"` wrapper,
~line 118). Stacking alone resolves the clipping.

### 2b. "General" event type (Item 3)
**Change.** Add `{ key: "general", label: "General" }` to the `TYPES` array
(~line 134). The toggle already maps over `TYPES`, `colorForType()` already handles
`general`, and the swatch renders for non-block types, so this is mostly the one line
plus confirming the "General" swatch color reads well. Default type stays `block`.

**Requirement IDs (proposed).** `FR-EVT-EDIT-1` (layout), `FR-EVT-TYPE-3` (general type).

**Verification.**
- Manual/screenshot: full date + time visible in both fields at 380–400px.
- Create an event as "General"; confirm it persists with `type: "general"` and renders
  with the general color on the display.
- `pnpm check` (the type union already includes `general`, so no schema change).

---

## Phase 3 — Notes: markdown rendering + inline editing (Items 4 & 5)

### 3a. Basic markdown (Item 4)
**Goal.** Preserve line breaks and support bold, bullet lists, and links.

**Approach.** Render note bodies through a small markdown renderer instead of raw text.
Recommended: `react-markdown` (safe by default, no `dangerouslySetInnerHTML`), added to
both frontends. Constrain it to the agreed subset and keep `white-space` sane so blank
lines survive.

**Render sites:**
- `apps/admin/src/Planning.tsx` — note card body (~line 331), currently raw `{n.body}`.
- `apps/display/src/SidePanel.tsx` — notes list (~line 55–63), currently raw, no
  white-space handling.

Storage is unchanged — notes stay plain markdown text in `note.body`.

### 3b. Inline note editing (Item 5)
**Goal.** Edit an existing note, not just create/delete.

**Approach (simplest).** In the `apps/admin/src/Planning.tsx` note card, add an "Edit"
action that swaps the rendered body for a `Textarea` seeded with `n.body`, plus
Save / Cancel. Save calls `updateNote(n.id, { body })` (added in Phase 0) and reloads.
The display stays read-only.

**Requirement IDs (proposed).** `FR-NOTE-MD-1` (markdown), `FR-NOTE-EDIT-1` (update).

**Verification.**
- Unit: markdown renderer turns `**bold**`, `- item`, and newlines into the expected
  output; a plain-text note with line breaks renders on multiple lines.
- Manual: edit a note, save, confirm it updates in admin and live-updates the display
  via the existing socket broadcast.
- `pnpm check`.

---

## Phase 4 — Projects: rename + color (Items 7 & 8)

The largest phase — color reaches into the display read model. Ordered sub-steps.

### 4a. Inline rename (Item 7)
**Approach.** In `apps/admin/src/Planning.tsx` `ProjectCard` (~line 77), make the name
(`{project.name}`, ~line 81) click-to-edit: click swaps it for a `TextInput`; Enter/blur
saves via `updateProject(id, { name })` (Phase 0). Keep the row's expand/collapse and
delete behavior intact (stop propagation as the delete button already does).

**Requirement ID (proposed).** `FR-PROJ-RENAME-1`.

### 4b. Color picker in admin (Item 8, part 1)
**Approach.** Add a small preset palette (about 8–12 swatches) to `ProjectCard`, plus
optional freeform hex. Selecting a swatch calls `updateProject(id, { color })`. The
existing colored dot (~line 80, `project.color ?? colors.accent`) already reflects it, so
admin dots/labels are covered immediately.

### 4c. Apply color on the display (Item 8, part 2)
This is the part that spans layers, because display views currently color events by
*type* (`colorForType`), not by project.

**Recommended approach — enrich the read model (single source of truth):**
- `apps/api` occurrence/read model + `packages/shared` DTO: include `projectColor` (and
  `projectId`) on each occurrence the display fetches, so the display doesn't have to
  join client-side. This matches the "api is the source of truth / renderVals is the
  contract" convention.
- `apps/display/src/DayView.tsx`, `WeekView.tsx`, `MonthView.tsx`: use the event's
  `projectColor` when present, else fall back to `colorForType(type)`.
- `apps/display/src/SidePanel.tsx`: the Now/Next card and the linked-notes/todos accents
  pick up `projectColor`.

**Alternative (lighter, more client work):** the display fetches `/projects` read-only
and maps `projectId → color` itself. Simpler server side, but duplicates join logic in
three views. The read-model approach is preferred.

**Also apply in admin** notes & todos: tint the project chip on note cards
(`Planning.tsx` ~line 333) and the todo rows with the project color.

**Requirement ID (proposed).** `FR-PROJ-COLOR-1` — project color chosen in admin and
reflected on display event boxes, the Now/Next card, and project-linked notes/todos.

**Verification.**
- `packages/core`/shared: unit test the "project color wins over type color, else type
  color" resolution rule (kept pure, no IO).
- Manual: set a project color, link an event/timeblock to it, confirm the box, the
  Now/Next card, and its notes/todos all take the color on the display within ~1s.
- `pnpm check`.

---

## Suggested build order

1. **Phase 0** (client wiring) — unblocks 3, 4, 7, 8.
2. **Phase 1** (delete confirm) — self-contained, high everyday value.
3. **Phase 2** (editor fit + General type) — two tiny wins.
4. **Phase 3** (notes markdown + edit).
5. **Phase 4** (project rename + color) — do 4a→4b→4c last; it's the deepest change.

## Spec / docs upkeep (per project rules)

For each phase, before marking done:
- Add the requirement IDs above to the spec (Notion requirements / user stories /
  definition of done) and to `docs/verification-map.json`.
- Point each requirement at its test(s).
- Re-run `node scripts/verify-status.mjs` to regenerate `docs/STATUS.md` (never hand-edit).
- Run `pnpm check` (test + typecheck) as the gate.

The `feature-spec-sync` skill can drive that upkeep after each feature lands.

## Open questions

- **Item 2**: screenshot of the admin "add event" editor to confirm the fix fully
  covers what you're seeing (nothing cramped besides the two datetime fields).
- **Item 8 palette**: any specific colors you want in the preset set, or is a sensible
  default palette fine?
- **New requirement IDs**: the IDs above are proposals — say the word if your spec uses a
  different numbering scheme and I'll align them.
