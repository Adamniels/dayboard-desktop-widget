// Pure reminder and timer math. The api owns the clock and the setTimeout loop; these
// functions decide when things fire and how a Pomodoro advances. No clock, no IO
// (core-stays-pure). See .claude/memory/decisions/unified-event-model.md.
import * as rruleNs from "rrule";

const rrulestr =
  rruleNs.rrulestr ?? (rruleNs as unknown as { default: { rrulestr: typeof rruleNs.rrulestr } }).default.rrulestr;

export type ReminderKind = "absolute" | "relative";

export interface ReminderInput {
  kind: ReminderKind;
  /** Absolute reminders: the wall-clock instant. */
  fireAt: Date | null;
  /** Relative reminders/timers: minutes from creation. */
  offsetMinutes: number | null;
  /** Optional RFC 5545 RRULE for recurrence. */
  recurrence: string | null;
  /** Last time this recurring reminder fired, so the next occurrence advances past it. */
  lastFiredAt?: Date | null;
}

/**
 * FR-REM-1 / FR-REM-3: the next instant a reminder should fire after `now`, or null if it
 * has no future fire. Absolute non-recurring returns fireAt if still future; recurring
 * returns the next RRULE instant strictly after max(now, lastFiredAt).
 */
export function nextReminderFire(reminder: ReminderInput, now: Date): Date | null {
  if (reminder.recurrence) {
    const anchor = reminder.fireAt ?? now;
    const ruleText = reminder.recurrence.startsWith("RRULE:")
      ? reminder.recurrence
      : `RRULE:${reminder.recurrence}`;
    const rule = rrulestr(ruleText, { dtstart: anchor });
    const after = reminder.lastFiredAt && reminder.lastFiredAt > now ? reminder.lastFiredAt : now;
    return rule.after(after, false);
  }
  if (reminder.fireAt && reminder.fireAt.getTime() > now.getTime()) {
    return reminder.fireAt;
  }
  return null;
}

/**
 * FR-REM-2: the instant a relative reminder/timer fires, `now + offsetMinutes`.
 */
export function relativeFireTime(now: Date, offsetMinutes: number): Date {
  return new Date(now.getTime() + offsetMinutes * 60_000);
}

export interface ReminderTakeover {
  title: string;
  chime: boolean;
  kind: ReminderKind;
}

/**
 * FR-REM-4: the display takeover payload for a fired reminder.
 */
export function buildReminderTakeover(reminder: { title: string; chime: boolean; kind: ReminderKind }): ReminderTakeover {
  return { title: reminder.title, chime: reminder.chime, kind: reminder.kind };
}

// --- timers / Pomodoro -------------------------------------------------------

export type TimerMode = "countdown" | "pomodoro";
export type TimerPhase = "work" | "short_break" | "long_break";
export type TimerStatus = "running" | "paused" | "done";

export interface TimerState {
  mode: TimerMode;
  phase: TimerPhase | null;
  status: TimerStatus;
  workMinutes: number | null;
  breakMinutes: number | null;
  longBreakMinutes: number | null;
  cyclesTarget: number | null;
  cyclesDone: number;
}

export interface TimerTransition {
  phase: TimerPhase | null;
  status: TimerStatus;
  cyclesDone: number;
  /** Minutes the new phase runs; 0 when the timer is done. */
  durationMinutes: number;
  /** Absolute end instant of the new phase, or null when done. */
  endsAt: Date | null;
}

/**
 * The pure phase machine for timers. Given a timer whose current phase just ended at
 * `now`, return the next phase, status, and end instant. A countdown ends after its one
 * phase. A Pomodoro alternates work and short_break, inserting a long_break every
 * `cyclesTarget` work cycles, then finishes.
 */
export function nextTimerPhase(timer: TimerState, now: Date): TimerTransition {
  const done = (cyclesDone: number): TimerTransition => ({
    phase: null,
    status: "done",
    cyclesDone,
    durationMinutes: 0,
    endsAt: null,
  });

  if (timer.mode === "countdown") {
    return done(timer.cyclesDone);
  }

  const work = timer.workMinutes ?? 25;
  const shortBreak = timer.breakMinutes ?? 5;
  const longBreak = timer.longBreakMinutes ?? 15;
  const target = timer.cyclesTarget ?? 4;

  // Just finished a work phase -> a break (long every `target`th cycle), else -> work.
  if (timer.phase === "work") {
    const cyclesDone = timer.cyclesDone + 1;
    const isLong = cyclesDone % target === 0;
    const minutes = isLong ? longBreak : shortBreak;
    return {
      phase: isLong ? "long_break" : "short_break",
      status: "running",
      cyclesDone,
      durationMinutes: minutes,
      endsAt: new Date(now.getTime() + minutes * 60_000),
    };
  }

  // Just finished a long break -> the session is complete.
  if (timer.phase === "long_break") {
    return done(timer.cyclesDone);
  }

  // Finished a short break (or starting) -> back to work.
  return {
    phase: "work",
    status: "running",
    cyclesDone: timer.cyclesDone,
    durationMinutes: work,
    endsAt: new Date(now.getTime() + work * 60_000),
  };
}
