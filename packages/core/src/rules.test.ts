import { describe, expect, it } from "vitest";
import type { Occurrence } from "./occurrences";
import { nowNext } from "./rules";

function occ(startIso: string, endIso: string): Occurrence {
  return { start: new Date(startIso), end: new Date(endIso), isOverride: false, cancelled: false };
}

describe("nowNext", () => {
  const occurrences = [
    occ("2026-06-29T09:00:00.000Z", "2026-06-29T10:00:00.000Z"),
    occ("2026-06-29T14:00:00.000Z", "2026-06-29T15:00:00.000Z"),
    occ("2026-06-29T16:00:00.000Z", "2026-06-29T17:00:00.000Z"),
  ];

  it("returns the occurrence containing now as current", () => {
    const { current } = nowNext(new Date("2026-06-29T14:30:00.000Z"), occurrences);
    expect(current?.start.toISOString()).toBe("2026-06-29T14:00:00.000Z");
  });

  it("returns the soonest future occurrence as next", () => {
    const { next } = nowNext(new Date("2026-06-29T14:30:00.000Z"), occurrences);
    expect(next?.start.toISOString()).toBe("2026-06-29T16:00:00.000Z");
  });

  it("has no current in a gap between occurrences", () => {
    const { current, next } = nowNext(new Date("2026-06-29T12:00:00.000Z"), occurrences);
    expect(current).toBeNull();
    expect(next?.start.toISOString()).toBe("2026-06-29T14:00:00.000Z");
  });
});
