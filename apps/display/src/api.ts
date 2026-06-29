// REST helpers for the display.
import type { DisplayConfig, OccurrenceDTO } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function fetchConfig(): Promise<DisplayConfig> {
  const res = await fetch(`${BASE}/config`);
  if (!res.ok) throw new Error(`config ${res.status}`);
  return res.json();
}

export async function fetchOccurrences(from: Date, to: Date): Promise<OccurrenceDTO[]> {
  const url = `${BASE}/events?from=${from.toISOString()}&to=${to.toISOString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`events ${res.status}`);
  return res.json();
}

/** Monday 00:00 of the week containing `now` through the following Monday (local time). */
export function weekWindow(now: Date): { from: Date; to: Date } {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from, to };
}
