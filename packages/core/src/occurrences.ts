// Pure recurrence expansion. No clock, no IO: every instant is passed in
// (see .claude/memory/decisions/datetime-recurrence-model.md and core-stays-pure).
//
// Phase 0 ships the minimal non-recurring path with one smoke test. Real RFC 5545
// RRULE expansion and override application arrive in Phase 1 (FR-CAL-6), via the
// `rrule` library, behind this same signature.

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

/**
 * Expand an event into concrete occurrences within `window`.
 *
 * `now` is part of the settled contract (it anchors relative/now-aware rules lifted
 * from the prototype later) and is threaded through even though the Phase 0 minimal
 * path does not branch on it yet.
 */
export function expandOccurrences(
  input: RecurrenceInput,
  window: Window,
  now: Date,
): Occurrence[] {
  // Reserved for Phase 1+ now-aware expansion; referenced so the contract is explicit.
  void now;

  if (input.rrule !== null) {
    throw new Error(
      "expandOccurrences: RRULE expansion lands in Phase 1 (FR-CAL-6); Phase 0 handles single events only.",
    );
  }

  if (!overlaps(input.start, input.end, window.from, window.to)) {
    return [];
  }

  return [
    {
      start: input.start,
      end: input.end,
      isOverride: false,
      cancelled: false,
    },
  ];
}
