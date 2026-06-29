// Read-only meta endpoints: display config and Google connection status.
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { getCredential, listCalendars } from "../repo/google";

export async function metaRoutes(app: FastifyInstance): Promise<void> {
  // The display reads the timezone and visible hour range from here.
  app.get("/config", async () => ({
    timezone: env.displayTimezone,
    startHour: env.startHour,
    endHour: env.endHour,
  }));

  app.get("/calendars", async () => {
    const calendars = await listCalendars();
    return calendars.map((c) => ({
      id: c.id,
      summary: c.summary,
      selected: c.selected,
      primaryWrite: c.primaryWrite,
      lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
    }));
  });

  app.get("/sync/status", async () => {
    const credential = await getCredential();
    const calendars = await listCalendars();
    const lastSyncedAt = calendars
      .map((c) => c.lastSyncedAt)
      .filter((d): d is Date => d != null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      connected: credential != null,
      account: credential?.accountEmail ?? null,
      lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
    };
  });
}
