// Thin wrapper over the Google Calendar API. All Google IO lives here; the decisions
// (reconcile, push payloads) are pure in @dayboard/core.
import type { GoogleWritePayload, RemoteBatch, RemoteChange, SyncEvent } from "@dayboard/core";
import { OAuth2Client } from "google-auth-library";
import { google, type calendar_v3 } from "googleapis";
import { env } from "../env";
import { getCredential, upsertCredential } from "../repo/google";

export function makeOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(env.google.clientId, env.google.clientSecret, env.google.redirectUri);
}

/** An OAuth client primed with the stored refresh token, persisting refreshed access tokens. */
export async function authedClient(): Promise<OAuth2Client | null> {
  const credential = await getCredential();
  if (!credential) return null;
  const client = makeOAuthClient();
  client.setCredentials({ refresh_token: credential.refreshToken });
  client.on("tokens", (tokens) => {
    void upsertCredential({
      accountEmail: credential.accountEmail,
      refreshToken: tokens.refresh_token ?? credential.refreshToken,
      accessToken: tokens.access_token ?? null,
      accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: credential.scope,
    });
  });
  return client;
}

export async function calendarApi(client: OAuth2Client): Promise<calendar_v3.Calendar> {
  return google.calendar({ version: "v3", auth: client });
}

function extractRrule(recurrence: string[] | null | undefined): string | null {
  if (!recurrence) return null;
  const line = recurrence.find((r) => r.startsWith("RRULE:"));
  return line ? line.replace(/^RRULE:/, "") : null;
}

/** Map a Google event to our pure SyncEvent, or signal a deletion. */
export function mapGoogleEvent(
  g: calendar_v3.Schema$Event,
  fallbackTz: string,
): RemoteChange {
  const googleEventId = g.id ?? "";
  if (g.status === "cancelled") {
    return { googleEventId, deleted: true };
  }
  const startIso = g.start?.dateTime ?? (g.start?.date ? `${g.start.date}T00:00:00Z` : undefined);
  const endIso = g.end?.dateTime ?? (g.end?.date ? `${g.end.date}T00:00:00Z` : undefined);
  const timezone = g.start?.timeZone ?? fallbackTz;

  const event: SyncEvent = {
    googleEventId,
    title: g.summary ?? "(untitled)",
    description: g.description ?? null,
    start: startIso ? new Date(startIso) : new Date(),
    end: endIso ? new Date(endIso) : new Date(),
    timezone,
    rrule: extractRrule(g.recurrence),
    updatedAt: g.updated ? new Date(g.updated) : new Date(),
  };
  return { googleEventId, deleted: false, event };
}

/**
 * Pull a batch of changes for a calendar. Uses the incremental syncToken when present;
 * a 410 (token expired) clears it so the caller does a full resync.
 */
export async function pullChanges(
  api: calendar_v3.Calendar,
  calendarId: string,
  syncToken: string | null,
  fallbackTz: string,
): Promise<RemoteBatch> {
  const changes: RemoteChange[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  for (;;) {
    let res;
    try {
      res = await api.events.list({
        calendarId,
        singleEvents: false,
        showDeleted: true,
        pageToken,
        ...(syncToken ? { syncToken } : { timeMin: new Date(0).toISOString() }),
      });
    } catch (err) {
      // 410 GONE: sync token invalid; signal a full resync by returning no token.
      if ((err as { code?: number }).code === 410) {
        return { changes: [], nextSyncToken: null };
      }
      throw err;
    }

    for (const item of res.data.items ?? []) {
      changes.push(mapGoogleEvent(item, fallbackTz));
    }
    if (res.data.nextPageToken) {
      pageToken = res.data.nextPageToken;
      continue;
    }
    nextSyncToken = res.data.nextSyncToken ?? null;
    break;
  }

  return { changes, nextSyncToken };
}

/** Insert or update an event in Google; returns the new id and etag. */
export async function pushEvent(
  api: calendar_v3.Calendar,
  calendarId: string,
  payload: GoogleWritePayload,
  googleEventId: string | null,
): Promise<{ id: string; etag: string | null }> {
  if (googleEventId) {
    const res = await api.events.update({ calendarId, eventId: googleEventId, requestBody: payload });
    return { id: res.data.id ?? googleEventId, etag: res.data.etag ?? null };
  }
  const res = await api.events.insert({ calendarId, requestBody: payload });
  return { id: res.data.id ?? "", etag: res.data.etag ?? null };
}

export async function deleteEvent(
  api: calendar_v3.Calendar,
  calendarId: string,
  googleEventId: string,
): Promise<void> {
  await api.events.delete({ calendarId, eventId: googleEventId });
}
