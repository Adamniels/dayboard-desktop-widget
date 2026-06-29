// REST helpers for the admin app.
import type { CalendarInfo, EventInput, EventRow, OccurrenceDTO, SyncStatus } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.url} -> ${res.status}`);
  return res.json();
}

export function weekWindow(now: Date): { from: Date; to: Date } {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from, to };
}

export async function listOccurrences(from: Date, to: Date): Promise<OccurrenceDTO[]> {
  return json(await fetch(`${BASE}/events?from=${from.toISOString()}&to=${to.toISOString()}`));
}

export async function getEvent(id: string): Promise<EventRow> {
  return json(await fetch(`${BASE}/events/${id}`));
}

export async function createEvent(input: EventInput): Promise<EventRow> {
  return json(
    await fetch(`${BASE}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateEvent(id: string, patch: Partial<EventInput>): Promise<EventRow> {
  return json(
    await fetch(`${BASE}/events/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`${BASE}/events/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`delete -> ${res.status}`);
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return json(await fetch(`${BASE}/sync/status`));
}

export async function getCalendars(): Promise<CalendarInfo[]> {
  return json(await fetch(`${BASE}/calendars`));
}
