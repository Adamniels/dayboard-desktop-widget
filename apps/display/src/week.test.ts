import { describe, expect, it } from "vitest";
import type { OccurrenceDTO } from "./types";
import { buildWeek } from "./week";

function occ(partial: Partial<OccurrenceDTO> & Pick<OccurrenceDTO, "start" | "end">): OccurrenceDTO {
  return {
    eventId: "e1",
    title: "Deep work",
    type: "block",
    projectId: null,
    isOverride: false,
    recurring: false,
    googleEventId: null,
    ...partial,
  };
}

// FR-VIEW-1: the weekly view groups events into the right day/time slots. The describe
// text contains "weekly view groups events" so docs/verification-map.json resolves it.
describe("weekly view groups events", () => {
  const tz = "America/Denver"; // June = MDT (UTC-6)

  it("places an occurrence in the correct day column and minute offset", () => {
    // 2026-06-29 15:00Z is Monday 09:00 in Denver (UTC-6).
    const model = buildWeek([occ({ start: "2026-06-29T15:00:00.000Z", end: "2026-06-29T16:00:00.000Z" })], tz);
    expect(model.events).toHaveLength(1);
    expect(model.events[0]).toMatchObject({ dayIndex: 0, startMinutes: 540, endMinutes: 600 });
  });

  it("buckets events onto different days", () => {
    const model = buildWeek(
      [
        occ({ start: "2026-06-29T15:00:00.000Z", end: "2026-06-29T16:00:00.000Z" }), // Mon
        occ({ start: "2026-07-01T20:00:00.000Z", end: "2026-07-01T21:00:00.000Z" }), // Wed 14:00 MDT
      ],
      tz,
    );
    expect(model.events.map((e) => e.dayIndex).sort()).toEqual([0, 2]);
  });

  it("clamps an event that runs past midnight to end of day", () => {
    const model = buildWeek([occ({ start: "2026-06-30T05:00:00.000Z", end: "2026-06-30T07:00:00.000Z" })], tz);
    // 05:00Z = 23:00 MDT Mon; end 07:00Z = 01:00 MDT Tue -> clamps to 1440.
    expect(model.events[0]?.startMinutes).toBe(23 * 60);
    expect(model.events[0]?.endMinutes).toBe(24 * 60);
  });
});
