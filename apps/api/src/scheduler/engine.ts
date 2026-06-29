// The reminder/timer scheduler. Decisions are pure (@dayboard/core); this owns the clock.
// A 1s tick fires due reminders and advances timer phases. On boot it rehydrates from the
// DB and silently resolves anything that came due while the Mini was off (decision 3),
// then starts ticking so nothing fires late and loudly.
import { buildReminderTakeover, nextReminderFire, nextTimerPhase, type TimerState } from "@dayboard/core";
import type { FastifyBaseLogger } from "fastify";
import type { Reminder, Timer } from "@dayboard/shared";
import {
  listArmableReminders,
  listRunningTimers,
  updateReminder,
  updateTimer,
} from "../repo/reminders";
import { broadcast } from "../ws";

function timerState(t: Timer): TimerState {
  return {
    mode: t.mode,
    phase: t.phase,
    status: t.status,
    workMinutes: t.workMinutes,
    breakMinutes: t.breakMinutes,
    longBreakMinutes: t.longBreakMinutes,
    cyclesTarget: t.cyclesTarget,
    cyclesDone: t.cyclesDone,
  };
}

/** Fire a due reminder: broadcast the takeover, then advance or retire it. */
async function fireReminder(r: Reminder, now: Date): Promise<void> {
  broadcast({ type: "reminder.fired", payload: buildReminderTakeover(r) });
  if (r.recurrence) {
    const next = nextReminderFire({ ...r, lastFiredAt: now }, now);
    await updateReminder(r.id, { fireAt: next, lastFiredAt: now, enabled: next != null });
  } else {
    await updateReminder(r.id, { enabled: false, lastFiredAt: now });
  }
}

/** Advance a timer whose phase ended at `endedAt`. Returns the new ends instant or null. */
async function advanceTimer(t: Timer, endedAt: Date, announce: boolean): Promise<Date | null> {
  const transition = nextTimerPhase(timerState(t), endedAt);
  const updated = await updateTimer(t.id, {
    phase: transition.phase,
    status: transition.status,
    endsAt: transition.endsAt,
    cyclesDone: transition.cyclesDone,
  });
  if (announce && updated) {
    broadcast({ type: "timer.updated", timer: updated });
    broadcast({ type: "timer.fired", timer: updated, chime: t.chime });
  }
  return transition.endsAt;
}

/** Silently resolve anything overdue at boot so the live tick never fires it late. */
async function rehydrate(): Promise<void> {
  const now = new Date();

  for (const r of await listArmableReminders()) {
    if (!r.fireAt || r.fireAt > now) continue;
    if (r.recurrence) {
      const next = nextReminderFire({ ...r, lastFiredAt: now }, now);
      await updateReminder(r.id, { fireAt: next, lastFiredAt: now, enabled: next != null });
    } else {
      await updateReminder(r.id, { enabled: false, lastFiredAt: now }); // marked fired silently
    }
  }

  for (const t of await listRunningTimers()) {
    let current = t;
    let endsAt = t.endsAt;
    // Advance through any phases that elapsed during downtime, without announcing.
    let guard = 0;
    while (endsAt && endsAt <= now && current.status === "running" && guard < 1000) {
      const newEnds = await advanceTimer(current, endsAt, false);
      const refreshed = await listRunningTimers().then((ts) => ts.find((x) => x.id === t.id));
      if (!refreshed) break;
      current = refreshed;
      endsAt = newEnds;
      guard += 1;
    }
  }
}

async function tick(): Promise<void> {
  const now = new Date();

  for (const r of await listArmableReminders()) {
    if (r.fireAt && r.fireAt <= now) await fireReminder(r, now);
  }
  for (const t of await listRunningTimers()) {
    if (t.endsAt && t.endsAt <= now) await advanceTimer(t, t.endsAt, true);
  }
}

export async function startScheduler(log: FastifyBaseLogger): Promise<void> {
  await rehydrate();
  let running = false;
  setInterval(() => {
    if (running) return;
    running = true;
    tick()
      .catch((err) => log.warn({ err }, "scheduler tick failed"))
      .finally(() => {
        running = false;
      });
  }, 1000);
  log.info("scheduler started");
}
