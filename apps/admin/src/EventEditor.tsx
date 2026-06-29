// Create/edit an event (FR-EVT-1/2). Type is meeting/block/general. A Google-sourced
// recurring event is shown read-only for its recurrence (FR-CAL-6); the editor does not
// expose recurrence editing in v1.
import { useEffect, useState } from "react";
import { createEvent, getEvent, updateEvent } from "./api";
import type { EventType } from "./types";

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TYPES: EventType[] = ["meeting", "block", "general"];

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  editingId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function EventEditor({ editingId, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("block");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [recurringLocked, setRecurringLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) {
      setTitle("");
      setType("block");
      setStart("");
      setEnd("");
      setRecurringLocked(false);
      return;
    }
    getEvent(editingId).then((ev) => {
      setTitle(ev.title);
      setType(ev.type);
      setStart(isoToLocalInput(ev.start));
      setEnd(isoToLocalInput(ev.end));
      setRecurringLocked(ev.recurrence != null && ev.googleEventId != null);
    });
  }, [editingId]);

  async function save() {
    setError(null);
    const payload = {
      title,
      type,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      timezone: LOCAL_TZ,
    };
    try {
      if (new Date(payload.end) <= new Date(payload.start)) {
        setError("End must be after start.");
        return;
      }
      if (editingId) await updateEvent(editingId, payload);
      else await createEvent(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, maxWidth: 420 }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>{editingId ? "Edit event" : "New event"}</h2>
      {recurringLocked && (
        <p style={{ color: "#9a6b00", fontSize: 13 }}>
          This is a recurring Google event. Its recurrence is read-only in v1.
        </p>
      )}
      <label style={{ display: "block", marginBottom: 8 }}>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 6 }} />
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Type
        <select value={type} onChange={(e) => setType(e.target.value as EventType)} style={{ width: "100%", padding: 6 }}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Start
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: "100%", padding: 6 }} />
      </label>
      <label style={{ display: "block", marginBottom: 12 }}>
        End
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: "100%", padding: 6 }} />
      </label>
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={!title || !start || !end} style={{ padding: "6px 14px" }}>
          {editingId ? "Save" : "Create"}
        </button>
        <button onClick={onCancel} style={{ padding: "6px 14px" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
