// CRUD for projects, todos, and notes, plus the surfaced-todos read model. Writes
// broadcast a change so the display and admin refetch.
import { surfaceTodos, type LinkedOccurrence } from "@dayboard/core";
import { TODO_STATUSES } from "@dayboard/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createNote,
  createProject,
  createTodo,
  deleteNote,
  deleteProject,
  deleteTodo,
  listAllTodos,
  listNotes,
  listProjects,
  listTodosByProject,
  updateNote,
  updateProject,
  updateTodo,
} from "../repo/planning";
import { listOccurrencesRaw } from "../repo/events";
import { broadcast } from "../ws";

const projectBody = z.object({ name: z.string().min(1), color: z.string().nullish(), archived: z.boolean().optional() });
const todoBody = z.object({
  title: z.string().min(1),
  status: z.enum(TODO_STATUSES).optional(),
  dueAt: z.coerce.date().nullish(),
});
const noteBody = z.object({ body: z.string().min(1), projectId: z.string().uuid().nullish() });

/** Attach the linked project's color to project-scoped rows (FR-PROJ-4 read model). */
async function withProjectColor<T extends { projectId: string | null }>(
  rows: T[],
): Promise<(T & { projectColor: string | null })[]> {
  const colorById = new Map((await listProjects()).map((p) => [p.id, p.color]));
  return rows.map((r) => ({ ...r, projectColor: r.projectId ? colorById.get(r.projectId) ?? null : null }));
}

export async function planningRoutes(app: FastifyInstance): Promise<void> {
  // projects
  app.get("/projects", () => listProjects());
  app.post("/projects", async (req, reply) => {
    const p = projectBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const row = await createProject(p.data);
    broadcast({ type: "projects.changed" });
    return reply.code(201).send(row);
  });
  app.patch("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = projectBody.partial().safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const row = await updateProject(id, p.data);
    if (!row) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "projects.changed" });
    return row;
  });
  app.delete("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await deleteProject(id))) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "projects.changed" });
    return reply.code(204).send();
  });

  // todos (scoped to a project)
  app.get("/projects/:id/todos", (req) => listTodosByProject((req.params as { id: string }).id));
  app.post("/projects/:id/todos", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = todoBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const row = await createTodo({ ...p.data, projectId: id });
    broadcast({ type: "todos.changed" });
    return reply.code(201).send(row);
  });
  app.patch("/todos/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = todoBody.partial().safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const row = await updateTodo(id, p.data);
    if (!row) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "todos.changed" });
    return row;
  });
  app.delete("/todos/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await deleteTodo(id))) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "todos.changed" });
    return reply.code(204).send();
  });

  // notes
  app.get("/notes", async (req) => withProjectColor(await listNotes((req.query as { projectId?: string }).projectId)));
  app.post("/notes", async (req, reply) => {
    const p = noteBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const row = await createNote(p.data);
    broadcast({ type: "notes.changed" });
    return reply.code(201).send(row);
  });
  app.patch("/notes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = noteBody.partial().safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.flatten() });
    const row = await updateNote(id, p.data);
    if (!row) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "notes.changed" });
    return row;
  });
  app.delete("/notes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await deleteNote(id))) return reply.code(404).send({ error: "not found" });
    broadcast({ type: "notes.changed" });
    return reply.code(204).send();
  });

  // surfaced todos: open todos of the project(s) whose event contains now (FR-TODO-2)
  app.get("/surfaced", async () => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const rawOccurrences = await listOccurrencesRaw(dayStart, dayEnd, now);
    const linked: LinkedOccurrence[] = rawOccurrences.map((o) => ({
      start: o.start,
      end: o.end,
      isOverride: o.isOverride,
      cancelled: false,
      projectId: o.projectId,
    }));
    const todos = await listAllTodos();
    return withProjectColor(surfaceTodos(now, linked, todos));
  });
}
