// CRUD for reminders and timers, including Pomodoro start/pause/resume/reset. The
// scheduler (src/scheduler/engine.ts) arms whatever these write. Durations are chosen on
// start (decision 3). Writes broadcast so admin and display refetch.
import { relativeFireTime } from "@dayboard/core";
import { REMINDER_KINDS } from "@dayboard/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createReminder,
  createTimer,
  deleteReminder,
  deleteTimer,
  getTimer,
  listReminders,
  listTimers,
  updateReminder,
  updateTimer,
} from "../repo/reminders";
import { broadcast } from "../ws";

const reminderObject = z.object({
  title: z.string().min(1),
  kind: z.enum(REMINDER_KINDS),
  fireAt: z.coerce.date().nullish(),
  offsetMinutes: z.number().int().positive().nullish(),
  recurrence: z.string().nullish(),
  chime: z.boolean().optional(),
  enabled: z.boolean().optional(),
  projectId: z.string().uuid().nullish(),
});

const reminderBody = reminderObject.refine(
  (r) => (r.kind === "absolute" ? r.fireAt != null : r.offsetMinutes != null),
  { message: "absolute reminders need fireAt; relative reminders need offsetMinutes" },
);

const timerStartBody = z.object({
  mode: z.enum(["countdown", "pomodoro"]),
  label: z.string().nullish(),
  durationMinutes: z.number().int().positive().optional(), // countdown
  workMinutes: z.number().int().positive().optional(), // pomodoro
  breakMinutes: z.number().int().positive().optional(),
  longBreakMinutes: z.number().int().positive().optional(),
  cyclesTarget: z.number().int().positive().optional(),
  chime: z.boolean().optional(),
  projectId: z.string().uuid().nullish(),
});

export async function reminderRoutes(app: FastifyInstance): Promise<void> {
  // reminders
  app.get("/reminders", () => listReminders());
  app.post("/reminders", async (req, reply) => {
    const p = reminderBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const now = new Date();
    const fireAt = p.data.kind === "relative" ? relativeFireTime(now, p.data.offsetMinutes!) : p.data.fireAt!;
    const row = await createReminder({
      title: p.data.title,
      kind: p.data.kind,
      fireAt,
      offsetMinutes: p.data.offsetMinutes ?? null,
      recurrence: p.data.recurrence ?? null,
      chime: p.data.chime ?? false,
      enabled: p.data.enabled ?? true,
      projectId: p.data.projectId ?? null,
    });
    broadcast({ type: "reminders.changed" });
    return reply.code(201).send(row);
  });
  app.patch("/reminders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = reminderObject.partial().safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const row = await updateReminder(id, p.data);
    if (!row) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "reminders.changed" });
    return row;
  });
  app.delete("/reminders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await deleteReminder(id))) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "reminders.changed" });
    return reply.code(204).send();
  });

  // timers
  app.get("/timers", () => listTimers());
  app.post("/timers", async (req, reply) => {
    const p = timerStartBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const now = new Date();
    const isPomodoro = p.data.mode === "pomodoro";
    const firstMinutes = isPomodoro ? p.data.workMinutes : p.data.durationMinutes;
    if (!firstMinutes) {
      return reply.code(400).send({ error: isPomodoro ? "workMinutes required" : "durationMinutes required" });
    }
    const row = await createTimer({
      label: p.data.label ?? null,
      mode: p.data.mode,
      status: "running",
      phase: isPomodoro ? "work" : null,
      endsAt: new Date(now.getTime() + firstMinutes * 60_000),
      workMinutes: p.data.workMinutes ?? null,
      breakMinutes: p.data.breakMinutes ?? null,
      longBreakMinutes: p.data.longBreakMinutes ?? null,
      cyclesTarget: p.data.cyclesTarget ?? null,
      chime: p.data.chime ?? false,
      projectId: p.data.projectId ?? null,
    });
    broadcast({ type: "timer.updated", timer: row });
    return reply.code(201).send(row);
  });
  app.post("/timers/:id/pause", async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = await getTimer(id);
    if (!t) return reply.code(404).send({ error: "not found" });
    const remainingMs = t.endsAt ? Math.max(0, t.endsAt.getTime() - Date.now()) : 0;
    const row = await updateTimer(id, { status: "paused", remainingMs, endsAt: null });
    broadcast({ type: "timer.updated", timer: row });
    return row;
  });
  app.post("/timers/:id/resume", async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = await getTimer(id);
    if (!t) return reply.code(404).send({ error: "not found" });
    const endsAt = new Date(Date.now() + (t.remainingMs ?? 0));
    const row = await updateTimer(id, { status: "running", endsAt, remainingMs: null });
    broadcast({ type: "timer.updated", timer: row });
    return row;
  });
  app.post("/timers/:id/reset", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await updateTimer(id, { status: "done", endsAt: null, remainingMs: null });
    if (!row) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "timer.updated", timer: row });
    return row;
  });
  app.delete("/timers/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await deleteTimer(id))) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "timer.updated", timer: null });
    return reply.code(204).send();
  });
}
