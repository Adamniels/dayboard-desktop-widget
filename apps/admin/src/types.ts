export type EventType = "meeting" | "block" | "general";

export interface OccurrenceDTO {
  eventId: string;
  title: string;
  type: EventType;
  projectId: string | null;
  start: string;
  end: string;
  isOverride: boolean;
  recurring: boolean;
  googleEventId: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  start: string;
  end: string;
  timezone: string;
  recurrence: string | null;
  googleEventId: string | null;
}

export interface EventInput {
  title: string;
  type: EventType;
  start: string;
  end: string;
  timezone: string;
  description?: string | null;
}

export interface SyncStatus {
  connected: boolean;
  account: string | null;
  lastSyncedAt: string | null;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  selected: boolean;
  primaryWrite: boolean;
  lastSyncedAt: string | null;
}
