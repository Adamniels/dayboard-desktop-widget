// Pure bucketing for the weekly grid (FR-VIEW-1). Converts occurrence instants into a
// day column (Mon=0..Sun=6) and minute offsets in the display timezone, so the grid can
// position them. Kept pure and tested; the React layer only turns minutes into pixels.
import type { OccurrenceDTO } from "./types";

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

interface TzParts {
  weekdayIndex: number;
  hour: number;
  minute: number;
}

/** Wall-clock parts of an instant in a given IANA timezone. */
export function tzParts(date: Date, timezone: string): TzParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  // hour12:false can render midnight as "24"; normalize to 0.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { weekdayIndex: WEEKDAY_INDEX[weekday] ?? 0, hour, minute };
}

export interface PositionedEvent {
  eventId: string;
  title: string;
  type: OccurrenceDTO["type"];
  projectColor: string | null;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  isOverride: boolean;
}

export interface WeekModel {
  events: PositionedEvent[];
}

/** Group occurrences into the week grid, in the display timezone. */
export function buildWeek(occurrences: OccurrenceDTO[], timezone: string): WeekModel {
  const events = occurrences.map((o) => {
    const start = tzParts(new Date(o.start), timezone);
    const end = tzParts(new Date(o.end), timezone);
    const startMinutes = start.hour * 60 + start.minute;
    let endMinutes = end.hour * 60 + end.minute;
    // An end at or before the start (event runs to/over midnight) clamps to end of day.
    if (endMinutes <= startMinutes) endMinutes = 24 * 60;
    return {
      eventId: o.eventId,
      title: o.title,
      type: o.type,
      projectColor: o.projectColor,
      dayIndex: start.weekdayIndex,
      startMinutes,
      endMinutes,
      isOverride: o.isOverride,
    };
  });
  return { events };
}
