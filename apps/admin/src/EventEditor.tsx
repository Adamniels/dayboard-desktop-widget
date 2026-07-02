// The Calendar tab of the control room (FR-EVT-1/2/3): an interactive weekly grid built on
// FullCalendar (timeGrid week + interaction). Drag on the grid to create (prefills the side
// editor), click an event to edit, drag to move, drag edges to resize. Move/resize persist
// immediately; recurring Google events are locked (recurrence read-only, FR-CAL-6). The pure
// mapping/patch logic lives in calendar-model.ts (tested); this file is the FullCalendar wiring.
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCallback, useEffect, useRef, useState } from "react";
import { createEvent, deleteEvent, getEvent, listOccurrences, updateEvent } from "./api";
import { occurrencesToEvents, selectionToDraft, moveResizeToPatch, type EventDraft } from "./calendar-model";
import { colorForType, colors, hexA } from "./theme";
import type { EventType, OccurrenceDTO, ProjectRow } from "./types";
import { GhostButton, Label, PageHeading, PrimaryButton, Select, TextInput, card } from "./ui";
import { useConfirmDelete } from "./confirm";

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Dark theme for FullCalendar (it renders its own DOM), scoped under .db-cal.
const CAL_CSS = `
.db-cal { --fc-border-color: ${colors.border}; --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: ${colors.surface}; --fc-today-bg-color: ${hexA(colors.accent, 0.08)};
  --fc-now-indicator-color: ${colors.red}; color: ${colors.text}; }
.db-cal .fc-theme-standard td, .db-cal .fc-theme-standard th { border-color: ${colors.border}; }
.db-cal .fc-col-header-cell-cushion, .db-cal .fc-timegrid-slot-label-cushion,
.db-cal .fc-timegrid-axis-cushion { color: ${colors.textMuted}; text-decoration: none; }
.db-cal .fc-toolbar-title { font-size: 16px; font-weight: 600; }
.db-cal .fc-button-primary { background: ${colors.accent}; border-color: ${colors.accent};
  font-size: 13px; text-transform: capitalize; box-shadow: none; }
.db-cal .fc-button-primary:hover { background: ${colors.accentSoft}; border-color: ${colors.accentSoft}; }
.db-cal .fc-button-primary:disabled { background: ${hexA(colors.accent, 0.4)}; border-color: transparent; }
.db-cal .fc-button-primary:not(:disabled).fc-button-active { background: ${colors.accentSoft}; border-color: ${colors.accentSoft}; }
.db-cal .fc-event { border-radius: 6px; padding: 1px 3px; font-size: 12px; cursor: pointer; }
.db-cal .fc-timegrid-now-indicator-line { border-color: ${colors.red}; }
`;

export function CalendarTab({ projects, onChanged }: { projects: ProjectRow[]; onChanged: () => void }) {
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; draft?: EventDraft } | null>(null);
  const range = useRef<{ from: Date; to: Date } | null>(null);

  const refresh = useCallback(() => {
    if (!range.current) return;
    listOccurrences(range.current.from, range.current.to).then(setOccurrences).catch(() => setOccurrences([]));
  }, []);

  const events = occurrencesToEvents(occurrences);

  function afterSave() {
    setEditing(null);
    refresh();
    onChanged();
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <style>{CAL_CSS}</style>
      <PageHeading
        title="Events"
        subtitle="Drag on the grid to create a block, click an event to edit, drag to move or resize. Link a block to a project to surface its to-dos."
        action={<PrimaryButton onClick={() => setEditing({ id: null })}>+ New event</PrimaryButton>}
      />
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div className="db-cal" style={{ flex: 1, minWidth: 0 }}>
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            firstDay={1}
            allDaySlot={false}
            nowIndicator
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            scrollTime="07:00:00"
            slotDuration="01:00:00"
            snapDuration="00:30:00"
            height="74vh"
            expandRows
            selectable
            selectMirror
            editable
            eventStartEditable
            eventDurationEditable
            events={events}
            select={(info) => setEditing({ id: null, draft: selectionToDraft(info.startStr, info.endStr) })}
            eventClick={(info) => setEditing({ id: String(info.event.extendedProps.eventId) })}
            eventDrop={(info) => {
              const patch = moveResizeToPatch(info.event.startStr, info.event.endStr);
              updateEvent(String(info.event.extendedProps.eventId), patch)
                .then(() => {
                  refresh();
                  onChanged();
                })
                .catch(() => info.revert());
            }}
            eventResize={(info) => {
              const patch = moveResizeToPatch(info.event.startStr, info.event.endStr);
              updateEvent(String(info.event.extendedProps.eventId), patch)
                .then(() => {
                  refresh();
                  onChanged();
                })
                .catch(() => info.revert());
            }}
            datesSet={(info) => {
              range.current = { from: info.start, to: info.end };
              refresh();
            }}
          />
        </div>

        {editing && (
          <div style={{ width: 380, flex: "0 0 380px" }}>
            <Editor
              key={`${editing.id ?? "new"}:${editing.draft?.start ?? ""}`}
              editingId={editing.id}
              draft={editing.draft}
              projects={projects}
              onSaved={afterSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const TYPES: { key: EventType; label: string }[] = [
  { key: "meeting", label: "Meeting" },
  { key: "block", label: "Focus block" },
  { key: "general", label: "General" },
];

function Editor({
  editingId,
  draft,
  projects,
  onSaved,
  onCancel,
}: {
  editingId: string | null;
  draft?: EventDraft;
  projects: ProjectRow[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>(draft?.type ?? "block");
  const [start, setStart] = useState(draft?.start ?? "");
  const [end, setEnd] = useState(draft?.end ?? "");
  const [projectId, setProjectId] = useState("");
  const [recurringLocked, setRecurringLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dialog, confirmDelete } = useConfirmDelete();

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
    if (!(await confirmDelete("event", title))) return;
    await deleteEvent(editingId);
    onSaved();
  }

  const fieldCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

  return (
    <>
      {dialog}
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
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" autoFocus />
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

      {/* Stacked full-width so the datetime value never clips in the 380px panel (FR-EVT-3). */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
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
    </>
  );
}
