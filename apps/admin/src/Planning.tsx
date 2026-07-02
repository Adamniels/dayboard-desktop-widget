// The Projects, Reminders & timers, Notes, and Display & sync tabs of the control room.
// Transcribed from the prototype's admin surface; drives the existing REST API, and the
// display reflects changes live.
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
  getDisplaySetting,
  getNotes,
  getReminders,
  getSyncStatus,
  getTimers,
  getTodos,
  pauseTimer,
  resetTimer,
  resumeTimer,
  setDisplayView,
  setReminderEnabled,
  setTodoStatus,
  startTimer,
} from "./api";
import { colors, hexA } from "./theme";
import type { DisplayView, NoteRow, ProjectRow, ReminderRow, SyncStatus, TimerRow, TodoRow } from "./types";
import { GhostButton, PageHeading, PrimaryButton, Select, TextInput, Textarea, card } from "./ui";
import { useConfirmDelete } from "./confirm";

// ---------- Projects ----------

export function ProjectsTab({ projects, onChanged }: { projects: ProjectRow[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <PageHeading
        title="Projects"
        subtitle="Each project holds to-dos. Linking a focus block to a project surfaces these on the Display during that block."
      />
      <div style={{ display: "flex", gap: 9, marginBottom: 16 }}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="New project" />
        <PrimaryButton
          onClick={async () => {
            if (!name.trim()) return;
            await createProject(name.trim());
            setName("");
            onChanged();
          }}
        >
          Add
        </PrimaryButton>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onChanged={onChanged} />
        ))}
        {projects.length === 0 && <div style={{ fontSize: 13.5, color: colors.textDim }}>No projects yet.</div>}
      </div>
    </div>
  );
}

function ProjectCard({ project, onChanged }: { project: ProjectRow; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [draft, setDraft] = useState("");
  const { dialog, confirmDelete } = useConfirmDelete();
  const load = () => getTodos(project.id).then(setTodos).catch(() => setTodos([]));
  useEffect(() => {
    if (open) void load();
  }, [open, project.id]);

  const openCount = todos.filter((t) => t.status !== "done").length;
  const dot = project.color ?? colors.accent;

  return (
    <>
      {dialog}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "16px 18px", cursor: "pointer", color: colors.text }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: dot, flex: "0 0 auto" }} />
        <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{project.name}</span>
        {open && <span style={{ fontSize: 12, color: colors.textFaint, background: colors.surfaceUp, padding: "3px 9px", borderRadius: 7 }}>{openCount} open</span>}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!(await confirmDelete("project", project.name))) return;
            await deleteProject(project.id);
            onChanged();
          }}
          style={{ background: "transparent", border: "none", color: colors.textFaint, cursor: "pointer", fontSize: 12 }}
        >
          Delete
        </button>
        <span style={{ color: colors.textFaint, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>⌄</span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          {todos.map((t) => {
            const done = t.status === "done";
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 6px", borderRadius: 9 }}>
                <button
                  onClick={async () => {
                    await setTodoStatus(t.id, done ? "open" : "done");
                    void load();
                  }}
                  style={{ width: 20, height: 20, borderRadius: 6, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#08080B", fontWeight: 700, background: done ? colors.teal : "transparent", border: done ? `1px solid ${colors.teal}` : `1.5px solid ${hexA("#ffffff", 0.3)}`, cursor: "pointer" }}
                >
                  {done ? "✓" : ""}
                </button>
                <span style={{ fontSize: 14, flex: 1, color: done ? colors.textFaint : "rgba(255,255,255,.9)", textDecoration: done ? "line-through" : "none" }}>{t.title}</span>
                <button onClick={async () => { if (!(await confirmDelete("todo", t.title))) return; await deleteTodo(t.id); void load(); }} style={{ background: "transparent", border: "none", color: colors.textFaint, cursor: "pointer" }}>×</button>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 9, marginTop: 8 }}>
            <TextInput
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addTodo(); }}
              placeholder="Add a to-do…"
              style={{ height: 38 }}
            />
            <GhostButton onClick={addTodo} style={{ height: 38 }}>Add</GhostButton>
          </div>
        </div>
      )}
      </div>
    </>
  );

  async function addTodo() {
    if (!draft.trim()) return;
    await createTodo(project.id, draft.trim());
    setDraft("");
    void load();
  }
}

// ---------- Reminders & timers ----------

const RECUR: { label: string; value: string }[] = [
  { label: "Does not repeat", value: "" },
  { label: "Daily", value: "FREQ=DAILY" },
  { label: "Weekly", value: "FREQ=WEEKLY" },
];

