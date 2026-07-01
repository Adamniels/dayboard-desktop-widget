---
name: display-now-following-scroll
description: Display day/week grids span the full 00:00-24:00 day and scroll to keep the now line centered, clamped to the day edges (nowScrollTop + useNowScroll)
type: context
---

The display's day and week grids render the full 00:00-24:00 day at a fixed hour height (54px
week, 64px day) and scroll so the now line stays centered in the viewport, clamped so the window
never scrolls above midnight or below 24:00. When the clamp bites the line rides off-center: high
in the early morning (window pinned to the top), low late at night (pinned to the bottom),
centered midday. The math is the pure, tested `nowScrollTop(nowMinutes, hourPx, viewportHeight)`
in `apps/display/src/view.ts` (returns clamped `scrollTop` + on-screen `lineTop`); the imperative
scroll lives in the `useNowScroll` hook, run each render so it re-centers on the minute tick and
on orientation changes. The month view is unaffected.

The display's `startHour`/`endHour` config no longer drives these grids (they always span the
full day); the field remains but is unused by day/week. Related: [[display-active-view-setting]],
[[display-theme-tokens]].
