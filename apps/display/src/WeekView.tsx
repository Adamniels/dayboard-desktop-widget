// The weekly grid (FR-VIEW-1), transcribed from the prototype: day columns Mon..Sun, an
// hour gutter, events positioned and colored by type, and a now line. Orientation-aware
// via the `landscape` prop. Pixel polish against the prototype is expected to continue;
// this binds the real read model to the prototype's structure.
import { nowNext, type Occurrence } from "@dayboard/core";
import type { DisplayConfig, OccurrenceDTO } from "./types";
import { buildWeek, colorForType, tzParts } from "./week";

const HOUR_PX = 54;
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

export function WeekView({ config, occurrences, now, landscape }: Props) {
  const { startHour, endHour, timezone } = config;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const week = buildWeek(occurrences, timezone);

  const nowParts = tzParts(now, timezone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const nowVisible = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  const asOccurrences: Occurrence[] = occurrences.map((o) => ({
    start: new Date(o.start),
    end: new Date(o.end),
    isOverride: o.isOverride,
    cancelled: false,
  }));
  const { current, next } = nowNext(now, asOccurrences);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "#EDEAF2" }}>
      <NowNextCard occurrences={occurrences} current={current} next={next} />

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "auto" }} id="db-grid-scroll">
        {/* hour gutter */}
        <div style={{ width: 52, flex: "0 0 52px" }}>
          <div style={{ height: 28 }} />
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_PX, fontSize: 11, color: "rgba(255,255,255,.4)", textAlign: "right", paddingRight: 6 }}>
              {((h % 12) || 12) + (h < 12 ? "a" : "p")}
            </div>
          ))}
        </div>

        {/* day columns */}
        {DAY_LABELS.map((label, dayIndex) => {
          const isToday = dayIndex === nowParts.weekdayIndex;
          return (
            <div key={label} style={{ flex: 1, minWidth: landscape ? 0 : 64, borderLeft: "1px solid rgba(255,255,255,.06)", position: "relative" }}>
              <div style={{ height: 28, textAlign: "center", fontSize: 12, fontWeight: 600, color: isToday ? "#fff" : "rgba(255,255,255,.7)" }}>
                {label}
              </div>
              <div style={{ position: "relative", height: hours.length * HOUR_PX }}>
                {hours.map((h) => (
                  <div key={h} style={{ position: "absolute", top: minutesToTop(h * 60, startHour) + 28, left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,.05)" }} />
                ))}

                {isToday && nowVisible && (
                  <div style={{ position: "absolute", top: minutesToTop(nowMinutes, startHour) + 28, left: 0, right: 0, height: 2, background: "#FF6B6B", zIndex: 3 }} />
                )}

                {week.events
                  .filter((e) => e.dayIndex === dayIndex)
                  .map((e, i) => {
                    const top = minutesToTop(e.startMinutes, startHour) + 28;
                    const height = Math.max(16, ((e.endMinutes - e.startMinutes) / 60) * HOUR_PX);
                    return (
                      <div
                        key={`${e.eventId}-${i}`}
                        style={{
                          position: "absolute",
                          top,
                          height,
                          left: 3,
                          right: 3,
                          background: colorForType(e.type),
                          borderRadius: 7,
                          padding: "3px 6px",
                          fontSize: 11,
                          color: "#0d0b10",
                          fontWeight: 600,
                          overflow: "hidden",
                          opacity: e.isOverride ? 0.85 : 1,
                        }}
                      >
                        {e.title}
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

function NowNextCard({
  occurrences,
  current,
  next,
}: {
  occurrences: OccurrenceDTO[];
  current: Occurrence | null;
  next: Occurrence | null;
}) {
  const titleFor = (occ: Occurrence | null) =>
    occ ? occurrences.find((o) => o.start === occ.start.toISOString())?.title ?? "" : null;

  return (
    <div style={{ display: "flex", gap: 16, padding: "10px 14px", fontSize: 13 }}>
      <span style={{ color: "rgba(255,255,255,.6)" }}>
        Now: <strong style={{ color: "#fff" }}>{titleFor(current) ?? "Free"}</strong>
      </span>
      <span style={{ color: "rgba(255,255,255,.6)" }}>
        Next: <strong style={{ color: "#fff" }}>{titleFor(next) ?? "—"}</strong>
      </span>
    </div>
  );
}
