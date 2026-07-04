import { describe, expect, it } from "vitest";
import { isoToLocalInput, moveResizeToPatch, occurrencesToEvents, selectionToDraft } from "./calendar-model";
import type { OccurrenceDTO } from "./types";

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

// FR-EVT-3: the admin's interactive week calendar. The describe text contains "interactive
// week calendar" so docs/verification-map.json resolves it to this suite.
describe("interactive week calendar", () => {
  describe("occurrencesToEvents", () => {
    it("colors by type and keeps the underlying event id", () => {
      const [ev] = occurrencesToEvents([
        occ({ eventId: "abc", type: "block", start: "2026-06-30T15:00:00.000Z", end: "2026-06-30T16:00:00.000Z" }),
      ]);
      expect(ev).toMatchObject({ backgroundColor: "#3FB8AF", borderColor: "#3FB8AF", editable: true });
      expect(ev!.extendedProps.eventId).toBe("abc");
      expect(ev!.id).toContain("abc");
    });

    it("locks recurring occurrences from dragging (recurrence read-only, FR-CAL-6)", () => {
      const [ev] = occurrencesToEvents([
        occ({ type: "meeting", recurring: true, start: "2026-06-30T15:00:00.000Z", end: "2026-06-30T15:30:00.000Z" }),
      ]);
      expect(ev).toMatchObject({ backgroundColor: "#7C6CF6", editable: false });
    });

    it("keeps non-recurring events movable and colors general events", () => {
      const [ev] = occurrencesToEvents([
        occ({ type: "general", googleEventId: "g1", recurring: false, start: "2026-06-30T15:00:00.000Z", end: "2026-06-30T16:00:00.000Z" }),
      ]);
      expect(ev).toMatchObject({ backgroundColor: "#8E8AAE", editable: true });
    });
  });

  describe("selectionToDraft", () => {
    it("defaults a new event to a block and prefills the dragged times", () => {
      const draft = selectionToDraft("2026-06-30T15:00:00.000Z", "2026-06-30T17:00:00.000Z");
      expect(draft.type).toBe("block");
      expect(draft.start).toBe(isoToLocalInput("2026-06-30T15:00:00.000Z"));
      expect(draft.end).toBe(isoToLocalInput("2026-06-30T17:00:00.000Z"));
      expect(draft.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe("moveResizeToPatch", () => {
    it("passes a normal move/resize straight through as ISO", () => {
      expect(moveResizeToPatch("2026-06-30T15:00:00.000Z", "2026-06-30T16:30:00.000Z")).toEqual({
        start: "2026-06-30T15:00:00.000Z",
        end: "2026-06-30T16:30:00.000Z",
      });
    });

    it("enforces a 30-minute minimum duration on a collapsed drag", () => {
      expect(moveResizeToPatch("2026-06-30T15:00:00.000Z", "2026-06-30T15:10:00.000Z")).toEqual({
        start: "2026-06-30T15:00:00.000Z",
        end: "2026-06-30T15:30:00.000Z",
      });
    });
  });
});
