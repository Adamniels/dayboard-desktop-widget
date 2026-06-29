// Display root: fetches config + occurrences for the current week, refetches on a
// WebSocket change (FR-RT-1) and on a one-minute tick, and renders the weekly view in the
// orientation the screen is mounted in (FR-VIEW-2).
import { useCallback, useEffect, useState } from "react";
import { fetchConfig, fetchOccurrences, weekWindow } from "./api";
import type { DisplayConfig, OccurrenceDTO } from "./types";
import { useDisplaySocket } from "./useDisplaySocket";
import { WeekView } from "./WeekView";

export function App() {
  const [config, setConfig] = useState<DisplayConfig | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceDTO[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [landscape, setLandscape] = useState(() => window.innerWidth >= window.innerHeight);

  const refetch = useCallback(async () => {
    const { from, to } = weekWindow(new Date());
    try {
      setOccurrences(await fetchOccurrences(from, to));
    } catch {
      // Keep showing the last data if the api is briefly unreachable.
    }
  }, []);

  const status = useDisplaySocket(refetch);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => setConfig({ timezone: "UTC", startHour: 7, endHour: 21 }));
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    const onResize = () => setLandscape(window.innerWidth >= window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(tick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

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
      <main style={{ flex: 1, minHeight: 0, padding: landscape ? "0 18px 18px" : "0 12px 12px" }}>
        {config ? (
          <WeekView config={config} occurrences={occurrences} now={now} landscape={landscape} />
        ) : (
          <p style={{ color: "#EDEAF2", padding: 20 }}>Loading…</p>
        )}
      </main>
    </div>
  );
}
