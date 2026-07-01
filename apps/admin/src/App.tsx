// Admin root: the control room Adam reaches over Tailscale. A dark sidebar nav with the
// Calendar, Projects, Reminders & timers, Notes, and Display & sync tabs, transcribed from the
// prototype's admin surface. The display never talks to it directly; both talk to the api.
import { useCallback, useEffect, useState } from "react";
import { getProjects, listOccurrences, weekWindow } from "./api";
import { CalendarTab } from "./EventEditor";
import { DisplayTab, NotesTab, ProjectsTab, RemindersTab } from "./Planning";
import { KEYFRAMES, colors, hexA } from "./theme";
import type { OccurrenceDTO, ProjectRow } from "./types";

type Tab = "calendar" | "projects" | "reminders" | "notes" | "display";

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "calendar", label: "Calendar", icon: "◷" },
  { key: "projects", label: "Projects", icon: "⊡" },
  { key: "reminders", label: "Reminders", icon: "◔" },
  { key: "notes", label: "Notes", icon: "✎" },
  { key: "display", label: "Display & Sync", icon: "▦" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("calendar");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);

  const loadProjects = useCallback(() => {
    getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const loadOccurrences = useCallback(() => {
    const { from, to } = weekWindow(new Date());
    listOccurrences(from, to).then(setOccurrences).catch(() => setOccurrences([]));
  }, []);

  useEffect(() => {
    loadProjects();
    loadOccurrences();
  }, [loadProjects, loadOccurrences]);

  const refreshCalendar = useCallback(() => {
    loadOccurrences();
    loadProjects();
  }, [loadOccurrences, loadProjects]);

  return (
    <div style={{ height: "100vh", display: "flex", background: colors.bg, color: colors.text, fontFamily: "system-ui, sans-serif" }}>
      <style>{KEYFRAMES}</style>

      {/* nav rail */}
      <div style={{ width: 210, flex: "0 0 210px", borderRight: `1px solid ${colors.borderFaint}`, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 14px" }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${colors.accent}, ${colors.teal})` }} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Dayboard</span>
        </div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: colors.textGhost, fontWeight: 600, padding: "4px 10px 10px" }}>Control room</div>
        {NAV.map((n) => {
          const active = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "10px 11px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: active ? 600 : 500, background: active ? hexA(colors.accent, 0.15) : "transparent", color: active ? "#fff" : colors.textMuted }}
            >
              <span style={{ width: 18, textAlign: "center" }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          );
        })}
        <div style={{ marginTop: "auto", background: hexA(colors.accent, 0.08), border: `1px solid ${hexA(colors.accent, 0.2)}`, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, color: colors.accentSoft, fontWeight: 600, marginBottom: 4 }}>Source of truth</div>
          <div style={{ fontSize: 11.5, color: colors.textDim, lineHeight: 1.45 }}>Dayboard syncs both ways with Google so plans follow you to your phone.</div>
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "28px 32px" }}>
        {tab === "calendar" && <CalendarTab projects={projects} occurrences={occurrences} onChanged={refreshCalendar} />}
        {tab === "projects" && <ProjectsTab projects={projects} onChanged={loadProjects} />}
        {tab === "reminders" && <RemindersTab />}
        {tab === "notes" && <NotesTab projects={projects} />}
        {tab === "display" && <DisplayTab />}
      </div>
    </div>
  );
}