export function RemindersTab() {
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"absolute" | "relative">("relative");
  const [time, setTime] = useState("08:00");
  const [mins, setMins] = useState(25);
  const [recur, setRecur] = useState("");
  const load = () => getReminders().then(setReminders).catch(() => setReminders([]));
  useEffect(() => { void load(); }, []);

  async function add() {
    if (!title.trim()) return;
    const input: Record<string, unknown> = { title: title.trim(), kind: mode, chime: true, recurrence: recur || null };
    if (mode === "relative") input.offsetMinutes = mins;
    else {
      const [h, m] = time.split(":").map(Number);
      const at = new Date();
      at.setHours(h ?? 0, m ?? 0, 0, 0);
      input.fireAt = at.toISOString();
    }
    await createReminder(input);
    setTitle("");
    void load();
  }

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, height: 40, borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
    border: active ? `1px solid ${hexA(colors.accent, 0.6)}` : `1px solid ${colors.borderInput}`,
    background: active ? hexA(colors.accent, 0.14) : colors.surface, color: active ? "#fff" : colors.textMuted,
  });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <PageHeading title="Reminders & timers" subtitle="Fire a reminder at an absolute time or relative to now. Run a Pomodoro that mirrors to the Display." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>New reminder</div>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" style={{ marginBottom: 11 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setMode("absolute")} style={seg(mode === "absolute")}>At a time</button>
              <button onClick={() => setMode("relative")} style={seg(mode === "relative")}>In…</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {mode === "absolute" ? (
                <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 13px", borderRadius: 10, border: `1px solid ${colors.borderInput}`, background: colors.inputBg }}>
                  <span style={{ color: colors.textDim, fontSize: 13 }}>in</span>
                  <input value={mins} onChange={(e) => setMins(Number(e.target.value) || 0)} style={{ width: 46, background: "transparent", border: "none", color: "#fff", fontSize: 14, textAlign: "right", outline: "none" }} />
                  <span style={{ color: colors.textDim, fontSize: 13 }}>min</span>
                </div>
              )}
              <Select value={recur} onChange={(e) => setRecur(e.target.value)}>
                {RECUR.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>
            <PrimaryButton onClick={add} style={{ width: "100%" }}>Add reminder</PrimaryButton>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reminders.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 13, ...card, padding: "13px 15px" }}>
                <span style={{ fontSize: 15 }}>◔</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
                    {r.kind === "relative" ? `in ${r.offsetMinutes ?? 0} min` : r.fireAt ? new Date(r.fireAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                    {r.recurrence ? " · repeats" : ""}{r.enabled ? "" : " · paused"}
                  </div>
                </div>
                <button onClick={async () => { await setReminderEnabled(r.id, !r.enabled); void load(); }} style={{ fontSize: 11.5, fontWeight: 600, color: r.enabled ? colors.accentSoft : colors.textFaint, background: r.enabled ? hexA(colors.accent, 0.12) : colors.surfaceUp, border: `1px solid ${r.enabled ? hexA(colors.accent, 0.25) : colors.border}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer" }}>
                  {r.enabled ? "On" : "Off"}
                </button>
                <button onClick={async () => { await deleteReminder(r.id); void load(); }} style={{ background: "transparent", border: "none", color: colors.textFaint, cursor: "pointer", fontSize: 12 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        <PomodoroControl />
      </div>
    </div>
  );
}

function PomodoroControl() {
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [, setTick] = useState(0);
  const load = () => getTimers().then(setTimers).catch(() => setTimers([]));
  useEffect(() => {
    void load();
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    const p = setInterval(() => void load(), 5000);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);

  const active = timers.find((t) => t.status !== "done") ?? null;
  const total = (active?.workMinutes ?? 25) * 60_000;
  const endsAt = active?.endsAt ? new Date(active.endsAt).getTime() : Date.now() + total;
  const remainingMs = !active ? total : active.status === "paused" ? active.remainingMs ?? 0 : Math.max(0, endsAt - Date.now());
  const fraction = total > 0 ? Math.min(1, remainingMs / total) : 0;
  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  const state = !active ? "ready" : active.status;

  const r = 52;
  const circ = 2 * Math.PI * r;

  async function startWork(workMinutes: number) {
    await startTimer({ mode: "pomodoro", workMinutes, breakMinutes: 5, longBreakMinutes: 15, cyclesTarget: 4, chime: true });
    void load();
  }
  async function toggle() {
    if (!active) return startWork(25);
    if (active.status === "running") await pauseTimer(active.id);
    else await resumeTimer(active.id);
    void load();
  }
  async function reset() {
    if (active) await resetTimer(active.id);
    void load();
  }

  const preset: React.CSSProperties = {
    flex: 1, height: 36, borderRadius: 9, border: `1px solid ${colors.borderInput}`, background: colors.surface, color: colors.textMuted, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  };

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, alignSelf: "flex-start" }}>Pomodoro</div>
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg viewBox="0 0 120 120" style={{ width: 140, height: 140, transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke={hexA("#ffffff", 0.08)} strokeWidth="7" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={colors.accent} strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - fraction)} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 30, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.02em" }}>{mm}:{String(ss).padStart(2, "0")}</span>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: colors.textFaint, fontWeight: 600 }}>{state}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, width: "100%" }}>
        {[25, 15, 5].map((m) => (
          <button key={m} onClick={() => startWork(m)} style={preset}>{m}m</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <PrimaryButton onClick={toggle} style={{ flex: 1 }}>{!active ? "Start" : active.status === "running" ? "Pause" : "Resume"}</PrimaryButton>
        <GhostButton onClick={reset} style={{ width: 44, padding: 0 }}>↺</GhostButton>
      </div>
    </div>
  );
}

// ---------- Notes ----------

export function NotesTab({ projects }: { projects: ProjectRow[] }) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [body, setBody] = useState("");
  const [pid, setPid] = useState("");
  const { dialog, confirmDelete } = useConfirmDelete();
  const load = () => getNotes().then(setNotes).catch(() => setNotes([]));
  useEffect(() => { void load(); }, []);

  const projName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name ?? "Project" : null);

  return (
    <>
      {dialog}
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <PageHeading title="Notes" subtitle="General notes, or attach one to a project." />
      <div style={{ ...card, marginBottom: 18 }}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a note…" />
        <div style={{ display: "flex", gap: 10, marginTop: 11 }}>
          <Select value={pid} onChange={(e) => setPid(e.target.value)} style={{ flex: 1 }}>
            <option value="">General note</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>Attach to {p.name}</option>
            ))}
          </Select>
          <PrimaryButton onClick={async () => { if (!body.trim()) return; await createNote(body.trim(), pid || null); setBody(""); void load(); }} style={{ padding: "0 18px" }}>Add note</PrimaryButton>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {notes.map((n) => (
          <div key={n.id} style={{ ...card, padding: 15, borderRadius: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,.82)", fontFamily: "ui-monospace, monospace" }}>{n.body}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7, color: n.projectId ? "#fff" : colors.textDim, background: n.projectId ? hexA(colors.accent, 0.22) : colors.surfaceUp }}>{projName(n.projectId) ?? "General"}</span>
              <button onClick={async () => { if (!(await confirmDelete("note", n.body))) return; await deleteNote(n.id); void load(); }} style={{ fontSize: 11.5, color: colors.textFaint, background: "transparent", border: "none", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        ))}
        {notes.length === 0 && <div style={{ fontSize: 13.5, color: colors.textDim }}>No notes yet.</div>}
      </div>
      </div>
    </>
  );
}

// ---------- Display & sync ----------

const DISPLAY_URL = import.meta.env.VITE_DISPLAY_URL ?? "http://localhost:5173";

export function DisplayTab() {
  const [view, setView] = useState<DisplayView | null>(null);
  const [sync, setSync] = useState<SyncStatus | null>(null);
  useEffect(() => {
    getDisplaySetting().then((d) => setView(d.activeView)).catch(() => {});
    getSyncStatus().then(setSync).catch(() => setSync(null));
  }, []);

  async function choose(v: DisplayView) {
    setView(v);
    try {
      const updated = await setDisplayView(v);
      setView(updated.activeView);
    } catch {
      /* leave optimistic value */
    }
  }

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, height: 40, borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
    border: active ? `1px solid ${hexA(colors.accent, 0.6)}` : `1px solid ${colors.borderInput}`,
    background: active ? hexA(colors.accent, 0.14) : colors.surface, color: active ? "#fff" : colors.textMuted,
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHeading title="Display & sync" subtitle="Drive the always-on kiosk and check two-way Google Calendar sync." />

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Display is showing</div>
        <div style={{ display: "flex", gap: 9 }}>
          {(["day", "week", "month"] as DisplayView[]).map((v) => (
            <button key={v} onClick={() => choose(v)} style={{ ...seg(view === v), textTransform: "capitalize" }}>{v}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: colors.textFaint, marginTop: 12 }}>
          Orientation follows the kiosk screen automatically. The change appears on the display within about a second.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.divider}` }}>
          <a href={DISPLAY_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <GhostButton>↗ Open Display</GhostButton>
          </a>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: "#444" }}>G</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 12.5, color: sync?.connected ? colors.tealText : colors.textDim }}>
                {sync ? (sync.connected ? sync.account ?? "Connected" : "Not connected — run google:connect") : "Status unavailable"}
              </div>
            </div>
          </div>
        </div>
        {sync?.connected && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.divider}` }}>
            <span style={{ color: colors.teal, fontSize: 18 }}>⇄</span>
            <div style={{ flex: 1, fontSize: 12.5, color: colors.textMuted, lineHeight: 1.45 }}>
              Two-way sync is on. Last sync <span style={{ color: colors.tealText }}>{sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "never"}</span>. Changes here appear on your phone.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
