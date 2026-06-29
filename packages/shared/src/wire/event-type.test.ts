import { describe, expect, it } from "vitest";
import { EVENT_TYPES } from "../schema/index";
import { eventInsertSchema } from "./index";

// FR-EVT-2: event type is stored and validated. The test name contains
// "event type schema" so docs/verification-map.json resolves it.
describe("event type schema", () => {
  const valid = {
    title: "Deep work",
    type: "block" as const,
    start: new Date("2026-06-29T15:00:00.000Z"),
    end: new Date("2026-06-29T16:00:00.000Z"),
    timezone: "America/Denver",
  };

  it("accepts the three event types meeting, block, general", () => {
    expect(EVENT_TYPES).toEqual(["meeting", "block", "general"]);
    for (const type of EVENT_TYPES) {
      const result = eventInsertSchema.safeParse({ ...valid, type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown event type", () => {
    const result = eventInsertSchema.safeParse({ ...valid, type: "party" });
    expect(result.success).toBe(false);
  });

  it("requires a non-empty timezone", () => {
    const result = eventInsertSchema.safeParse({ ...valid, timezone: "" });
    expect(result.success).toBe(false);
  });
});
