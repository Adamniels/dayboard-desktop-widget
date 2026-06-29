// Event CRUD (FR-EVT-1). Reads return expanded occurrences; writes broadcast a change so
// the display refreshes (FR-RT-1). Recurrence editing of Google-sourced recurring events is
// rejected in v1 (FR-CAL-6).
import { EVENT_TYPES } from "@dayboard/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createEvent,
  getEvent,
  listOccurrences,
  softDeleteEvent,
  updateEvent,
} from "../repo/events";
import { broadcast } from "../ws";

const createBody = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  type: z.enum(EVENT_TYPES),
  start: z.coerce.date(),
  end: z.coerce.date(),
  timezone: z.string().min(1),
  recurrence: z.string().nullish(),
  projectId: z.string().uuid().nullish(),
});
const updateBody = createBody.partial();

const windowQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function defaultWindow(now: Date): { from: Date; to: Date } {
  // Monday 00:00 of the current week through the following Monday.
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from, to };
}

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.get("/events", async (req, reply) => {
    const parsed = windowQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const now = new Date();
    const win = parsed.data.from && parsed.data.to
      ? { from: parsed.data.from, to: parsed.data.to }
      : defaultWindow(now);
    return listOccurrences(win.from, win.to, now);
  });

  app.get("/events/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const found = await getEvent(id);
    if (!found || found.deletedAt) return reply.code(404).send({ error: "not found" });
    return found;
  });

  app.post("/events", async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    if (parsed.data.end <= parsed.data.start) {
      return reply.code(400).send({ error: "end must be after start" });
    }
    const created = await createEvent(parsed.data);
    broadcast({ type: "events.changed" });
    return reply.code(201).send(created);
  });

  app.patch("/events/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await getEvent(id);
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: "not found" });

    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    // FR-CAL-6: recurrence of a Google-sourced recurring event is read-only in v1.
    const touchesRecurrence = parsed.data.recurrence !== undefined;
    if (touchesRecurrence && existing.googleEventId && existing.recurrence) {
      return reply.code(422).send({ error: "recurrence of a Google recurring event is read-only in v1" });
    }

    const updated = await updateEvent(id, parsed.data);
    broadcast({ type: "events.changed" });
    return updated;
  });

  app.delete("/events/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await softDeleteEvent(id);
    if (!ok) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "events.changed" });
    return reply.code(204).send();
  });
}
