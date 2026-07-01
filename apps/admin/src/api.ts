// REST helpers for the admin app.
import type {
  CalendarInfo,
  DisplaySettingDTO,
  DisplayView,
  EventInput,
  EventRow,
  NoteRow,
  OccurrenceDTO,
  ProjectRow,
  ReminderRow,
  SyncStatus,
  TimerRow,
  TodoRow,
} from "./types";

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

// The wall display's active view. Reading reflects the current control; patching switches the
// display (the api broadcasts so it flips within ~1s).
export async function getDisplaySetting(): Promise<DisplaySettingDTO> {
  return json(await fetch(`${BASE}/display`));
}

export async function setDisplayView(activeView: DisplayView): Promise<DisplaySettingDTO> {
  return json(
    await fetch(`${BASE}/display`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ activeView }),
    }),
  );
}

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => json<T>(r));
}

// projects + todos
export const getProjects = () => send<ProjectRow[]>("GET", "/projects");
export const createProject = (name: string) => send<ProjectRow>("POST", "/projects", { name });
export const deleteProject = (id: string) => fetch(`${BASE}/projects/${id}`, { method: "DELETE" });
export const getTodos = (projectId: string) => send<TodoRow[]>("GET", `/projects/${projectId}/todos`);
export const createTodo = (projectId: string, title: string) =>
  send<TodoRow>("POST", `/projects/${projectId}/todos`, { title });
export const setTodoStatus = (id: string, status: TodoRow["status"]) =>
  send<TodoRow>("PATCH", `/todos/${id}`, { status });
export const deleteTodo = (id: string) => fetch(`${BASE}/todos/${id}`, { method: "DELETE" });

// notes
export const getNotes = () => send<NoteRow[]>("GET", "/notes");
export const createNote = (body: string, projectId: string | null) =>
  send<NoteRow>("POST", "/notes", { body, projectId });
export const deleteNote = (id: string) => fetch(`${BASE}/notes/${id}`, { method: "DELETE" });

// reminders
export const getReminders = () => send<ReminderRow[]>("GET", "/reminders");
export const createReminder = (input: Record<string, unknown>) => send<ReminderRow>("POST", "/reminders", input);
export const setReminderEnabled = (id: string, enabled: boolean) =>
  send<ReminderRow>("PATCH", `/reminders/${id}`, { enabled });
export const deleteReminder = (id: string) => fetch(`${BASE}/reminders/${id}`, { method: "DELETE" });

// timers / pomodoro
export const getTimers = () => send<TimerRow[]>("GET", "/timers");
export const startTimer = (input: Record<string, unknown>) => send<TimerRow>("POST", "/timers", input);
export const pauseTimer = (id: string) => send<TimerRow>("POST", `/timers/${id}/pause`);
export const resumeTimer = (id: string) => send<TimerRow>("POST", `/timers/${id}/resume`);
export const resetTimer = (id: string) => send<TimerRow>("POST", `/timers/${id}/reset`);
