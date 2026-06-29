// Integration tests for the planning layer (FR-PROJ-1, FR-TODO-1, FR-NOTE-1). Need
// Postgres; run on Adam's machine via `pnpm check`.
import { schema } from "@dayboard/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db, pool } from "./db";
import { buildServer } from "./server";

const { event, eventOverride, note, reminder, timer, todo, project } = schema;

async function resetDb(): Promise<void> {
  await db.delete(eventOverride);
  await db.delete(event);
  await db.delete(note);
  await db.delete(todo);
  await db.delete(timer);
  await db.delete(reminder);
  await db.delete(project);
}

beforeEach(resetDb);
afterAll(async () => {
  await pool.end();
});

describe("project crud", () => {
  it("creates, lists, updates, and deletes a project", async () => {
    const app = await buildServer();
    await app.ready();

    const created = await app.inject({ method: "POST", url: "/projects", payload: { name: "Dayboard" } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;

    const listed = await app.inject({ method: "GET", url: "/projects" });
    expect(listed.json().some((p: { id: string }) => p.id === id)).toBe(true);

    const patched = await app.inject({ method: "PATCH", url: `/projects/${id}`, payload: { name: "Dayboard v2" } });
    expect(patched.json().name).toBe("Dayboard v2");

    const deleted = await app.inject({ method: "DELETE", url: `/projects/${id}` });
    expect(deleted.statusCode).toBe(204);
    await app.close();
  });
});

describe("todo crud", () => {
  it("creates a todo under a project and updates its status", async () => {
    const app = await buildServer();
    await app.ready();

    const project = await app.inject({ method: "POST", url: "/projects", payload: { name: "Errands" } });
    const projectId = project.json().id as string;

    const created = await app.inject({ method: "POST", url: `/projects/${projectId}/todos`, payload: { title: "Buy milk" } });
    expect(created.statusCode).toBe(201);
    const todoId = created.json().id as string;

    const listed = await app.inject({ method: "GET", url: `/projects/${projectId}/todos` });
    expect(listed.json()).toHaveLength(1);

    const done = await app.inject({ method: "PATCH", url: `/todos/${todoId}`, payload: { status: "done" } });
    expect(done.json().status).toBe("done");
    expect(done.json().completedAt).not.toBeNull();

    const deleted = await app.inject({ method: "DELETE", url: `/todos/${todoId}` });
    expect(deleted.statusCode).toBe(204);
    await app.close();
  });
});

describe("note crud", () => {
  it("creates a general note and a project-linked note", async () => {
    const app = await buildServer();
    await app.ready();

    const general = await app.inject({ method: "POST", url: "/notes", payload: { body: "remember this" } });
    expect(general.statusCode).toBe(201);
    expect(general.json().projectId).toBeNull();

    const project = await app.inject({ method: "POST", url: "/projects", payload: { name: "Writing" } });
    const projectId = project.json().id as string;
    const linked = await app.inject({ method: "POST", url: "/notes", payload: { body: "outline", projectId } });
    expect(linked.json().projectId).toBe(projectId);

    const listed = await app.inject({ method: "GET", url: "/notes" });
    expect(listed.json().length).toBeGreaterThanOrEqual(2);
    await app.close();
  });
});
