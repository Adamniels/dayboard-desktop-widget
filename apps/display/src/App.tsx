// Display root: fetches the week, surfaced todos, notes, and the running timer; refetches
// on WebSocket changes (FR-RT-1); shows a takeover on reminder/timer fires (FR-REM-4); and
// renders the weekly view plus side panel in the screen's orientation (FR-VIEW-2).
import { useCallback, useEffect, useState } from "react";
import { fetchConfig, fetchNotes, fetchOccurrences, fetchSurfaced, fetchTimers, weekWindow } from "./api";
import { SidePanel } from "./SidePanel";
import { Takeover, type TakeoverContent } from "./Takeover";
import type { DisplayConfig, NoteDTO, OccurrenceDTO, TimerDTO, TodoDTO } from "./types";
import { useDisplaySocket, type SocketMessage } from "./useDisplaySocket";
import { WeekView } from "./WeekView";

export function App() {
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);
  const [surfaced, setSurfaced] = useState<TodoDTO[]>([]);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [timer, setTimer] = useState<TimerDTO | null>(null);
  const [takeover, setTakeover] = useState<TakeoverContent | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [landscape, setLandscape] = useState(() => window.innerWidth >= window.innerHeight);

  const refetch = useCallback(async () => {
    const { from, to } = weekWindow(new Date());
    try {
      const [occ, surf, ns, timers] = await Promise.all([
        fetchOccurrences(from, to),
        fetchSurfaced().catch(() => []),
        fetchNotes().catch(() => []),
        fetchTimers().catch(() => []),
      ]);
      setOccurrences(occ);
      setSurfaced(surf);
      setNotes(ns);
      setTimer(timers.find((t) => t.status !== "done") ?? null);
    } catch {
      // keep last data if the api is briefly unreachable
    }
  }, []);

  const onMessage = useCallback(
    (msg: SocketMessage) => {
      if (msg.type === "reminder.fired") {
        const p = msg.payload as { title: string; chime: boolean } | undefined;
        if (p) setTakeover({ title: p.title, chime: p.chime });
      } else if (msg.type === "timer.fired") {
        const t = msg.timer as TimerDTO | null;
        setTakeover({ title: t?.phase === "work" ? "Break time" : "Back to focus", chime: Boolean(msg.chime) });
        void refetch();
      } else if (msg.type === "timer.updated") {
        const t = msg.timer as TimerDTO | null;
        setTimer(t && t.status !== "done" ? t : null);
      } else {
        // events/projects/todos/notes changed
        void refetch();
      }
    },
    [refetch],
  );

  const status = useDisplaySocket(onMessage);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => setConfig({ timezone: "UTC", startHour: 7, endHour: 21 }));
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    const minute = setInterval(() => void refetch(), 60_000);
    const onResize = () => setLandscape(window.innerWidth >= window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(tick);
      clearInterval(minute);
      window.removeEventListener("resize", onResize);
    };
  }, [refetch]);

  return (
    <div style={{ height: "100vh", background: "#161118", fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", color: "#EDEAF2" }}>
        <h1 style={{ fontSize: landscape ? 22 : 18, margin: 0 }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </h1>
        <span style={{ fontSize: 12, color: status === "open" ? "#3FB8AF" : "#FF6B6B" }}>
          {status === "open" ? "live" : "reconnecting"}
        </span>
      </header>
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: landscape ? "row" : "column",
          gap: 14,
          padding: landscape ? "0 18px 18px" : "0 12px 12px",
        }}
      >
        <div style={{ flex: landscape ? 1 : "1 1 54%", minHeight: 0 }}>
          {config ? (
            <WeekView config={config} occurrences={occurrences} now={now} landscape={landscape} />
          ) : (
            <p style={{ color: "#EDEAF2", padding: 20 }}>Loading…</p>
          )}
        </div>
        <div style={{ width: landscape ? 320 : "auto", flex: landscape ? "0 0 320px" : "1 1 46%", minHeight: 0 }}>
          <SidePanel surfaced={surfaced} timer={timer} notes={notes} now={now} />
        </div>
      </main>
      {takeover && <Takeover content={takeover} onDismiss={() => setTakeover(null)} />}
    </div>
  );
}
