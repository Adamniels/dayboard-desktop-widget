// Pure recurrence expansion. No clock, no IO: every instant is passed in
// (see .claude/memory/decisions/datetime-recurrence-model.md and core-stays-pure).
//
// Recurrence is an RFC 5545 RRULE string, expanded with the pure `rrule` library and
// anchored at the event start. v1 expands relative to the start instant; occurrences keep
// the event's duration. A known v1 simplification: wall-clock time can shift by an hour
// across a DST boundary because expansion is offset-based, not timezone-aware. This is
// acceptable for read-only Google recurrence display; timezone-aware expansion (rrule +
// a tz library) is a later refinement if it ever bites.
// rrule ships as CommonJS. Bundlers (Vite, esbuild/vitest) expose its named exports, but
// Node's ESM loader only reaches them through the default. Read from the namespace and
// fall back to default so the same code works in the browser, under tsx, and in tests.
import * as rruleNs from "rrule";

const rrulestr =
  rruleNs.rrulestr ?? (rruleNs as unknown as { default: { rrulestr: typeof rruleNs.rrulestr } }).default.rrulestr;

/** A recurrence exception, keyed by the original occurrence instant. */
export interface OccurrenceOverride {
  occurrenceStart: Date;
  cancelled: boolean;
  start?: Date | null;
  end?: Date | null;
}

export interface RecurrenceInput {
  /** DTSTART instant. */
  start: Date;
  /** Gives the occurrence duration (end - start). */
  end: Date;
  /** IANA timezone, e.g. "America/Denver". */
  timezone: string;
  /** RFC 5545 RRULE string; null = a single occurrence. */
  rrule: string | null;
  overrides?: OccurrenceOverride[];
}

export interface Window {
  from: Date;
  to: Date;
}

export interface Occurrence {
  start: Date;
  end: Date;
  isOverride: boolean;
  cancelled: boolean;
}

/** Half-open overlap: [aStart, aEnd) intersects [bStart, bEnd). */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

/** Build the recurrence start instants that could overlap the window. */
function recurringStarts(input: RecurrenceInput, window: Window, durationMs: number): Date[] {
  const ruleText = input.rrule!.startsWith("RRULE:") ? input.rrule! : `RRULE:${input.rrule!}`;
  const rule = rrulestr(ruleText, { dtstart: input.start });
  // Widen the lower bound by the duration so an occurrence that starts before the window
  // but is still running inside it is included.
  const after = new Date(window.from.getTime() - durationMs);
  return rule.between(after, window.to, true);
}

/**
 * Expand an event into concrete occurrences within `window`.
 *
 * `now` is part of the settled contract (it anchors relative/now-aware rules lifted from
 * the prototype) and is threaded through; the expansion itself is independent of it.
 */
export function expandOccurrences(
  input: RecurrenceInput,
  window: Window,
  now: Date,
): Occurrence[] {
  void now;

  const durationMs = input.end.getTime() - input.start.getTime();
  const overridesByTime = new Map<number, OccurrenceOverride>();
  for (const o of input.overrides ?? []) {
    overridesByTime.set(o.occurrenceStart.getTime(), o);
  }

  const starts = input.rrule === null ? [input.start] : recurringStarts(input, window, durationMs);

  const occurrences: Occurrence[] = [];
  for (const occurrenceStart of starts) {
    const override = overridesByTime.get(occurrenceStart.getTime());
    if (override?.cancelled) continue;

    const start = override?.start ?? occurrenceStart;
    const end = override?.end ?? new Date(occurrenceStart.getTime() + durationMs);
    if (!overlaps(start, end, window.from, window.to)) continue;

    occurrences.push({ start, end, isOverride: override != null, cancelled: false });
  }

  occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
  return occurrences;
}
