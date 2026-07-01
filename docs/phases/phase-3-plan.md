# Phase 3 — More views and polish: implementation plan

Status: **implemented** (uncommitted, pending Adam's review). This phase adds the daily and
monthly views with admin driven view switching, and does the visual polish pass that brings
the display in line with the approved prototype. It is the phase that makes Dayboard look
finished, not just work. The polish pass also rebuilt the admin as the prototype's dark
Control Room (originally scoped as "light touch"; expanded on Adam's request), fixed the
display's full-bleed background, and made the Pomodoro card always visible.

Requirements covered: **FR-VIEW-3** (the last remaining automated requirement). Polish is
review and manual, not gated by a new automated requirement. Story: US-VIEW2.

Read before implementing: `docs/ai-workflow.md`, the prototype's day and month rendering
in `Dayboard Interactive Prototype/Dayboard.dc.html` (the `monthCells` builder and the
`view === 'day'` grid), and `.claude/memory/context/design-reference-prototype.md`.

---

## 1. Decisions locked for Phase 3

From the planning questions:

1. **Day/night dimming is deferred.** Phase 3 ships the day and month views, view
   switching, and polish only. Dimming can be its own small phase later.
2. **Styling moves to shared theme tokens.** The display's inline styles are refactored to
   reference a single tokens module (colors, spacing, radii, typography lifted from the
   prototype), so the look is consistent and easy to change in one place. Components stay
   single file; they just read tokens instead of hardcoded hex values.
3. **Admin selects a single active view.** Admin sets the active view (day, week, or month)
   and the display shows exactly that, always centered on now. No auto rotation.

---

## 2. Schema change (migration 0003)

One tiny singleton table holds display-level settings the admin controls.

**New table `display_setting`** (one row):

`id` uuid pk · `activeView` text not null default `week` (`day` | `week` | `month`) ·
`updatedAt` timestamptz. The api seeds a single row on first read if none exists.

No other schema changes; the views read the existing event data.

---

## 3. `packages/core` and display pure logic

The view bucketing is presentation, so it stays in `apps/display` alongside the existing
`buildWeek` (the Phase 1 precedent), kept pure and tested. No `packages/core` change is
needed this phase.

- **`buildDay(occurrences, tz)`**: the occurrences that fall on today (in the display
  timezone), positioned by minute offset for a single column. Reuses `tzParts`.
- **`buildMonth(occurrences, tz, anchor)`**: a 6×7 = 42 cell grid starting on the Monday on
  or before the first of the anchor's month. Each cell carries its date, an `inMonth` flag,
  an `isToday` flag, and the day's events (capped, with a "+N" overflow count). Mirrors the
  prototype's `monthCells`.
- A `tzDateKey(date, tz)` helper (YYYY-MM-DD in the display timezone) groups occurrences to
  calendar days for the month grid.

**Test** (`apps/display/src/view.test.ts`): the describe text contains **"day and month
view"** so `docs/verification-map.json` (FR-VIEW-3 → display) resolves. It asserts `buildDay`
keeps only today's occurrences with correct minutes, and `buildMonth` places an event in the
right cell with correct `inMonth`/`isToday` flags and overflow counting.

---

## 4. `apps/api` — the active view setting

- `GET /config` gains `activeView` (read from `display_setting`, seeding the row to `week`
  if absent), alongside the existing `timezone`, `startHour`, `endHour`.
- `PATCH /display` `{ activeView }` validates against day/week/month, updates the row, and
  broadcasts `{ type: "display.changed" }` so the display switches live.
- `GET /display` returns the current setting (admin reads it to show the active control).

Migration 0003 adds the table; a small `repo/display.ts` holds the get/seed/update.

---

## 5. `apps/display` — day and month views, live switching

- **App** reads `config.activeView` and computes the fetch window per view: `day` → today,
  `week` → the current Mon–Sun week (existing), `month` → the 42 cell grid range. It fetches
  occurrences for that window and renders the matching component. On a `display.changed`
  message it refetches config and occurrences and switches.
- **DayView**: a single tall day column (the prototype uses a taller hour pixel for day),
  the now line, and the now/next card, reusing `buildDay`.
- **MonthView**: the 42 cell grid with per day event chips (up to three, then "+N"), today
  highlighted, out of month days dimmed, matching the prototype's `monthCells`. No now line
  in month view.
- **WeekView** stays as is, refactored onto the new tokens.

## 6. `apps/admin` — the view switcher

A small segmented control (Day / Week / Month) in the admin header that reads `GET /display`
and calls `PATCH /display` on change, so Adam flips the wall display's view from his desk
(US-VIEW2). Reflects the current setting.

## 7. Polish — shared theme tokens

- **`apps/display/src/theme.ts`**: a tokens module — `colors` (background `#161118`, accent
  `#7C6CF6`, teal `#3FB8AF`, red `#FF6B6B`, amber, text and surface/border shades), `radii`,
  `space`, and `font` sizes, all lifted from the prototype. A couple of tiny style helpers
  (e.g. `card`, `hexA(color, alpha)`).
- Refactor `WeekView`, `DayView`, `MonthView`, `SidePanel`, `Takeover`, and `App` to read
  these tokens instead of inline hex, and tighten spacing, type scale, the now line, the
  focus card, and the Pomodoro ring to match the prototype side by side. This is
  transcription against the mockup, the work the roadmap calls "glanceability".
- The admin gets light touch styling only; it is a control surface, not the wall display.

---

## 8. Verification map mapping

| Req | type | test file | test name contains |
| --- | --- | --- | --- |
| FR-VIEW-3 | auto+review | display | day and month view |

The polish is verified by review (matching the prototype) and the manual on screen check,
not a new automated row. After the slice, `node scripts/verify-status.mjs` flips FR-VIEW-3 to
PASS, completing the automated suite (21 of 21).

---

## 9. Vertical slice order

1. `display`: `buildDay`, `buildMonth`, `tzDateKey` + the "day and month view" test
   (FR-VIEW-3 auto).
2. `api`: migration 0003, `display_setting`, `GET/PATCH /display`, `activeView` in `/config`.
3. `display`: DayView + MonthView components; App view switching + per view windows; live
   refetch on `display.changed`.
4. `admin`: the Day/Week/Month switcher.
5. polish: `theme.ts` tokens; refactor the display components onto tokens and tighten to the
   prototype.
6. doc sync (`definition-of-done` note) and regenerate STATUS.

I will build the phase in this order, running `pnpm check` and the generator as I go, then
present it for review. Say the word if you would rather I stop after each slice.

---

## 10. Acceptance criteria and open items

**Phase 3 is done when:** switching the active view in admin changes the display within about
a second to day, week, or month, each centered on now; the day view shows today's events in a
single column with the now line; the month view shows the correct 6×7 grid with event chips,
today highlighted and out of month days dimmed; the display visually matches the prototype
closely (reviewed side by side, in both orientations); and `docs/STATUS.md` shows FR-VIEW-3
PASS with the full automated suite green.

**Resolved decisions:**

1. **Month overflow.** Each day cell shows up to three event chips, then a "+N" count for the
   rest, matching the prototype.
2. **Day view hour range.** The day view reuses the configured `startHour`/`endHour` (not a
   full 24 hours), for consistency with the week view.
3. **Dimming.** Deferred to a later phase. Tracked here so it is not dropped; not in Phase 3
   scope.

---

**Ready for review.** Nothing is implemented; this plan is the only artifact. On your
approval (and any notes on §10) I will build Phase 3 slice by slice and leave the tree
uncommitted for you to review and commit.
