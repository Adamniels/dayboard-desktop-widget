import { describe, expect, it } from "vitest";
import { expandOccurrences, type RecurrenceInput, type Window } from "./occurrences";

// Phase 0 smoke test only. Named so it does NOT match any matcher in
// docs/verification-map.json (in particular it avoids the phrase
// "recurrence expands occurrences", which belongs to FR-CAL-6). Phase 0 must satisfy
// no requirement; STATUS.md should stay all NO TEST.
describe("expandOccurrences", () => {
  const base: RecurrenceInput = {
    start: new Date("2026-06-29T15:00:00.000Z"),
    end: new Date("2026-06-29T16:00:00.000Z"),
    timezone: "America/Denver",
    rrule: null,
  };
  const now = new Date("2026-06-29T12:00:00.000Z");

  it("smoke: single non recurring event maps to one occurrence in window", () => {
    const window: Window = {
      from: new Date("2026-06-29T00:00:00.000Z"),
      to: new Date("2026-06-30T00:00:00.000Z"),
    };
    const result = expandOccurrences(base, window, now);
    expect(result).toHaveLength(1);
    expect(result[0]?.start.toISOString()).toBe("2026-06-29T15:00:00.000Z");
    expect(result[0]?.end.toISOString()).toBe("2026-06-29T16:00:00.000Z");
    expect(result[0]?.isOverride).toBe(false);
  });

  it("smoke: event outside the window yields no occurrence", () => {
    const window: Window = {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-07-02T00:00:00.000Z"),
    };
    expect(expandOccurrences(base, window, now)).toHaveLength(0);
  });
});
