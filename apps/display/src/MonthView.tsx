// The month view (FR-VIEW-3): a 6×7 grid of day cells with up to three event chips each then
// a "+N" overflow, today highlighted and out-of-month days dimmed. No now line. Transcribed
// from the prototype's `monthCells`. Reads the pure buildMonth bucketing and theme tokens.
import type { DisplayConfig, OccurrenceDTO } from "./types";
import { colorForType, colors, font, hexA, radii } from "./theme";
import { buildMonth } from "./view";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  config: DisplayConfig;
  occurrences: OccurrenceDTO[];
  now: Date;
}

export function MonthView({ config, occurrences, now }: Props) {
  const { timezone } = config;
  const month = buildMonth(occurrences, timezone, now);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: colors.text }}>
      <div style={{ textAlign: "center", fontSize: 16, fontWeight: 600, padding: "8px 0 10px", letterSpacing: "-.01em" }}>{monthLabel}</div>

      {/* weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, padding: "0 8px 6px" }}>
        {DOW.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: font.hour, fontWeight: 600, color: colors.textFaint, textTransform: "uppercase", letterSpacing: ".06em" }}>
            {d}
          </div>
        ))}
      </div>

      {/* 6x7 grid */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)", gap: 6, padding: "0 8px 8px" }}>
        {month.cells.map((cell) => (
          <div
            key={cell.dateKey}
            style={{
              background: cell.isToday ? hexA(colors.accent, 0.12) : colors.surfaceDim,
              border: cell.isToday ? `1px solid ${hexA(colors.accent, 0.5)}` : `1px solid ${colors.borderFaint}`,
              borderRadius: radii.md,
              padding: "5px 6px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              opacity: cell.inMonth ? 1 : 0.35,
              minHeight: 0,
            }}
          >
            <div style={{ fontSize: font.meta, fontWeight: cell.isToday ? 700 : 500, color: cell.isToday ? "#fff" : colors.textMuted, marginBottom: 3 }}>
              {cell.dayNum}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0, overflow: "hidden" }}>
              {cell.events.map((ev) => {
                const c = colorForType(ev.type);
                return (
                  <div
                    key={ev.eventId}
                    style={{
                      fontSize: font.chip,
                      fontWeight: 500,
                      color: colors.textBright,
                      background: hexA(c, ev.type === "block" ? 0.18 : 0.28),
                      borderRadius: 4,
                      padding: "1px 4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ev.title}
                  </div>
                );
              })}
              {cell.overflow > 0 && (
                <div style={{ fontSize: font.chip, color: colors.textFaint, padding: "0 4px" }}>+{cell.overflow}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
