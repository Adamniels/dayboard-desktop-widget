// The display side panel: the now/next card, surfaced todos (FR-TODO-2), the Pomodoro ring,
// and notes. Read only. Transcribed from the prototype's panel; reads theme tokens (Phase 3
// polish).
import { nowNext, type Occurrence } from "@dayboard/core";
import { card, colors, font, hexA } from "./theme";
import type { NoteDTO, OccurrenceDTO, TimerDTO, TodoDTO } from "./types";
import { tzParts } from "./week";

export function SidePanel({
  occurrences,
  surfaced,
  timer,
  notes,
  now,
  timezone,
}: {
  occurrences: OccurrenceDTO[];
  surfaced: TodoDTO[];
  timer: TimerDTO | null;
  notes: NoteDTO[];
  now: Date;
  timezone: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <NowNextCard occurrences={occurrences} now={now} timezone={timezone} />

      {surfaced.length > 0 && (
        <div
          style={{
            ...card,
            padding: "15px 16px",
            background: `linear-gradient(160deg,${hexA(colors.teal, 0.22)},${hexA(colors.teal, 0.07)})`,
            border: `1px solid ${hexA(colors.teal, 0.45)}`,
            boxShadow: `0 0 0 1px ${hexA(colors.teal, 0.06)}, 0 8px 30px -12px ${hexA(colors.teal, 0.4)}`,
            animation: "dbUp .4s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.teal, boxShadow: `0 0 10px ${hexA(colors.teal, 0.7)}` }} />
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: colors.tealText, fontWeight: 600 }}>Focus · tasks</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {surfaced.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 4px", fontSize: font.title }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, border: `1.5px solid ${hexA("#ffffff", 0.3)}`, flex: "0 0 auto" }} />
                <span style={{ color: "rgba(255,255,255,.9)", fontWeight: 500 }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PomodoroRing timer={timer && timer.status !== "done" ? timer : null} now={now} />

      <div style={card}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: colors.textFaint, fontWeight: 600, marginBottom: 9 }}>
          Notes
        </div>
        {notes.length === 0 ? (
          <div style={{ fontSize: font.body, color: colors.textFaint }}>No notes.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ fontSize: font.body, color: "rgba(255,255,255,.8)" }}>
                {n.body}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- now / next ---------------------------------------------------------------

function minutesOf(date: Date, timezone: string): number {
  const p = tzParts(date, timezone);
  return p.hour * 60 + p.minute;
}

function shortTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")}`;
}
const ampm = (min: number) => (Math.floor(min / 60) < 12 ? "AM" : "PM");
const fmtLeft = (mins: number) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins} min left`);
const fmtRel = (mins: number) => (mins >= 60 ? `in ${Math.floor(mins / 60)}h ${mins % 60}m` : `in ${mins} min`);

function NowNextCard({ occurrences, now, timezone }: { occurrences: OccurrenceDTO[]; now: Date; timezone: string }) {
  const asOccurrences: Occurrence[] = occurrences.map((o) => ({
    start: new Date(o.start),
    end: new Date(o.end),
    isOverride: o.isOverride,
    cancelled: false,
  }));
  const { current, next } = nowNext(now, asOccurrences);
  const titleFor = (occ: Occurrence | null) =>
    occ ? occurrences.find((o) => o.start === occ.start.toISOString())?.title ?? "" : "";

  const nowMin = minutesOf(now, timezone);

  let nowBlock = null;
  if (current) {
    const s = minutesOf(current.start, timezone);
    const e = minutesOf(current.end, timezone);
    nowBlock = (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.red, boxShadow: `0 0 8px ${colors.red}` }} />
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", fontWeight: 600 }}>Now</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.01em", lineHeight: 1.15 }}>{titleFor(current)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>{shortTime(s)} – {shortTime(e)} {ampm(e)}</span>
          <span style={{ fontSize: 12, color: colors.redText, background: hexA(colors.red, 0.12), padding: "2px 8px", borderRadius: 6, fontWeight: 500 }}>{fmtLeft(Math.max(0, e - nowMin))}</span>
        </div>
      </div>
    );
  } else {
    nowBlock = (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: hexA("#ffffff", 0.3) }} />
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", fontWeight: 600 }}>Now</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>Free</div>
      </div>
    );
  }

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
      {nowBlock}
      {next && (
        <div style={{ paddingTop: 13, borderTop: `1px solid ${hexA("#ffffff", 0.07)}` }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", fontWeight: 600, marginBottom: 7 }}>Up next</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.01em" }}>{titleFor(next)}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)", whiteSpace: "nowrap" }}>{shortTime(minutesOf(next.start, timezone))} {ampm(minutesOf(next.start, timezone))}</span>
          </div>
          <div style={{ fontSize: 12, color: colors.accentSoft, marginTop: 3 }}>{fmtRel(Math.max(0, minutesOf(next.start, timezone) - nowMin))}</div>
        </div>
      )}
    </div>
  );
}

// --- pomodoro -----------------------------------------------------------------

function phaseTotalMinutes(timer: TimerDTO): number {
  if (timer.phase === "work") return timer.workMinutes ?? 25;
  if (timer.phase === "short_break") return timer.breakMinutes ?? 5;
  if (timer.phase === "long_break") return timer.longBreakMinutes ?? 15;
  return timer.workMinutes ?? 25;
}

function PomodoroRing({ timer, now }: { timer: TimerDTO | null; now: Date }) {
  // Idle default when nothing is running, so the kiosk always shows the focus timer (started
  // and controlled from admin), matching the prototype's always-present Pomodoro card.
  const idle = timer === null;
  const totalMs = (timer ? phaseTotalMinutes(timer) : 25) * 60_000;
  const endsAt = timer?.endsAt ? new Date(timer.endsAt).getTime() : now.getTime();
  const remainingMs = idle
    ? totalMs
    : timer!.status === "paused"
      ? timer!.remainingMs ?? 0
      : Math.max(0, endsAt - now.getTime());
  const fraction = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;

  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  const label = idle ? "Focus" : timer!.phase === "work" ? "Focus" : timer!.phase ? "Break" : (timer!.label ?? "Timer");
  const statusText = idle ? "ready" : timer!.status;
  const color = !idle && timer!.phase && timer!.phase !== "work" ? colors.teal : colors.accent;

  const r = 52;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: 96, height: 96, flex: "0 0 auto" }}>
        <svg viewBox="0 0 120 120" style={{ width: 96, height: 96, transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke={hexA("#ffffff", 0.08)} strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 21, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {mm}:{String(ss).padStart(2, "0")}
          </span>
          <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".08em", color: colors.textFaint, fontWeight: 600 }}>
            {statusText}
          </span>
        </div>
      </div>
      <div style={{ fontSize: font.body, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
