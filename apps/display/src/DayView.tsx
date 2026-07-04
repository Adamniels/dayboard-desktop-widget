// The single-day view (FR-VIEW-3): today's occurrences in one tall column spanning the full
// 00:00–24:00 day, scrolled to keep the now line centered (clamped to the day edges) via
// useNowScroll. Lives inside the framed calendar card with a centered day header; the now/next
// card is in the side panel. Reads buildDay + tokens.
import { resolveEventColor } from "@dayboard/core";
import { useRef } from "react";
import { colorForType, colors, hexA, hourPx, radii } from "./theme";
import type { DisplayConfig, OccurrenceDTO } from "./types";
import { buildDay } from "./view";
import { useNowScroll } from "./useNowScroll";
import { tzParts } from "./week";

const HOUR_PX = hourPx.day;
const GUTTER = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  config: DisplayConfig;
  occurrences: OccurrenceDTO[];
  now: Date;
  landscape: boolean;
}

function minutesToTop(minutes: number): number {
  return (minutes / 60) * HOUR_PX;
}

export function DayView({ config, occurrences, now }: Props) {
  const { timezone } = config;
  const day = buildDay(occurrences, timezone, now);

  const nowParts = tzParts(now, timezone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;

  const scrollRef = useRef<HTMLDivElement>(null);
  useNowScroll(scrollRef, nowMinutes, HOUR_PX);

  const headLabel = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(now).toUpperCase();
  const headDate = new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "short", day: "numeric" }).format(now);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, color: colors.text }}>
      {/* centered day header */}
      <div style={{ display: "flex", paddingLeft: GUTTER, borderBottom: `1px solid ${colors.borderFaint}`, flex: "0 0 auto" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "9px 0" }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: colors.accentSoft, fontWeight: 600 }}>{headLabel}</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{headDate}</span>
        </div>
      </div>

      {/* scroll body — full day, auto-centered on now */}
      <div ref={scrollRef} style={{ display: "flex", flex: 1, minHeight: 0, overflow: "auto" }} id="db-grid-scroll">
        <div style={{ width: GUTTER, flex: `0 0 ${GUTTER}px` }}>
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX, fontSize: 10.5, color: colors.textGhost, textAlign: "right", paddingRight: 8, transform: "translateY(-6px)" }}>
              {((h % 12) || 12) + " " + (h < 12 ? "AM" : "PM")}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, borderLeft: `1px solid ${colors.hairline}`, position: "relative" }}>
          <div style={{ position: "relative", height: HOURS.length * HOUR_PX }}>
            {HOURS.map((h) => (
              <div key={h} style={{ position: "absolute", top: minutesToTop(h * 60), left: 0, right: 0, borderTop: `1px solid ${colors.hairline}` }} />
            ))}

            <div style={{ position: "absolute", top: minutesToTop(nowMinutes) - 4, left: -4, width: 9, height: 9, borderRadius: "50%", background: colors.red, zIndex: 7, boxShadow: `0 0 8px ${colors.red}` }} />
            <div style={{ position: "absolute", top: minutesToTop(nowMinutes), left: 0, right: 6, height: 0, borderTop: `2px solid ${colors.red}`, zIndex: 6 }} />

            {day.events.map((e, i) => {
              const top = minutesToTop(e.startMinutes);
              const height = Math.max(20, ((e.endMinutes - e.startMinutes) / 60) * HOUR_PX);
              const c = resolveEventColor(e.projectColor, colorForType(e.type));
              const isBlock = e.type === "block";
              return (
                <div
                  key={`${e.eventId}-${i}`}
                  style={{
                    position: "absolute",
                    top,
                    height: height - 3,
                    left: 8,
                    right: 10,
                    background: isBlock ? hexA(c, 0.06) : hexA(c, 0.18),
                    backgroundImage: isBlock
                      ? `repeating-linear-gradient(45deg, ${hexA(c, 0.16)} 0 6px, ${hexA(c, 0.02)} 6px 13px)`
                      : "none",
                    border: isBlock ? `1px dashed ${hexA(c, 0.45)}` : `1px solid ${hexA(c, 0.32)}`,
                    borderLeft: isBlock ? `1px dashed ${hexA(c, 0.45)}` : `3px solid ${c}`,
                    borderRadius: radii.md,
                    padding: height < 34 ? "3px 9px" : "6px 9px",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    opacity: e.isOverride ? 0.85 : 1,
                  }}
                >
                  <div style={{ fontSize: height < 34 ? 11.5 : 12.5, fontWeight: 600, color: colors.textBright, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.title}
                  </div>
                  {height >= 34 && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", fontWeight: 500, marginTop: 1 }}>
                      {fmtTime(e.startMinutes)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = (h % 12) || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
