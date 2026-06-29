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
  projectId: string | null;
}

export interface EventInput {
  title: string;
  type: EventType;
  start: string;
  end: string;
  timezone: string;
  description?: string | null;
  projectId?: string | null;
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

export interface ProjectRow {
  id: string;
  name: string;
  color: string | null;
  archived: boolean;
}

export interface TodoRow {
  id: string;
  projectId: string | null;
  title: string;
  status: "open" | "in_progress" | "done";
  dueAt: string | null;
}

export interface NoteRow {
  id: string;
  body: string;
  projectId: string | null;
}

export interface ReminderRow {
  id: string;
  title: string;
  kind: "absolute" | "relative";
  fireAt: string | null;
  offsetMinutes: number | null;
  recurrence: string | null;
  chime: boolean;
  enabled: boolean;
}

export interface TimerRow {
  id: string;
  label: string | null;
  mode: "countdown" | "pomodoro";
  status: "running" | "paused" | "done";
  phase: "work" | "short_break" | "long_break" | null;
  endsAt: string | null;
}
