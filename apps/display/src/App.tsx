// Display root: fetches config + per-view occurrences and the panel data, tracks the live
// socket, and feeds it all into the presentational DisplayShell. Refetches on WebSocket
// changes — including `display.changed`, which flips the view live (FR-RT-1, FR-VIEW-3) — and
// shows a takeover on reminder/timer fires (FR-REM-4). Orientation-aware (FR-VIEW-2).
import { useCallback, useEffect, useState } from "react";
import { fetchConfig, fetchNotes, fetchOccurrences, fetchSurfaced, fetchTimers, windowForView } from "./api";
import { DisplayShell } from "./DisplayShell";
import { Takeover, type TakeoverContent } from "./Takeover";
import type { DisplayConfig, NoteDTO, OccurrenceDTO, TimerDTO, TodoDTO } from "./types";
import { useDisplaySocket, type SocketMessage } from "./useDisplaySocket";

const DEFAULT_CONFIG: DisplayConfig = { timezone: "UTC", startHour: 7, endHour: 21, activeView: "week" };

export function App() {
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);
  const [surfaced, setSurfaced] = useState<TodoDTO[]>([]);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [timer, setTimer] = useState<TimerDTO | null>(null);
  const [takeover, setTakeover] = useState<TakeoverContent | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [landscape, setLandscape] = useState(() => window.innerWidth >= window.innerHeight);

  // Reload config first (so a view switch is honored), then occurrences for that view's
  // window plus the panel data. Refetching config each cycle is cheap and keeps the window
  // centered on now across day/month rollovers.
  const reload = useCallback(async () => {
    const cfg = await fetchConfig().catch(() => DEFAULT_CONFIG);
    const { from, to } = windowForView(cfg.activeView, new Date());
    try {
      const [occ, surf, ns, timers] = await Promise.all([
        fetchOccurrences(from, to),
        fetchSurfaced().catch(() => []),
        fetchNotes().catch(() => []),
        fetchTimers().catch(() => []),
      ]);
      setConfig(cfg);
      setOccurrences(occ);
      setSurfaced(surf);
      setNotes(ns);
      setTimer(timers.find((t) => t.status !== "done") ?? null);
    } catch {
      setConfig(cfg);
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
        void reload();
      } else if (msg.type === "timer.updated") {
        const t = msg.timer as TimerDTO | null;
        setTimer(t && t.status !== "done" ? t : null);
      } else {
        // events/projects/todos/notes changed, or display.changed (the active view switched)
        void reload();
      }
    },
    [reload],
  );

  const status = useDisplaySocket(onMessage);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    const minute = setInterval(() => void reload(), 60_000);
    const onResize = () => setLandscape(window.innerWidth >= window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(tick);
      clearInterval(minute);
      window.removeEventListener("resize", onResize);
    };
  }, [reload]);

  return (
    <>
      <DisplayShell
        config={config ?? DEFAULT_CONFIG}
        occurrences={occurrences}
        surfaced={surfaced}
        notes={notes}
        timer={timer}
        now={now}
        landscape={landscape}
        connection={status}
      />
      {takeover && <Takeover content={takeover} onDismiss={() => setTakeover(null)} />}
    </>
  );
}
