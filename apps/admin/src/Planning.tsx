// Admin controls for the planning layer: projects + todos, reminders, Pomodoro/timers, and
// notes. Compact forms that drive the REST API; the display reflects changes live.
import { useEffect, useState } from "react";
import {
  createNote,
  createProject,
  createReminder,
  createTodo,
  deleteNote,
  deleteProject,
  deleteReminder,
  deleteTodo,
  getNotes,
  getReminders,
  getTimers,
  getTodos,
  resetTimer,
  setTodoStatus,
  startTimer,
} from "./api";
import type { NoteRow, ProjectRow, ReminderRow, TimerRow, TodoRow } from "./types";

const sectionStyle: React.CSSProperties = { borderTop: "1px solid #eee", paddingTop: 16, marginTop: 16 };

export function Planning({ projects, onProjectsChanged }: { projects: ProjectRow[]; onProjectsChanged: () => void }) {
  return (
    <div>
      <ProjectsPanel projects={projects} onChanged={onProjectsChanged} />
      <RemindersPanel />
      <TimersPanel />
      <NotesPanel projects={projects} />
    </div>
  );
}

function ProjectsPanel({ projects, onChanged }: { projects: ProjectRow[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  return (
    <section style={sectionStyle}>
      <h2 style={{ fontSize: 16 }}>Projects & to-dos</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project" style={{ padding: 6, flex: 1 }} />
        <button
          onClick={async () => {
            if (!name) return;
            await createProject(name);
            setName("");
            onChanged();
          }}
        >
          Add
        </button>
      </div>
      {projects.map((p) => (
        <ProjectTodos key={p.id} project={p} onDeleted={onChanged} />
      ))}
    </section>
  );
}

function ProjectTodos({ project, onDeleted }: { project: ProjectRow; onDeleted: () => void }) {
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [title, setTitle] = useState("");
  const load = () => getTodos(project.id).then(setTodos).catch(() => setTodos([]));
  useEffect(() => {
    void load();
  }, [project.id]);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{project.name}</strong>
        <button onClick={async () => { await deleteProject(project.id); onDeleted(); }}>Delete</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
        {todos.map((t) => (
          <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0" }}>
            <input
              type="checkbox"
              checked={t.status === "done"}
              onChange={async () => {
                await setTodoStatus(t.id, t.status === "done" ? "open" : "done");
                void load();
              }}
            />
            <span style={{ textDecoration: t.status === "done" ? "line-through" : "none", flex: 1 }}>{t.title}</span>
            <button onClick={async () => { await deleteTodo(t.id); void load(); }}>×</button>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New to-do" style={{ padding: 6, flex: 1 }} />
        <button onClick={async () => { if (!title) return; await createTodo(project.id, title); setTitle(""); void load(); }}>Add</button>
      </div>
    </div>
  );
}

function RemindersPanel() {
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"absolute" | "relative">("relative");
  const [offset, setOffset] = useState(25);
  const [at, setAt] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [chime, setChime] = useState(true);
  const load = () => getReminders().then(setReminders).catch(() => setReminders([]));
  useEffect(() => { void load(); }, []);

  async function add() {
    if (!title) return;
    const input: Record<string, unknown> = { title, kind, chime, recurrence: recurrence || null };
    if (kind === "relative") input.offsetMinutes = offset;
    else input.fireAt = new Date(at).toISOString();
    await createReminder(input);
    setTitle("");
    void load();
  }

  return (
    <section style={sectionStyle}>
      <h2 style={{ fontSize: 16 }}>Reminders</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder" style={{ padding: 6 }} />
        <select value={kind} onChange={(e) => setKind(e.target.value as "absolute" | "relative")} style={{ padding: 6 }}>
          <option value="relative">in N minutes</option>
          <option value="absolute">at a time</option>
        </select>
        {kind === "relative" ? (
          <input type="number" value={offset} onChange={(e) => setOffset(Number(e.target.value))} style={{ padding: 6, width: 70 }} />
        ) : (
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} style={{ padding: 6 }} />
        )}
        <input value={recurrence} onChange={(e) => setRecurrence(e.target.value)} placeholder="RRULE (optional)" style={{ padding: 6 }} />
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={chime} onChange={(e) => setChime(e.target.checked)} /> chime
        </label>
        <button onClick={add}>Add</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {reminders.map((r) => (
          <li key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
            <span>
              {r.title} <span style={{ color: "#888", fontSize: 13 }}>{r.recurrence ? `· ${r.recurrence}` : ""} {r.enabled ? "" : "· paused"}</span>
            </span>
            <button onClick={async () => { await deleteReminder(r.id); void load(); }}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimersPanel() {
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [work, setWork] = useState(25);
  const [brk, setBrk] = useState(5);
  const load = () => getTimers().then(setTimers).catch(() => setTimers([]));
  useEffect(() => { void load(); }, []);

  const active = timers.filter((t) => t.status !== "done");

  return (
    <section style={sectionStyle}>
      <h2 style={{ fontSize: 16 }}>Timers & Pomodoro</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        work <input type="number" value={work} onChange={(e) => setWork(Number(e.target.value))} style={{ padding: 6, width: 60 }} /> min
        break <input type="number" value={brk} onChange={(e) => setBrk(Number(e.target.value))} style={{ padding: 6, width: 60 }} /> min
        <button onClick={async () => { await startTimer({ mode: "pomodoro", workMinutes: work, breakMinutes: brk, longBreakMinutes: brk * 3, cyclesTarget: 4, chime: true }); void load(); }}>
          Start Pomodoro
        </button>
        <button onClick={async () => { await startTimer({ mode: "countdown", durationMinutes: work, chime: true }); void load(); }}>
          Start {work}m countdown
        </button>
      </div>
      {active.map((t) => (
        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <span>{t.label ?? t.mode} · {t.phase ?? ""} · {t.status}</span>
          <button onClick={async () => { await resetTimer(t.id); void load(); }}>Stop</button>
        </div>
      ))}
    </section>
  );
}

function NotesPanel({ projects }: { projects: ProjectRow[] }) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [body, setBody] = useState("");
  const [projectId, setProjectId] = useState("");
  const load = () => getNotes().then(setNotes).catch(() => setNotes([]));
  useEffect(() => { void load(); }, []);

  return (
    <section style={sectionStyle}>
      <h2 style={{ fontSize: 16 }}>Notes</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="New note" style={{ padding: 6, flex: 1 }} />
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ padding: 6 }}>
          <option value="">General</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button onClick={async () => { if (!body) return; await createNote(body, projectId || null); setBody(""); void load(); }}>Add</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {notes.map((n) => (
          <li key={n.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
            <span>{n.body}</span>
            <button onClick={async () => { await deleteNote(n.id); void load(); }}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
