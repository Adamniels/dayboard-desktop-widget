// Pure logic behind the admin's interactive week calendar (FR-EVT-3). Kept free of any
// FullCalendar import so it is deterministic and runs in the sandbox; the Calendar tab feeds
// these results to FullCalendar and turns its callbacks back into api calls.
import { colorForType } from "./theme";
import type { OccurrenceDTO } from "./types";

/** A FullCalendar-compatible event input (typed locally to avoid importing FullCalendar). */
export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  editable: boolean;
  extendedProps: { eventId: string; type: OccurrenceDTO["type"]; recurring: boolean };
}

/** An ISO instant as a `YYYY-MM-DDTHH:MM` string in local time (for datetime-local inputs). */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Map occurrences to calendar events. Colored by type; recurring occurrences are locked
 * (`editable: false`) because recurrence is read-only in v1 (FR-CAL-6) — moving one instance
 * would shift the whole series. Non-recurring events (including plain Google-imported ones)
 * stay movable. The event id is unique per occurrence; the underlying event id rides in
 * `extendedProps.eventId` so drops/clicks can address the right event.
 */
export function occurrencesToEvents(occurrences: OccurrenceDTO[]): CalEvent[] {
  return occurrences.map((o) => {
    const color = colorForType(o.type);
    return {
      id: `${o.eventId}::${o.start}`,
      title: o.title,
      start: o.start,
      end: o.end,
      backgroundColor: color,
      borderColor: color,
      editable: !o.recurring,
      extendedProps: { eventId: o.eventId, type: o.type, recurring: o.recurring },
    };
  });
}

export interface EventDraft {
  type: OccurrenceDTO["type"];
  start: string; // local datetime-local value
  end: string; // local datetime-local value
}

/** Turn a drag selection into the editor's prefilled fields; new events default to a block. */
export function selectionToDraft(startISO: string, endISO: string): EventDraft {
  return { type: "block", start: isoToLocalInput(startISO), end: isoToLocalInput(endISO) };
}

const MIN_MS = 30 * 60_000;

/**
 * Turn a move or resize (new start/end as ISO) into the PATCH payload, guarding a minimum
 * 30-minute duration so a bad drag cannot collapse an event.
 */
export function moveResizeToPatch(startISO: string, endISO: string): { start: string; end: string } {
  const start = new Date(startISO);
  let end = new Date(endISO);
  if (end.getTime() - start.getTime() < MIN_MS) end = new Date(start.getTime() + MIN_MS);
  return { start: start.toISOString(), end: end.toISOString() };
}
