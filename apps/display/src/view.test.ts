import { describe, expect, it } from "vitest";
import type { OccurrenceDTO } from "./types";
import { buildDay, buildMonth, nowScrollTop, tzDateKey } from "./view";

function occ(partial: Partial<OccurrenceDTO> & Pick<OccurrenceDTO, "start" | "end">): OccurrenceDTO {
  return {
    eventId: "e1",
    title: "Deep work",
    type: "block",
    projectId: null,
    projectColor: null,
    isOverride: false,
    recurring: false,
    googleEventId: null,
    ...partial,
  };
}

// FR-VIEW-3: the day and month view builders bucket occurrences correctly. The describe text
// contains "day and month view" so docs/verification-map.json resolves it to this suite.
describe("day and month view", () => {
  const tz = "America/Denver"; // June = MDT (UTC-6)
  // 2026-06-30 18:00Z is Tuesday 12:00 in Denver.
  const now = new Date("2026-06-30T18:00:00.000Z");

  describe("buildDay", () => {
    it("keeps only today's occurrences and computes minute offsets", () => {
      const model = buildDay(
        [
          occ({ eventId: "today", start: "2026-06-30T15:00:00.000Z", end: "2026-06-30T16:00:00.000Z" }), // 09:00–10:00 MDT
          // 04:00Z is the same UTC calendar day but 22:00 MDT the *previous* day — must be excluded.
          occ({ eventId: "yesterday", start: "2026-06-30T04:00:00.000Z", end: "2026-06-30T05:00:00.000Z" }),
          occ({ eventId: "tomorrow", start: "2026-07-01T15:00:00.000Z", end: "2026-07-01T16:00:00.000Z" }),
        ],
        tz,
        now,
      );
      expect(model.events).toHaveLength(1);
      expect(model.events[0]).toMatchObject({ eventId: "today", startMinutes: 540, endMinutes: 600 });
    });

    it("clamps an occurrence that runs past midnight to end of day", () => {
      const model = buildDay(
        [occ({ start: "2026-07-01T04:30:00.000Z", end: "2026-07-01T06:30:00.000Z" })], // 22:30 MDT -> 00:30 MDT next day
        tz,
        now,
      );
      expect(model.events[0]).toMatchObject({ startMinutes: 22 * 60 + 30, endMinutes: 24 * 60 });
    });
  });

  describe("buildMonth", () => {
    it("builds a 42 cell grid with the anchor's month flagged inMonth", () => {
      const model = buildMonth([], tz, now);
      expect(model.cells).toHaveLength(42);
      // June has 30 days; exactly those carry inMonth.
      expect(model.cells.filter((c) => c.inMonth)).toHaveLength(30);
      // The grid begins on a Monday and the first cell precedes/opens the month.
      expect(model.cells[0]!.dateKey <= "2026-06-01").toBe(true);
    });

    it("places an event in the correct cell with the right flags", () => {
      const model = buildMonth(
        [occ({ eventId: "mid", title: "Review", start: "2026-06-15T18:00:00.000Z", end: "2026-06-15T19:00:00.000Z" })],
        tz,
        now,
      );
      const cell = model.cells.find((c) => c.dateKey === "2026-06-15");
      expect(cell).toBeDefined();
      expect(cell!).toMatchObject({ dayNum: 15, inMonth: true, isToday: false });
      expect(cell!.events.map((e) => e.eventId)).toEqual(["mid"]);
    });

    it("highlights exactly one cell as today", () => {
      const model = buildMonth([], tz, now);
      const todays = model.cells.filter((c) => c.isToday);
      expect(todays).toHaveLength(1);
      expect(todays[0]!.dateKey).toBe("2026-06-30");
    });

    it("caps chips at three and counts the overflow", () => {
      const many = Array.from({ length: 5 }, (_, i) =>
        occ({ eventId: `e${i}`, start: "2026-06-20T18:00:00.000Z", end: "2026-06-20T19:00:00.000Z" }),
      );
      const model = buildMonth(many, tz, now);
      const cell = model.cells.find((c) => c.dateKey === "2026-06-20");
      expect(cell!.events).toHaveLength(3);
      expect(cell!.overflow).toBe(2);
    });
  });

  // The full-day grid follows now, centered when it can, pinned to the day edges otherwise.
  describe("now-following scroll window", () => {
    const HOUR = 54; // week hour height
    const VH = 600; // viewport height
    // gridHeight = 24 * 54 = 1296; maxScroll = 1296 - 600 = 696

    it("centers the now line in the middle of the day", () => {
      const { scrollTop, lineTop } = nowScrollTop(12 * 60, HOUR, VH); // noon, nowY = 648
      expect(scrollTop).toBe(348); // 648 - 300
      expect(lineTop).toBe(300); // centered
    });

    it("pins to the top in the early morning so the line rides high", () => {
      const { scrollTop, lineTop } = nowScrollTop(60, HOUR, VH); // 01:00, nowY = 54
      expect(scrollTop).toBe(0); // cannot scroll above midnight
      expect(lineTop).toBe(54); // above center
    });

    it("pins to the bottom late at night so the line rides low", () => {
      const { scrollTop, lineTop } = nowScrollTop(23 * 60, HOUR, VH); // 23:00, nowY = 1242
      expect(scrollTop).toBe(696); // clamped to maxScroll
      expect(lineTop).toBe(546); // below center, near the bottom
    });

    it("does not scroll when the whole day already fits", () => {
      const { scrollTop } = nowScrollTop(12 * 60, HOUR, 2000); // viewport taller than the grid
      expect(scrollTop).toBe(0);
    });
  });

  it("tzDateKey formats the instant in the display timezone", () => {
    // 02:00Z on July 1 is still 20:00 MDT on June 30.
    expect(tzDateKey(new Date("2026-07-01T02:00:00.000Z"), tz)).toBe("2026-06-30");
  });
});
