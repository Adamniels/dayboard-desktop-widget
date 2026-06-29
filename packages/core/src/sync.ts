// Pure Google sync reasoning. The api does the IO (Google API calls, DB writes) and the
// scheduling; these functions decide *what* to do. No clock, no IO (core-stays-pure).
// See .claude/memory/decisions/google-two-way-sync-single-user.md.

/** The minimal event shape both sides share for reconciliation. */
export interface SyncEvent {
  googleEventId: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  timezone: string;
  rrule: string | null;
  /** Local updatedAt, or Google's `updated` instant. */
  updatedAt: Date;
}

export type ConflictWinner = "local" | "remote";

/**
 * FR-CAL-5: last write wins. With a single user, the newer `updatedAt` wins; ties keep
 * the local copy (no churn).
 */
export function resolveConflict(
  local: { updatedAt: Date },
  remote: { updatedAt: Date },
): ConflictWinner {
  return remote.updatedAt.getTime() > local.updatedAt.getTime() ? "remote" : "local";
}

/** One change pulled from Google's incremental list. */
export interface RemoteChange {
  googleEventId: string;
  /** Google marks removed events with status "cancelled"; we model that as deleted. */
  deleted: boolean;
  event?: SyncEvent;
}

export interface RemoteBatch {
  changes: RemoteChange[];
  nextSyncToken: string | null;
}

export interface LocalRef {
  googleEventId: string;
  updatedAt: Date;
}

export interface ReconcilePlan {
  upserts: SyncEvent[];
  deletes: string[];
  syncToken: string | null;
}

/**
 * FR-CAL-3: reconcile a batch of remote changes against local state, returning the
 * upserts and deletes to apply plus the new sync token. A remote change to an event that
 * also changed locally is resolved by last-write-wins; when local wins it is a no-op here
 * (the local push path will send it to Google).
 */
export function reconcile(local: LocalRef[], remote: RemoteBatch): ReconcilePlan {
  const localByGid = new Map(local.map((l) => [l.googleEventId, l]));
  const upserts: SyncEvent[] = [];
  const deletes: string[] = [];

  for (const change of remote.changes) {
    if (change.deleted) {
      deletes.push(change.googleEventId);
      continue;
    }
    if (!change.event) continue;

    const localRef = localByGid.get(change.googleEventId);
    if (!localRef) {
      upserts.push(change.event);
      continue;
    }
    if (resolveConflict(localRef, change.event) === "remote") {
      upserts.push(change.event);
    }
  }

  return { upserts, deletes, syncToken: remote.nextSyncToken };
}

/** The Google Calendar API write payload (events.insert / events.update body). */
export interface GoogleWritePayload {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  recurrence?: string[];
}

/**
 * FR-CAL-4: map a local event to the Google write payload. Times are absolute instants
 * sent as RFC 3339 with the event's IANA timezone; an RRULE passes through as the
 * recurrence array.
 */
export function buildGooglePush(event: {
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  timezone: string;
  rrule: string | null;
}): GoogleWritePayload {
  const payload: GoogleWritePayload = {
    summary: event.title,
    start: { dateTime: event.start.toISOString(), timeZone: event.timezone },
    end: { dateTime: event.end.toISOString(), timeZone: event.timezone },
  };
  if (event.description) {
    payload.description = event.description;
  }
  if (event.rrule) {
    payload.recurrence = [event.rrule.startsWith("RRULE:") ? event.rrule : `RRULE:${event.rrule}`];
  }
  return payload;
}
