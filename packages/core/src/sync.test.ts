import { describe, expect, it } from "vitest";
import {
  buildGooglePush,
  reconcile,
  resolveConflict,
  type RemoteBatch,
  type SyncEvent,
} from "./sync";

function remoteEvent(gid: string, updatedIso: string): SyncEvent {
  return {
    googleEventId: gid,
    title: `event ${gid}`,
    start: new Date("2026-06-29T15:00:00.000Z"),
    end: new Date("2026-06-29T16:00:00.000Z"),
    timezone: "America/Denver",
    rrule: null,
    updatedAt: new Date(updatedIso),
  };
}

describe("last write wins", () => {
  it("picks the newer side by updatedAt", () => {
    const local = { updatedAt: new Date("2026-06-29T10:00:00.000Z") };
    const remote = { updatedAt: new Date("2026-06-29T11:00:00.000Z") };
    expect(resolveConflict(local, remote)).toBe("remote");
    expect(resolveConflict(remote, local)).toBe("local");
  });

  it("keeps local on a tie", () => {
    const t = new Date("2026-06-29T10:00:00.000Z");
    expect(resolveConflict({ updatedAt: t }, { updatedAt: new Date(t) })).toBe("local");
  });
});

describe("reconcile applies remote changes", () => {
  it("inserts unknown events, deletes cancelled, and respects last-write-wins", () => {
    const local = [
      { googleEventId: "g-known", updatedAt: new Date("2026-06-29T12:00:00.000Z") },
      { googleEventId: "g-localnewer", updatedAt: new Date("2026-06-29T18:00:00.000Z") },
    ];
    const remote: RemoteBatch = {
      nextSyncToken: "tok-2",
      changes: [
        { googleEventId: "g-new", deleted: false, event: remoteEvent("g-new", "2026-06-29T09:00:00.000Z") },
        { googleEventId: "g-known", deleted: false, event: remoteEvent("g-known", "2026-06-29T13:00:00.000Z") },
        { googleEventId: "g-localnewer", deleted: false, event: remoteEvent("g-localnewer", "2026-06-29T17:00:00.000Z") },
        { googleEventId: "g-gone", deleted: true },
      ],
    };

    const plan = reconcile(local, remote);
    expect(plan.upserts.map((e) => e.googleEventId).sort()).toEqual(["g-known", "g-new"]);
    expect(plan.deletes).toEqual(["g-gone"]);
    expect(plan.syncToken).toBe("tok-2");
  });
});

describe("local change produces google push", () => {
  it("maps a one-off event to the Google write payload", () => {
    const payload = buildGooglePush({
      title: "Deep work",
      description: "focus",
      start: new Date("2026-06-29T15:00:00.000Z"),
      end: new Date("2026-06-29T16:00:00.000Z"),
      timezone: "America/Denver",
      rrule: null,
    });
    expect(payload).toEqual({
      summary: "Deep work",
      description: "focus",
      start: { dateTime: "2026-06-29T15:00:00.000Z", timeZone: "America/Denver" },
      end: { dateTime: "2026-06-29T16:00:00.000Z", timeZone: "America/Denver" },
    });
  });

  it("passes an RRULE through as the recurrence array", () => {
    const payload = buildGooglePush({
      title: "Standup",
      start: new Date("2026-06-29T15:00:00.000Z"),
      end: new Date("2026-06-29T15:15:00.000Z"),
      timezone: "America/Denver",
      rrule: "FREQ=WEEKLY;BYDAY=MO",
    });
    expect(payload.recurrence).toEqual(["RRULE:FREQ=WEEKLY;BYDAY=MO"]);
  });
});
