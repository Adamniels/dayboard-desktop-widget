// Meta endpoints: display config, the admin-controlled active view, and Google status.
import { displayViewPatchSchema } from "@dayboard/shared";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { getSetting, setActiveView } from "../repo/display";
import { getCredential, listCalendars } from "../repo/google";
import { getSyncHealth, triggerSyncNow } from "../sync/engine";
import { broadcast } from "../ws";

export async function metaRoutes(app: FastifyInstance): Promise<void> {
  // The display reads the timezone, visible hour range, and active view from here.
  app.get("/config", async () => {
    const setting = await getSetting();
    return {
      timezone: env.displayTimezone,
      startHour: env.startHour,
      endHour: env.endHour,
      activeView: setting.activeView,
    };
  });

  // The active view the wall display shows. The admin reads it to reflect the current
  // control and patches it to switch the display.
  app.get("/display", async () => {
    const setting = await getSetting();
    return { activeView: setting.activeView, updatedAt: setting.updatedAt.toISOString() };
  });

  app.patch("/display", async (req, reply) => {
    const parsed = displayViewPatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const setting = await setActiveView(parsed.data.activeView);
    // Push so connected displays refetch config + occurrences and switch within ~1s.
    broadcast({ type: "display.changed" });
    return { activeView: setting.activeView, updatedAt: setting.updatedAt.toISOString() };
  });

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
    const health = getSyncHealth();
    return {
      connected: credential != null,
      account: credential?.accountEmail ?? null,
      lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
      lastAttemptAt: health.lastAttemptAt?.toISOString() ?? null,
      lastError: health.lastError,
    };
  });

  // Manual sync (FR-CAL: on-demand cycle). Returns the outcome so the admin can show
  // the real failure instead of a silently stale lastSyncedAt.
  app.post("/sync/now", async (_req, reply) => {
    const result = await triggerSyncNow();
    if (result.status === "error") return reply.code(502).send(result);
    if (result.status === "not_connected") return reply.code(409).send(result);
    return result; // ok | already_running
  });
}
