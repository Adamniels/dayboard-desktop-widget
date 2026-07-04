// Event persistence and the occurrence read model. The api owns IO (DB, clock); the
// pure expansion lives in @dayboard/core.
import { expandOccurrences, type LocalRef, type OccurrenceOverride, type SyncEvent } from "@dayboard/core";
import { schema, type Event, type NewEvent } from "@dayboard/shared";
import { and, eq, gt, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "../db";

const { event, eventOverride, project } = schema;

/** A flattened occurrence sent to the display (the renderVals contract, real datetimes). */
export interface OccurrenceDTO {
  eventId: string;
  title: string;
  type: Event["type"];
  projectId: string | null;
  projectColor: string | null;
  start: string;
  end: string;
  isOverride: boolean;
  recurring: boolean;
  googleEventId: string | null;
}

/** A raw occurrence with Date instants (the surfacing rule needs Dates, not ISO strings). */
export interface RawOccurrence {
  eventId: string;
  title: string;
  type: Event["type"];
  projectId: string | null;
  projectColor: string | null;
  start: Date;
  end: Date;
  isOverride: boolean;
  recurring: boolean;
  googleEventId: string | null;
}

/** Colors of the projects referenced by `projectIds`, for the occurrence read model (FR-PROJ-4). */
async function projectColorMap(projectIds: (string | null)[]): Promise<Map<string, string | null>> {
  const ids = [...new Set(projectIds.filter((id): id is string => id != null))];
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: project.id, color: project.color }).from(project).where(inArray(project.id, ids));
  return new Map(rows.map((r) => [r.id, r.color]));
}

/** Expand events overlapping [from, to) into raw occurrences (Date instants). */
export async function listOccurrencesRaw(from: Date, to: Date, now: Date): Promise<RawOccurrence[]> {
  const rows = await db
    .select()
    .from(event)
    .where(
      and(
        isNull(event.deletedAt),
        or(isNotNull(event.recurrence), and(lt(event.start, to), gt(event.end, from))),
      ),
    );
  if (rows.length === 0) return [];

  const overrideRows = await db
    .select()
    .from(eventOverride)
    .where(
      inArray(
        eventOverride.eventId,
        rows.map((r) => r.id),
      ),
    );
  const overridesByEvent = new Map<string, OccurrenceOverride[]>();
  for (const o of overrideRows) {
    const list = overridesByEvent.get(o.eventId) ?? [];
    list.push({ occurrenceStart: o.occurrenceStart, cancelled: o.cancelled, start: o.start, end: o.end });
    overridesByEvent.set(o.eventId, list);
  }

  const colorByProject = await projectColorMap(rows.map((r) => r.projectId));

  const out: RawOccurrence[] = [];
  for (const row of rows) {
    const occurrences = expandOccurrences(
      { start: row.start, end: row.end, timezone: row.timezone, rrule: row.recurrence, overrides: overridesByEvent.get(row.id) },
      { from, to },
      now,
    );
    for (const occ of occurrences) {
      out.push({
        eventId: row.id,
        title: row.title,
        type: row.type,
        projectId: row.projectId,
        projectColor: row.projectId ? colorByProject.get(row.projectId) ?? null : null,
        start: occ.start,
        end: occ.end,
        isOverride: occ.isOverride,
        recurring: row.recurrence !== null,
        googleEventId: row.googleEventId,
      });
    }
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

/** Expand all events overlapping [from, to) into occurrences, in start order. */
export async function listOccurrences(from: Date, to: Date, now: Date): Promise<OccurrenceDTO[]> {
  // Single events filtered by overlap; recurring masters always loaded (their occurrences
  // may fall in the window even when the master start does not) then filtered by expansion.
  const rows = await db
    .select()
    .from(event)
    .where(
      and(
        isNull(event.deletedAt),
        or(isNotNull(event.recurrence), and(lt(event.start, to), gt(event.end, from))),
      ),
    );

  if (rows.length === 0) return [];

  const overrideRows = await db
    .select()
    .from(eventOverride)
    .where(
      inArray(
        eventOverride.eventId,
        rows.map((r) => r.id),
      ),
    );

  const overridesByEvent = new Map<string, OccurrenceOverride[]>();
  for (const o of overrideRows) {
    const list = overridesByEvent.get(o.eventId) ?? [];
    list.push({ occurrenceStart: o.occurrenceStart, cancelled: o.cancelled, start: o.start, end: o.end });
    overridesByEvent.set(o.eventId, list);
  }

  const colorByProject = await projectColorMap(rows.map((r) => r.projectId));

  const out: OccurrenceDTO[] = [];
  for (const row of rows) {
    const occurrences = expandOccurrences(
      {
        start: row.start,
        end: row.end,
        timezone: row.timezone,
        rrule: row.recurrence,
        overrides: overridesByEvent.get(row.id),
      },
      { from, to },
      now,
    );
    for (const occ of occurrences) {
      out.push({
        eventId: row.id,
        title: row.title,
        type: row.type,
        projectId: row.projectId,
        projectColor: row.projectId ? colorByProject.get(row.projectId) ?? null : null,
        start: occ.start.toISOString(),
        end: occ.end.toISOString(),
        isOverride: occ.isOverride,
        recurring: row.recurrence !== null,
        googleEventId: row.googleEventId,
      });
    }
  }

  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

export async function getEvent(id: string): Promise<Event | undefined> {
  const [row] = await db.select().from(event).where(eq(event.id, id)).limit(1);
  return row;
}

export async function createEvent(input: NewEvent): Promise<Event> {
  const [row] = await db.insert(event).values(input).returning();
  return row!;
}

export async function updateEvent(id: string, patch: Partial<NewEvent>): Promise<Event | undefined> {
  const [row] = await db
    .update(event)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(event.id, id))
    .returning();
  return row;
}

/** Soft delete so the deletion can propagate to Google before the row is dropped. */
export async function softDeleteEvent(id: string): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .update(event)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(event.id, id), isNull(event.deletedAt)))
    .returning();
  return row != null;
}

