import { describe, expect, it } from "vitest";
import { expandOccurrences, type OccurrenceOverride, type RecurrenceInput, type Window } from "./occurrences";

const now = new Date("2026-06-29T12:00:00.000Z");

describe("expandOccurrences single events", () => {
  const base: RecurrenceInput = {
    start: new Date("2026-06-29T15:00:00.000Z"),
    end: new Date("2026-06-29T16:00:00.000Z"),
    timezone: "America/Denver",
    rrule: null,
  };

  it("maps a non recurring event to one occurrence in window", () => {
    const window: Window = {
      from: new Date("2026-06-29T00:00:00.000Z"),
      to: new Date("2026-06-30T00:00:00.000Z"),
    };
    const result = expandOccurrences(base, window, now);
    expect(result).toHaveLength(1);
    expect(result[0]?.start.toISOString()).toBe("2026-06-29T15:00:00.000Z");
    expect(result[0]?.end.toISOString()).toBe("2026-06-29T16:00:00.000Z");
  });

  it("yields no occurrence when the event is outside the window", () => {
    const window: Window = {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-07-02T00:00:00.000Z"),
    };
    expect(expandOccurrences(base, window, now)).toHaveLength(0);
  });
});

// FR-CAL-6: recurrence expands to occurrences. The describe text contains
// "recurrence expands occurrences" so docs/verification-map.json resolves it.
describe("recurrence expands occurrences", () => {
  // A 1-hour weekly event on Mondays, starting Mon 2026-06-29 15:00 UTC.
  const weekly: RecurrenceInput = {
    start: new Date("2026-06-29T15:00:00.000Z"),
    end: new Date("2026-06-29T16:00:00.000Z"),
    timezone: "America/Denver",
    rrule: "FREQ=WEEKLY;BYDAY=MO",
  };
  // Three weeks.
  const window: Window = {
    from: new Date("2026-06-29T00:00:00.000Z"),
    to: new Date("2026-07-20T00:00:00.000Z"),
  };

  it("produces one occurrence per recurrence in the window", () => {
    const result = expandOccurrences(weekly, window, now);
    expect(result.map((o) => o.start.toISOString())).toEqual([
      "2026-06-29T15:00:00.000Z",
      "2026-07-06T15:00:00.000Z",
      "2026-07-13T15:00:00.000Z",
    ]);
    expect(result.every((o) => o.end.getTime() - o.start.getTime() === 60 * 60 * 1000)).toBe(true);
  });

  it("removes a cancelled occurrence via an override", () => {
    const overrides: OccurrenceOverride[] = [
      { occurrenceStart: new Date("2026-07-06T15:00:00.000Z"), cancelled: true },
    ];
    const result = expandOccurrences({ ...weekly, overrides }, window, now);
    expect(result.map((o) => o.start.toISOString())).toEqual([
      "2026-06-29T15:00:00.000Z",
      "2026-07-13T15:00:00.000Z",
    ]);
  });

  it("moves an occurrence via an override and flags it", () => {
    const overrides: OccurrenceOverride[] = [
      {
        occurrenceStart: new Date("2026-07-06T15:00:00.000Z"),
        cancelled: false,
        start: new Date("2026-07-06T18:00:00.000Z"),
        end: new Date("2026-07-06T19:00:00.000Z"),
      },
    ];
    const result = expandOccurrences({ ...weekly, overrides }, window, now);
    const moved = result.find((o) => o.isOverride);
    expect(moved?.start.toISOString()).toBe("2026-07-06T18:00:00.000Z");
    expect(moved?.end.toISOString()).toBe("2026-07-06T19:00:00.000Z");
  });
});
