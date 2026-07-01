// REST helpers for the display.
import type { DisplayConfig, DisplayView, NoteDTO, OccurrenceDTO, TimerDTO, TodoDTO } from "./types";

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

export async function fetchSurfaced(): Promise<TodoDTO[]> {
  const res = await fetch(`${BASE}/surfaced`);
  if (!res.ok) throw new Error(`surfaced ${res.status}`);
  return res.json();
}

export async function fetchNotes(): Promise<NoteDTO[]> {
  const res = await fetch(`${BASE}/notes`);
  if (!res.ok) throw new Error(`notes ${res.status}`);
  return res.json();
}

export async function fetchTimers(): Promise<TimerDTO[]> {
  const res = await fetch(`${BASE}/timers`);
  if (!res.ok) throw new Error(`timers ${res.status}`);
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

/** Today 00:00 through tomorrow 00:00 (local time). The day view shows only today. */
export function dayWindow(now: Date): { from: Date; to: Date } {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

/** The 42-cell month grid range: the Monday on/before the 1st through 42 days later. */
export function monthWindow(now: Date): { from: Date; to: Date } {
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = new Date(first);
  from.setDate(1 - ((first.getDay() + 6) % 7));
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 42);
  return { from, to };
}

/** The fetch window for the active view, centered on `now`. */
export function windowForView(view: DisplayView, now: Date): { from: Date; to: Date } {
  if (view === "day") return dayWindow(now);
  if (view === "month") return monthWindow(now);
  return weekWindow(now);
}
