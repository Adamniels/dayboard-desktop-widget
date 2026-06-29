// Integration tests (FR-EVT-1, FR-CAL-1, FR-CAL-2, FR-RT-1, NFR-REL-1). These need
// Postgres and so run on Adam's machine via `pnpm check`, not in the Cowork sandbox. The
// Google client is mocked; the database is real (dayboard_test, migrated by global-setup).
import type { AddressInfo } from "node:net";
import { schema } from "@dayboard/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("./sync/client", () => ({
  authedClient: vi.fn(async () => ({})),
  calendarApi: vi.fn(async () => ({})),
  pullChanges: vi.fn(async () => ({ changes: [], nextSyncToken: "tok-1" })),
  pushEvent: vi.fn(async () => ({ id: "g-pushed", etag: "etag-1" })),
  deleteEvent: vi.fn(async () => {}),
}));

import { db, pool } from "./db";
import { createEvent, listOccurrences } from "./repo/events";
import { getCredential, saveCalendarSelection, upsertCredential } from "./repo/google";
import { buildServer } from "./server";
import * as client from "./sync/client";
import { runSyncOnce } from "./sync/engine";

const { event, eventOverride, googleCalendar, googleCredential, project } = schema;

async function resetDb(): Promise<void> {
  await db.delete(eventOverride);
  await db.delete(event);
  await db.delete(googleCalendar);
  await db.delete(googleCredential);
  await db.delete(project);
}

beforeEach(async () => {
  vi.clearAllMocks();
  (client.pullChanges as unknown as Mock).mockResolvedValue({ changes: [], nextSyncToken: "tok-1" });
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

const sampleEvent = {
  title: "Deep work",
  type: "block" as const,
  start: "2026-06-29T15:00:00.000Z",
  end: "2026-06-29T16:00:00.000Z",
  timezone: "America/Denver",
};

describe("event crud", () => {
  it("creates, reads, updates, and deletes an event", async () => {
    const app = await buildServer();
    await app.ready();

    const created = await app.inject({ method: "POST", url: "/events", payload: sampleEvent });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;

    const listed = await app.inject({
      method: "GET",
      url: "/events?from=2026-06-29T00:00:00.000Z&to=2026-06-30T00:00:00.000Z",
    });
    expect(listed.json().some((o: { eventId: string }) => o.eventId === id)).toBe(true);

    const patched = await app.inject({ method: "PATCH", url: `/events/${id}`, payload: { title: "Focus" } });
    expect(patched.json().title).toBe("Focus");

    const deleted = await app.inject({ method: "DELETE", url: `/events/${id}` });
    expect(deleted.statusCode).toBe(204);

    await app.close();
  });
});

describe("websocket pushes change", () => {
  it("emits a change message when an event is created", async () => {
    const app: FastifyInstance = await buildServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const { port } = app.server.address() as AddressInfo;

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise((resolve) => (ws.onopen = () => resolve(null)));
    const message = new Promise<string>((resolve) => (ws.onmessage = (e) => resolve(String(e.data))));

    await app.inject({ method: "POST", url: "/events", payload: sampleEvent });

    const payload = JSON.parse(await message);
    expect(payload.type).toBe("events.changed");

    ws.close();
    await app.close();
  });
});

describe("google connect stores tokens", () => {
  it("persists and reads back the refresh token", async () => {
    await upsertCredential({
      accountEmail: "adam@example.com",
      refreshToken: "refresh-xyz",
      accessToken: "access-abc",
      scope: "https://www.googleapis.com/auth/calendar",
    });
    const credential = await getCredential();
    expect(credential?.accountEmail).toBe("adam@example.com");
    expect(credential?.refreshToken).toBe("refresh-xyz");
  });
});

describe("initial sync imports events", () => {
  it("imports a Google event into the local database", async () => {
    await upsertCredential({
      accountEmail: "adam@example.com",
      refreshToken: "refresh-xyz",
      scope: "https://www.googleapis.com/auth/calendar",
    });
    await saveCalendarSelection([{ id: "cal-primary", summary: "Primary", primaryWrite: true }]);

    (client.pullChanges as unknown as Mock).mockResolvedValue({
      nextSyncToken: "tok-2",
      changes: [
        {
          googleEventId: "g-1",
          deleted: false,
          event: {
            googleEventId: "g-1",
            title: "Imported meeting",
            description: null,
            start: new Date("2026-06-29T18:00:00.000Z"),
            end: new Date("2026-06-29T19:00:00.000Z"),
            timezone: "America/Denver",
            rrule: null,
            updatedAt: new Date("2026-06-20T10:00:00.000Z"),
          },
        },
      ],
    });

    await runSyncOnce();

    const occ = await listOccurrences(
      new Date("2026-06-29T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
      new Date("2026-06-29T12:00:00.000Z"),
    );
    const imported = occ.find((o) => o.googleEventId === "g-1");
    expect(imported?.title).toBe("Imported meeting");
    expect(imported?.type).toBe("general");
  });
});

describe("works when google unreachable", () => {
  it("keeps local reads and writes working when a sync fails", async () => {
    await saveCalendarSelection([{ id: "cal-primary", summary: "Primary", primaryWrite: true }]);
    (client.pullChanges as unknown as Mock).mockRejectedValue(new Error("network down"));

    await expect(runSyncOnce()).rejects.toThrow();

    // The local database still serves CRUD.
    await createEvent({
      title: "Local only",
      type: "block",
      start: new Date("2026-06-29T15:00:00.000Z"),
      end: new Date("2026-06-29T16:00:00.000Z"),
      timezone: "America/Denver",
    });
    const occ = await listOccurrences(
      new Date("2026-06-29T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
      new Date("2026-06-29T12:00:00.000Z"),
    );
    expect(occ.some((o) => o.title === "Local only")).toBe(true);
  });
});
