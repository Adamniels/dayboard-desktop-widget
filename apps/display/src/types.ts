// Shapes the display consumes from the api. Mirrors the api occurrence read model
// (the prototype's renderVals contract, with real datetimes).
export interface OccurrenceDTO {
  eventId: string;
  title: string;
  type: "meeting" | "block" | "general";
  projectId: string | null;
  start: string;
  end: string;
  isOverride: boolean;
  recurring: boolean;
  googleEventId: string | null;
}

export type DisplayView = "day" | "week" | "month";

export interface DisplayConfig {
  timezone: string;
  startHour: number;
  endHour: number;
  activeView: DisplayView;
}

export interface TodoDTO {
  id: string;
  projectId: string | null;
  title: string;
  status: "open" | "in_progress" | "done";
  dueAt: string | null;
}

export interface NoteDTO {
  id: string;
  body: string;
  projectId: string | null;
}

export interface TimerDTO {
  id: string;
  label: string | null;
  mode: "countdown" | "pomodoro";
  status: "running" | "paused" | "done";
  phase: "work" | "short_break" | "long_break" | null;
  endsAt: string | null;
  remainingMs: number | null;
  workMinutes: number | null;
  breakMinutes: number | null;
  longBreakMinutes: number | null;
  cyclesDone: number;
  cyclesTarget: number | null;
}
