// Pure bucketing for the day and month views (FR-VIEW-3). Like buildWeek in week.ts, these
// turn occurrence instants into positioned buckets in the display timezone, kept pure and
// tested; the React layer only turns the results into pixels. No clock or IO lives here —
// "today"/the month anchor is passed in, mirroring the core-stays-pure discipline.
import type { OccurrenceDTO } from "./types";
import { tzParts } from "./week";

/** YYYY-MM-DD of an instant as seen in the display timezone. Groups occurrences to days. */
export function tzDateKey(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export interface NowScroll {
  /** Pixels to scroll the full-day grid so the now line is centered, clamped to the day. */
  scrollTop: number;
  /** Resulting on-screen position of the now line inside the viewport (px from its top). */
  lineTop: number;
}

/**
 * Where to scroll a full 00:00–24:00 grid so the now line sits centered in the viewport, but
 * never scrolling above midnight or below the end of day (FR-VIEW day/week follow-now). When
 * the clamp bites — early morning or late night — the line rides off-center instead; in the
 * middle of the day it lands at the exact center. Pure, so the math is unit tested.
 */
export function nowScrollTop(nowMinutes: number, hourPx: number, viewportHeight: number, totalHours = 24): NowScroll {
  const gridHeight = totalHours * hourPx;
  const nowY = (nowMinutes / 60) * hourPx;
  const maxScroll = Math.max(0, gridHeight - viewportHeight);
  const scrollTop = Math.max(0, Math.min(nowY - viewportHeight / 2, maxScroll));
  return { scrollTop, lineTop: nowY - scrollTop };
}

export interface DayEvent {
  eventId: string;
  title: string;
  type: OccurrenceDTO["type"];
  startMinutes: number;
  endMinutes: number;
  isOverride: boolean;
}

export interface DayModel {
  events: DayEvent[];
}

/**
 * Today's occurrences (in the display timezone), positioned by minute offset for a single
 * column. `now` decides which calendar day is "today"; it is passed in so the function stays
 * pure and deterministic in tests, defaulting to the real clock for callers.
 */
export function buildDay(occurrences: OccurrenceDTO[], timezone: string, now: Date = new Date()): DayModel {
  const todayKey = tzDateKey(now, timezone);
  const events = occurrences
    .filter((o) => tzDateKey(new Date(o.start), timezone) === todayKey)
    .map((o) => {
      const start = tzParts(new Date(o.start), timezone);
      const end = tzParts(new Date(o.end), timezone);
      const startMinutes = start.hour * 60 + start.minute;
      let endMinutes = end.hour * 60 + end.minute;
      // An end at or before the start (runs to/over midnight) clamps to end of day.
      if (endMinutes <= startMinutes) endMinutes = 24 * 60;
      return {
        eventId: o.eventId,
        title: o.title,
        type: o.type,
        startMinutes,
        endMinutes,
        isOverride: o.isOverride,
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);
  return { events };
}

export interface MonthEvent {
  eventId: string;
  title: string;
  type: OccurrenceDTO["type"];
}

export interface MonthCell {
  dateKey: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  events: MonthEvent[];
  overflow: number;
}

export interface MonthModel {
  cells: MonthCell[];
}

const MAX_CHIPS = 3;

function ymdUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * A 6×7 = 42 cell month grid starting on the Monday on or before the first of `anchor`'s
 * month (as seen in the display timezone). `anchor` doubles as "now": its month is the grid,
 * and its day is highlighted as today — matching the prototype's monthCells. Each cell keeps
 * up to three event chips with an overflow count for the rest.
 */
export function buildMonth(occurrences: OccurrenceDTO[], timezone: string, anchor: Date): MonthModel {
  const todayKey = tzDateKey(anchor, timezone);
  const [yearStr, monthStr] = todayKey.split("-");
  const year = Number(yearStr);
  const month0 = Number(monthStr) - 1;

  // Bucket occurrences by their timezone calendar day.
  const byDate = new Map<string, MonthEvent[]>();
  for (const o of occurrences) {
    const key = tzDateKey(new Date(o.start), timezone);
    const list = byDate.get(key) ?? [];
    list.push({ eventId: o.eventId, title: o.title, type: o.type });
    byDate.set(key, list);
  }

  // The grid is a pure calendar computation on UTC dates (labels, never instants), so it is
  // DST-safe; only the occurrence and today keys above involve timezone conversion.
  const firstWeekday = new Date(Date.UTC(year, month0, 1)).getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (firstWeekday + 6) % 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(year, month0, 1 - mondayOffset + i));
    const dateKey = ymdUTC(d);
    const all = byDate.get(dateKey) ?? [];
    cells.push({
      dateKey,
      dayNum: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month0,
      isToday: dateKey === todayKey,
      events: all.slice(0, MAX_CHIPS),
      overflow: Math.max(0, all.length - MAX_CHIPS),
    });
  }
  return { cells };
}