// --- sync support (used by the Google sync engine) ---------------------------

/** Local references for events sourced from a calendar, for reconcile (FR-CAL-3/5). */
export async function listLocalRefs(calendarId: string): Promise<LocalRef[]> {
  const rows = await db
    .select({ googleEventId: event.googleEventId, updatedAt: event.updatedAt })
    .from(event)
    .where(and(eq(event.googleCalendarId, calendarId), isNotNull(event.googleEventId)));
  return rows
    .filter((r): r is { googleEventId: string; updatedAt: Date } => r.googleEventId != null)
    .map((r) => ({ googleEventId: r.googleEventId, updatedAt: r.updatedAt }));
}

/** Upsert an event pulled from Google, keyed by googleEventId. New imports default to general. */
export async function upsertRemote(
  calendarId: string,
  remote: SyncEvent,
  etag: string | null,
): Promise<void> {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(event)
    .where(eq(event.googleEventId, remote.googleEventId))
    .limit(1);

  const fields = {
    title: remote.title,
    description: remote.description ?? null,
    start: remote.start,
    end: remote.end,
    timezone: remote.timezone,
    recurrence: remote.rrule,
    googleCalendarId: calendarId,
    googleEtag: etag,
    googleUpdatedAt: remote.updatedAt,
    lastSyncedAt: now,
    // Mirror Google's updated instant so the row is not seen as locally dirty.
    updatedAt: remote.updatedAt,
    deletedAt: null,
  };

  if (existing) {
    await db.update(event).set(fields).where(eq(event.id, existing.id));
  } else {
    await db.insert(event).values({ ...fields, type: "general", googleEventId: remote.googleEventId });
  }
}

/** Remove a local event that was deleted in Google. */
export async function deleteByGoogleId(googleEventId: string): Promise<void> {
  await db.delete(event).where(eq(event.googleEventId, googleEventId));
}

/** Events with a pending local change to push to Google (updatedAt later than lastSyncedAt). */
export async function listPendingPush(): Promise<Event[]> {
  return db
    .select()
    .from(event)
    .where(
      and(
        isNull(event.deletedAt),
        or(isNull(event.lastSyncedAt), gt(event.updatedAt, event.lastSyncedAt)),
      ),
    );
}

/** Soft-deleted events still linked to Google, whose deletion must be pushed. */
export async function listPendingDeletions(): Promise<Event[]> {
  return db
    .select()
    .from(event)
    .where(and(isNotNull(event.deletedAt), isNotNull(event.googleEventId)));
}

/** After a successful push, record the Google id/etag and clear the dirty state. */
export async function markPushed(id: string, googleEventId: string, etag: string | null): Promise<void> {
  const now = new Date();
  await db
    .update(event)
    .set({ googleEventId, googleEtag: etag, googleUpdatedAt: now, lastSyncedAt: now })
    .where(eq(event.id, id));
}

/** Hard delete a row once its deletion has propagated to Google. */
export async function hardDelete(id: string): Promise<void> {
  await db.delete(event).where(eq(event.id, id));
}
