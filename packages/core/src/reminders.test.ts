import { describe, expect, it } from "vitest";
import {
  buildReminderTakeover,
  nextReminderFire,
  nextTimerPhase,
  relativeFireTime,
  type ReminderInput,
  type TimerState,
} from "./reminders";

const now = new Date("2026-06-29T12:00:00.000Z");

describe("absolute reminder fires", () => {
  it("returns the future fireAt for a one-off reminder", () => {
    const r: ReminderInput = { kind: "absolute", fireAt: new Date("2026-06-29T20:00:00.000Z"), offsetMinutes: null, recurrence: null };
    expect(nextReminderFire(r, now)?.toISOString()).toBe("2026-06-29T20:00:00.000Z");
  });

  it("returns null once the fire time has passed", () => {
    const r: ReminderInput = { kind: "absolute", fireAt: new Date("2026-06-29T08:00:00.000Z"), offsetMinutes: null, recurrence: null };
    expect(nextReminderFire(r, now)).toBeNull();
  });
});

describe("relative timer fires", () => {
  it("computes the fire time as now plus the offset", () => {
    expect(relativeFireTime(now, 25).toISOString()).toBe("2026-06-29T12:25:00.000Z");
  });
});

describe("recurring reminder next occurrence", () => {
  it("advances to the next daily occurrence after lastFiredAt", () => {
    const r: ReminderInput = {
      kind: "absolute",
      fireAt: new Date("2026-06-20T16:30:00.000Z"),
      offsetMinutes: null,
      recurrence: "FREQ=DAILY",
      lastFiredAt: new Date("2026-06-29T16:30:00.000Z"),
    };
    // next strictly after lastFiredAt -> the following day at the same time
    expect(nextReminderFire(r, now)?.toISOString()).toBe("2026-06-30T16:30:00.000Z");
  });
});

describe("reminder fire payload", () => {
  it("maps a reminder to the takeover payload", () => {
    expect(buildReminderTakeover({ title: "Stretch", chime: true, kind: "absolute" })).toEqual({
      title: "Stretch",
      chime: true,
      kind: "absolute",
    });
  });
});

describe("nextTimerPhase (Pomodoro machine)", () => {
  const base: TimerState = {
    mode: "pomodoro",
    phase: "work",
    status: "running",
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    cyclesTarget: 4,
    cyclesDone: 0,
  };

  it("goes work -> short_break on a normal cycle", () => {
    const t = nextTimerPhase(base, now);
    expect(t.phase).toBe("short_break");
    expect(t.durationMinutes).toBe(5);
    expect(t.cyclesDone).toBe(1);
    expect(t.endsAt?.toISOString()).toBe("2026-06-29T12:05:00.000Z");
  });

  it("inserts a long_break every cyclesTarget work cycles", () => {
    const t = nextTimerPhase({ ...base, cyclesDone: 3 }, now);
    expect(t.phase).toBe("long_break");
    expect(t.durationMinutes).toBe(15);
  });

  it("finishes after a long_break", () => {
    const t = nextTimerPhase({ ...base, phase: "long_break", cyclesDone: 4 }, now);
    expect(t.status).toBe("done");
    expect(t.endsAt).toBeNull();
  });

  it("a countdown ends after its single phase", () => {
    const t = nextTimerPhase({ ...base, mode: "countdown", phase: null }, now);
    expect(t.status).toBe("done");
  });
});
