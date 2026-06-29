// The display side panel: surfaced todos (FR-TODO-2), the Pomodoro ring, and notes.
// Read only. Transcribed from the prototype's panel.
import type { NoteDTO, TimerDTO, TodoDTO } from "./types";

const card: React.CSSProperties = {
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 16,
  padding: 16,
  color: "#EDEAF2",
};

export function SidePanel({
  surfaced,
  timer,
  notes,
  now,
}: {
  surfaced: TodoDTO[];
  timer: TimerDTO | null;
  notes: NoteDTO[];
  now: Date;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13, overflowY: "auto" }}>
      {surfaced.length > 0 && (
        <div
          style={{
            ...card,
            background: "linear-gradient(160deg,rgba(63,184,175,.22),rgba(63,184,175,.07))",
            border: "1px solid rgba(63,184,175,.45)",
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#9FE3DE", fontWeight: 600, marginBottom: 10 }}>
            Focus · tasks
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {surfaced.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, border: "1.5px solid #3FB8AF", display: "inline-block" }} />
                {t.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {timer && timer.status !== "done" && <PomodoroRing timer={timer} now={now} />}

      <div style={card}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.45)", fontWeight: 600, marginBottom: 9 }}>
          Notes
        </div>
        {notes.length === 0 ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>No notes.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ fontSize: 13, color: "rgba(255,255,255,.8)" }}>
                {n.body}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function phaseTotalMinutes(timer: TimerDTO): number {
  if (timer.phase === "work") return timer.workMinutes ?? 25;
  if (timer.phase === "short_break") return timer.breakMinutes ?? 5;
  if (timer.phase === "long_break") return timer.longBreakMinutes ?? 15;
  return timer.workMinutes ?? 25;
}

function PomodoroRing({ timer, now }: { timer: TimerDTO; now: Date }) {
  const endsAt = timer.endsAt ? new Date(timer.endsAt).getTime() : now.getTime();
  const remainingMs = timer.status === "paused" ? timer.remainingMs ?? 0 : Math.max(0, endsAt - now.getTime());
  const totalMs = phaseTotalMinutes(timer) * 60_000;
  const fraction = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;

  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  const label = timer.phase === "work" ? "Focus" : timer.phase ? "Break" : (timer.label ?? "Timer");
  const color = timer.phase === "work" ? "#7C6CF6" : "#3FB8AF";

  const r = 52;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: 96, height: 96, flex: "0 0 auto" }}>
        <svg viewBox="0 0 120 120" style={{ width: 96, height: 96, transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
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
          <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.4)", fontWeight: 600 }}>
            {timer.status}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
