// The Calendar tab of the control room (FR-EVT-1/2): a mini month calendar, today's schedule,
// and a styled event editor. Transcribed from the prototype's admin Calendar surface. A
// Google-sourced recurring event keeps its recurrence read-only (FR-CAL-6).
import { useEffect, useState } from "react";
import { createEvent, deleteEvent, getEvent, updateEvent } from "./api";
import { colorForType, colors, hexA } from "./theme";
import type { EventType, OccurrenceDTO, ProjectRow } from "./types";
import { GhostButton, Label, PageHeading, PrimaryButton, Select, TextInput, card } from "./ui";

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function CalendarTab({
  projects,
  occurrences,
  onChanged,
}: {
  projects: ProjectRow[];
  occurrences: OccurrenceDTO[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const now = new Date();

  const today = occurrences
    .filter((o) => sameDay(new Date(o.start), now))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <PageHeading
        title="Events"
        subtitle="Create meetings and focus blocks. Link a block to a project to surface its to-dos."
        action={<PrimaryButton onClick={() => setEditing({ id: null })}>+ New event</PrimaryButton>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        <MiniCalendar now={now} occurrences={occurrences} />
        <div>
          {editing ? (
            <Editor
              key={editing.id ?? "new"}
              editingId={editing.id}
              projects={projects}
              onSaved={() => {
                setEditing(null);
                onChanged();
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: colors.textFaint, fontWeight: 600, marginBottom: 2 }}>
                Today's schedule
              </div>
              {today.length === 0 && <div style={{ fontSize: 13.5, color: colors.textDim }}>Nothing scheduled today.</div>}
              {today.map((o, i) => {
                const c = colorForType(o.type);
                return (
                  <button
                    key={`${o.eventId}-${i}`}
                    onClick={() => setEditing({ id: o.eventId })}
                    style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 13, padding: "13px 15px", cursor: "pointer", color: colors.text }}
                  >
                    <span style={{ width: 11, height: 11, borderRadius: 4, flex: "0 0 auto", background: o.type === "block" ? hexA(c, 0.25) : c, backgroundImage: o.type === "block" ? `repeating-linear-gradient(45deg,${c} 0 2px,transparent 2px 4px)` : "none", border: o.type === "block" ? `1px solid ${c}` : "none" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{o.title}</div>
                      <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
                        {timeRange(o.start, o.end)}
                        {o.recurring ? " · recurring" : ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7, color: "#fff", background: hexA(c, 0.22), textTransform: "capitalize" }}>{o.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeRange(startISO: string, endISO: string): string {
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${fmt(new Date(startISO))} – ${fmt(new Date(endISO))}`;
}

function MiniCalendar({ now, occurrences }: { now: Date; occurrences: OccurrenceDTO[] }) {
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const hasEvent = (d: Date) => occurrences.some((o) => sameDay(new Date(o.start), d));
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ textAlign: "center", fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>{monthLabel}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {DOW.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9.5, color: colors.textGhost, fontWeight: 600, paddingBottom: 5 }}>{w}</div>
        ))}
        {days.map((d, i) => {
          const inMonth = d.getMonth() === now.getMonth();
          const isToday = sameDay(d, now);
          const evt = hasEvent(d);
          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                fontSize: 11.5,
                padding: "6px 0",
                borderRadius: 7,
                color: isToday ? "#fff" : inMonth ? (evt ? "rgba(255,255,255,.85)" : colors.textFaint) : "rgba(255,255,255,.18)",
                background: isToday ? colors.accent : "transparent",
                fontWeight: isToday ? 700 : evt ? 600 : 400,
              }}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TYPES: { key: EventType; label: string }[] = [
  { key: "meeting", label: "Meeting" },
  { key: "block", label: "Focus block" },
];

function Editor({
  editingId,
  projects,
  onSaved,
  onCancel,
}: {
  editingId: string | null;
  projects: ProjectRow[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("block");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [projectId, setProjectId] = useState("");
  const [recurringLocked, setRecurringLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    getEvent(editingId).then((ev) => {
      setTitle(ev.title);
      setType(ev.type);
      setStart(isoToLocalInput(ev.start));
      setEnd(isoToLocalInput(ev.end));
      setProjectId(ev.projectId ?? "");
      setRecurringLocked(ev.recurrence != null && ev.googleEventId != null);
    });
  }, [editingId]);

  async function save() {
    setError(null);
    if (!title || !start || !end) return;
    const payload = { title, type, start: new Date(start).toISOString(), end: new Date(end).toISOString(), timezone: LOCAL_TZ, projectId: projectId || null };
    if (new Date(payload.end) <= new Date(payload.start)) {
      setError("End must be after start.");
      return;
    }
    try {
      if (editingId) await updateEvent(editingId, payload);
      else await createEvent(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove() {
    if (!editingId) return;
    await deleteEvent(editingId);
    onSaved();
  }

  const fieldCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

  return (
    <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 16, animation: "dbPop .2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{editingId ? "Edit event" : "New event"}</span>
        <button onClick={onCancel} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: colors.textMuted, cursor: "pointer" }}>✕</button>
      </div>

      {recurringLocked && (
        <div style={{ fontSize: 12, color: colors.tealText, background: hexA(colors.teal, 0.08), border: `1px solid ${hexA(colors.teal, 0.22)}`, borderRadius: 10, padding: "10px 12px" }}>
          This is a recurring Google event. Its recurrence is read-only in v1.
        </div>
      )}

      <div style={fieldCol}>
        <Label>Title</Label>
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
      </div>

      <div style={fieldCol}>
        <Label>Type</Label>
        <div style={{ display: "flex", gap: 8 }}>
          {TYPES.map((t) => {
            const active = type === t.key;
            const c = colorForType(t.key);
            return (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 40, borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600, border: active ? `1px solid ${hexA(c, 0.6)}` : `1px solid ${colors.borderInput}`, background: active ? hexA(c, 0.14) : colors.surface, color: active ? "#fff" : colors.textMuted }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 3, background: t.key === "block" ? `repeating-linear-gradient(45deg,${c} 0 3px,transparent 3px 6px)` : c, border: t.key === "block" ? `1px solid ${c}` : "none", display: "inline-block" }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={fieldCol}>
          <Label>Start</Label>
          <TextInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div style={fieldCol}>
          <Label>End</Label>
          <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <div style={fieldCol}>
        <Label>Link to project</Label>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      {projectId && type === "block" && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: hexA(colors.teal, 0.08), border: `1px solid ${hexA(colors.teal, 0.22)}`, borderRadius: 10, padding: "11px 12px" }}>
          <span>✨</span>
          <span style={{ fontSize: 12, color: colors.tealText, lineHeight: 1.45 }}>This block's project to-dos will surface on the Display whenever you're inside it.</span>
        </div>
      )}

      {error && <div style={{ fontSize: 13, color: colors.redText }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
        <PrimaryButton onClick={save} disabled={!title || !start || !end} style={{ flex: 1 }}>Save event</PrimaryButton>
        {editingId && <GhostButton onClick={remove} style={{ border: `1px solid ${hexA(colors.red, 0.3)}`, background: hexA(colors.red, 0.1), color: colors.redText }}>Delete</GhostButton>}
      </div>
    </div>
  );
}
