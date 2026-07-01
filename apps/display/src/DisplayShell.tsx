// The kiosk shell (Phase 3 polish): the big clock header with a date and a status pill, then
// the body — a framed calendar card holding the active day/week/month view, and the side
// panel. Presentational only (no fetching); App wraps it with live data. Transcribed from the
// prototype's kiosk header + displayBody + calWrap.
import { DayView } from "./DayView";
import { MonthView } from "./MonthView";
import { SidePanel } from "./SidePanel";
import { KEYFRAMES, colors, hexA } from "./theme";
import type { DisplayConfig, NoteDTO, OccurrenceDTO, TimerDTO, TodoDTO } from "./types";
import { WeekView } from "./WeekView";

export type Connection = "connecting" | "open" | "closed";

interface Props {
  config: DisplayConfig;
  occurrences: OccurrenceDTO[];
  surfaced: TodoDTO[];
  notes: NoteDTO[];
  timer: TimerDTO | null;
  now: Date;
  landscape: boolean;
  connection: Connection;
}

function clockParts(now: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    time: `${get("hour")}:${get("minute")}`,
    secs: get("second"),
    ampm: get("dayPeriod"),
    date: new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long", month: "long", day: "numeric" }).format(now),
  };
}

export function DisplayShell({ config, occurrences, surfaced, notes, timer, now, landscape, connection }: Props) {
  const clock = clockParts(now, config.timezone);
  const clockSize = landscape ? 46 : 40;

  return (
    <div style={{ height: "100vh", background: colors.bgDeep, fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", color: colors.text }}>
      <style>{KEYFRAMES}</style>

      {/* KIOSK HEADER */}
      <div
        style={
          landscape
            ? { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px 14px", padding: "22px 28px 18px", flex: "0 0 auto" }
            : { display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, padding: "18px 20px 14px", flex: "0 0 auto" }
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: clockSize, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 0.9, fontVariantNumeric: "tabular-nums" }}>{clock.time}</span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, color: colors.textGhost, fontWeight: 400 }}>{clock.secs}</span>
            <span style={{ fontSize: 15, color: colors.textFaint, fontWeight: 500 }}>{clock.ampm}</span>
          </div>
          <div style={{ fontSize: 15, color: colors.textMuted, fontWeight: 500, letterSpacing: ".01em" }}>{clock.date}</div>
        </div>

        <div style={landscape ? { display: "flex", alignItems: "center", gap: 12 } : { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <StatusPill connection={connection} />
        </div>
      </div>

      {/* BODY: framed calendar card + panel */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: landscape ? "row" : "column",
          gap: 14,
          padding: landscape ? "0 18px 18px" : "0 16px 16px",
        }}
      >
        <div
          style={{
            flex: landscape ? 1 : "1 1 54%",
            minWidth: 0,
            minHeight: 0,
            background: colors.surfaceDim,
            border: `1px solid ${colors.borderFaint}`,
            borderRadius: 16,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {config.activeView === "day" ? (
            <DayView config={config} occurrences={occurrences} now={now} landscape={landscape} />
          ) : config.activeView === "month" ? (
            <MonthView config={config} occurrences={occurrences} now={now} />
          ) : (
            <WeekView config={config} occurrences={occurrences} now={now} landscape={landscape} />
          )}
        </div>

        <div style={{ width: landscape ? 320 : "auto", flex: landscape ? "0 0 320px" : "1 1 46%", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 13 }}>
          <SidePanel occurrences={occurrences} surfaced={surfaced} timer={timer} notes={notes} now={now} timezone={config.timezone} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ connection }: { connection: Connection }) {
  const open = connection === "open";
  const c = open ? colors.teal : colors.red;
  const label = open ? "Live" : "Reconnecting";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 12px", background: hexA(c, 0.1), border: `1px solid ${hexA(c, 0.25)}`, borderRadius: 20, flex: "0 0 auto" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}`, animation: open ? "dbPulse 2.4s ease-in-out infinite" : "none" }} />
      <span style={{ fontSize: 12, color: open ? colors.tealText : colors.redText, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}
