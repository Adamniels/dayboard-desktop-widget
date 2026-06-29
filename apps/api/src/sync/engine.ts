// The Google sync engine: poll (pull + reconcile + apply) and push, on a 45s loop. All
// decisions are pure (@dayboard/core); this orchestrates IO. Google errors are caught so
// the app keeps working offline against Postgres (NFR-REL-1).
import { buildGooglePush, reconcile } from "@dayboard/core";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../env";
import {
  deleteByGoogleId,
  hardDelete,
  listLocalRefs,
  listPendingDeletions,
  listPendingPush,
  markPushed,
  upsertRemote,
} from "../repo/events";
import { getPrimaryWriteCalendar, listSelectedCalendars, setCalendarSyncToken } from "../repo/google";
import { broadcast } from "../ws";
import {
  authedClient,
  calendarApi,
  deleteEvent,
  pullChanges,
  pushEvent,
} from "./client";

let running = false;

/** One full sync cycle. Returns true if any local data changed (so callers can broadcast). */
export async function runSyncOnce(): Promise<boolean> {
  const client = await authedClient();
  if (!client) return false; // not connected yet
  const api = await calendarApi(client);

  let changed = false;

  // --- pull each selected calendar -------------------------------------------------
  for (const cal of await listSelectedCalendars()) {
    const batch = await pullChanges(api, cal.id, cal.syncToken, env.displayTimezone);
    const localRefs = await listLocalRefs(cal.id);
    const plan = reconcile(localRefs, batch);

    for (const remote of plan.upserts) {
      await upsertRemote(cal.id, remote, null);
      changed = true;
    }
    for (const googleEventId of plan.deletes) {
      await deleteByGoogleId(googleEventId);
      changed = true;
    }
    // Persist the new token (null after a 410 forces a full resync next cycle).
    await setCalendarSyncToken(cal.id, plan.syncToken, new Date());
  }

  // --- push local changes ----------------------------------------------------------
  const primary = await getPrimaryWriteCalendar();

  for (const ev of await listPendingPush()) {
    // FR-CAL-6: Google recurring masters are read-only; never push their changes.
    if (ev.googleEventId && ev.recurrence) continue;
    const calendarId = ev.googleCalendarId ?? primary?.id;
    if (!calendarId) continue; // nowhere to write yet
    const payload = buildGooglePush({
      title: ev.title,
      description: ev.description,
      start: ev.start,
      end: ev.end,
      timezone: ev.timezone,
      rrule: ev.recurrence,
    });
    const { id, etag } = await pushEvent(api, calendarId, payload, ev.googleEventId);
    await markPushed(ev.id, id, etag);
    changed = true;
  }

  for (const ev of await listPendingDeletions()) {
    const calendarId = ev.googleCalendarId ?? primary?.id;
    if (calendarId && ev.googleEventId) {
      await deleteEvent(api, calendarId, ev.googleEventId);
    }
    await hardDelete(ev.id);
    changed = true;
  }

  if (changed) broadcast({ type: "events.changed" });
  return changed;
}

/** Start the recurring poll. Each cycle is guarded so a slow run never overlaps itself. */
export function startSyncLoop(log: FastifyBaseLogger): void {
  setInterval(() => {
    if (running) return;
    running = true;
    runSyncOnce()
      .catch((err) => log.warn({ err }, "google sync cycle failed; will retry"))
      .finally(() => {
        running = false;
      });
  }, env.syncIntervalMs);
  log.info({ intervalMs: env.syncIntervalMs }, "google sync loop started");
}
