// Admin root: the connection status, the week's events, and the event editor. This is the
// control surface Adam reaches over Tailscale; the display never talks to it directly.
import { useCallback, useEffect, useState } from "react";
import { deleteEvent, getCalendars, getProjects, getSyncStatus, listOccurrences, weekWindow } from "./api";
import { EventEditor } from "./EventEditor";
import { Planning } from "./Planning";
import type { CalendarInfo, OccurrenceDTO, ProjectRow, SyncStatus } from "./types";

export function App() {
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);

  const loadProjects = useCallback(() => {
    getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const refresh = useCallback(async () => {
    const { from, to } = weekWindow(new Date());
    const [occ, st, cals] = await Promise.all([
      listOccurrences(from, to),
      getSyncStatus().catch(() => null),
      getCalendars().catch(() => []),
    ]);
    setOccurrences(occ);
    setStatus(st);
    setCalendars(cals);
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onDelete(id: string) {
    await deleteEvent(id);
    await refresh();
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 22 }}>Dayboard Admin</h1>
        <ConnectionStatus status={status} calendars={calendars} />
      </header>

      <div style={{ display: "flex", gap: 32, marginTop: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <section style={{ flex: "1 1 420px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16 }}>This week</h2>
            <button onClick={() => setEditing({ id: null })} style={{ padding: "6px 12px" }}>
              + New event
            </button>
          </div>
          {occurrences.length === 0 && <p style={{ color: "#777" }}>No events this week.</p>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {occurrences.map((o, i) => (
              <li key={`${o.eventId}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", padding: "8px 0" }}>
                <span>
                  <strong>{o.title}</strong>{" "}
                  <span style={{ color: "#888", fontSize: 13 }}>
                    {o.type}
                    {o.recurring ? " · recurring" : ""} · {new Date(o.start).toLocaleString()}
                  </span>
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditing({ id: o.eventId })} style={{ padding: "2px 10px" }}>
                    Edit
                  </button>
                  <button onClick={() => onDelete(o.eventId)} style={{ padding: "2px 10px" }}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {editing && (
          <section style={{ flex: "0 1 440px" }}>
            <EventEditor
              editingId={editing.id}
              projects={projects}
              onSaved={() => {
                setEditing(null);
                void refresh();
              }}
              onCancel={() => setEditing(null)}
            />
          </section>
        )}
      </div>

      <Planning projects={projects} onProjectsChanged={loadProjects} />
    </div>
  );
}

function ConnectionStatus({ status, calendars }: { status: SyncStatus | null; calendars: CalendarInfo[] }) {
  if (!status) return <span style={{ color: "#c0392b", fontSize: 13 }}>api unreachable</span>;
  if (!status.connected) {
    return <span style={{ color: "#9a6b00", fontSize: 13 }}>Google not connected — run google:connect</span>;
  }
  const synced = status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleTimeString() : "never";
  return (
    <span style={{ color: "#2d7", fontSize: 13 }}>
      {status.account} · {calendars.filter((c) => c.selected).length} calendar(s) · synced {synced}
    </span>
  );
}
