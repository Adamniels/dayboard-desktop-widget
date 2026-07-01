// The weekly grid (FR-VIEW-1), transcribed from the prototype: a day header (weekday label +
// date, today in an accent circle), an hour gutter, events positioned and striped by type,
// and a now line with a dot. Lives inside the framed calendar card; the now/next card is in
// the side panel. Orientation-aware. Reads theme tokens (Phase 3 polish).
import { colorForType, colors, hexA, hourPx, radii } from "./theme";
import type { DisplayConfig, OccurrenceDTO } from "./types";
import { tzDateKey } from "./view";
import { buildWeek, tzParts } from "./week";

const HOUR_PX = hourPx.week;
const GUTTER = 56;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  config: DisplayConfig;
  occurrences: OccurrenceDTO[];
  now: Date;
  landscape: boolean;
}

function minutesToTop(minutes: number, startHour: number): number {
  return ((minutes - startHour * 60) / 60) * HOUR_PX;
}

// The date number shown under each weekday, aligned to the display timezone's current week.
function weekDates(now: Date, timezone: string, weekdayIndex: number): number[] {
  const [y, m, d] = tzDateKey(now, timezone).split("-").map(Number);
  return DAY_LABELS.map((_, i) => new Date(Date.UTC(y!, m! - 1, d! - weekdayIndex + i)).getUTCDate());
}

export function WeekView({ config, occurrences, now, landscape }: Props) {
  const { startHour, endHour, timezone } = config;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const week = buildWeek(occurrences, timezone);

  const nowParts = tzParts(now, timezone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const nowVisible = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;
  const dates = weekDates(now, timezone, nowParts.weekdayIndex);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, color: colors.text }}>
      {/* day header */}
      <div style={{ display: "flex", paddingLeft: GUTTER, borderBottom: `1px solid ${colors.borderFaint}`, flex: "0 0 auto" }}>
        {DAY_LABELS.map((label, dayIndex) => {
          const isToday = dayIndex === nowParts.weekdayIndex;
          return (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "9px 0", minWidth: landscape ? 0 : 64 }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: colors.textFaint, fontWeight: 600 }}>{label}</span>
              <span
                style={
                  isToday
                    ? { fontSize: 16, fontWeight: 600, color: "#fff", background: colors.accent, width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }
                    : { fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,.8)" }
                }
              >
                {dates[dayIndex]}
              </span>
            </div>
          );
        })}
      </div>

      {/* scroll body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "auto" }} id="db-grid-scroll">
        {/* hour gutter */}
        <div style={{ width: GUTTER, flex: `0 0 ${GUTTER}px` }}>
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_PX, fontSize: 10.5, color: colors.textGhost, textAlign: "right", paddingRight: 8, transform: "translateY(-6px)" }}>
              {((h % 12) || 12) + " " + (h < 12 ? "AM" : "PM")}
            </div>
          ))}
        </div>

        {/* day columns */}
        {DAY_LABELS.map((label, dayIndex) => {
          const isToday = dayIndex === nowParts.weekdayIndex;
          return (
            <div key={label} style={{ flex: 1, minWidth: landscape ? 0 : 64, borderLeft: `1px solid ${colors.hairline}`, position: "relative" }}>
              <div style={{ position: "relative", height: hours.length * HOUR_PX }}>
                {hours.map((h) => (
                  <div key={h} style={{ position: "absolute", top: minutesToTop(h * 60, startHour), left: 0, right: 0, borderTop: `1px solid ${colors.hairline}` }} />
                ))}

                {isToday && nowVisible && (
                  <>
                    <div style={{ position: "absolute", top: minutesToTop(nowMinutes, startHour) - 4, left: -4, width: 9, height: 9, borderRadius: "50%", background: colors.red, zIndex: 4, boxShadow: `0 0 8px ${colors.red}` }} />
                    <div style={{ position: "absolute", top: minutesToTop(nowMinutes, startHour), left: 0, right: 0, height: 0, borderTop: `2px solid ${colors.red}`, zIndex: 3 }} />
                  </>
                )}

                {week.events
                  .filter((e) => e.dayIndex === dayIndex)
                  .map((e, i) => {
                    const top = minutesToTop(e.startMinutes, startHour);
                    const height = Math.max(16, ((e.endMinutes - e.startMinutes) / 60) * HOUR_PX);
                    const c = colorForType(e.type);
                    const isBlock = e.type === "block";
                    return (
                      <div
                        key={`${e.eventId}-${i}`}
                        style={{
                          position: "absolute",
                          top,
                          height: height - 2,
                          left: 3,
                          right: 3,
                          background: isBlock ? hexA(c, 0.06) : hexA(c, 0.18),
                          backgroundImage: isBlock
                            ? `repeating-linear-gradient(45deg, ${hexA(c, 0.16)} 0 6px, ${hexA(c, 0.02)} 6px 13px)`
                            : "none",
                          border: isBlock ? `1px dashed ${hexA(c, 0.45)}` : `1px solid ${hexA(c, 0.32)}`,
                          borderLeft: isBlock ? `1px dashed ${hexA(c, 0.45)}` : `3px solid ${c}`,
                          borderRadius: radii.sm,
                          padding: "3px 7px",
                          fontSize: 11,
                          color: colors.textBright,
                          fontWeight: 600,
                          overflow: "hidden",
                          boxSizing: "border-box",
                          opacity: e.isOverride ? 0.85 : 1,
                        }}
                      >
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
