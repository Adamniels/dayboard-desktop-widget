// Persistence for the planning-layer resources: projects, todos, and notes.
import { schema, type NewNote, type NewProject, type NewTodo, type Note, type Project, type Todo } from "@dayboard/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";

const { project, todo, note } = schema;

// --- projects ----------------------------------------------------------------

export const listProjects = (): Promise<Project[]> => db.select().from(project);

export async function createProject(input: NewProject): Promise<Project> {
  const [row] = await db.insert(project).values(input).returning();
  return row!;
}

export async function updateProject(id: string, patch: Partial<NewProject>): Promise<Project | undefined> {
  const [row] = await db.update(project).set({ ...patch, updatedAt: new Date() }).where(eq(project.id, id)).returning();
  return row;
}

export async function deleteProject(id: string): Promise<boolean> {
  const [row] = await db.delete(project).where(eq(project.id, id)).returning();
  return row != null;
}

// --- todos -------------------------------------------------------------------

export const listTodosByProject = (projectId: string): Promise<Todo[]> =>
  db.select().from(todo).where(eq(todo.projectId, projectId));

/** All todos, used by the surfacing rule (core.surfaceTodos filters by active project). */
export const listAllTodos = (): Promise<Todo[]> => db.select().from(todo);

export async function createTodo(input: NewTodo): Promise<Todo> {
  const [row] = await db.insert(todo).values(input).returning();
  return row!;
}

export async function updateTodo(id: string, patch: Partial<NewTodo>): Promise<Todo | undefined> {
  // Stamp completedAt when transitioning to done.
  const set: Partial<NewTodo> = { ...patch, updatedAt: new Date() };
  if (patch.status === "done") set.completedAt = new Date();
  if (patch.status && patch.status !== "done") set.completedAt = null;
  const [row] = await db.update(todo).set(set).where(eq(todo.id, id)).returning();
  return row;
}

export async function deleteTodo(id: string): Promise<boolean> {
  const [row] = await db.delete(todo).where(eq(todo.id, id)).returning();
  return row != null;
}

// --- notes -------------------------------------------------------------------

export async function listNotes(projectId?: string): Promise<Note[]> {
  if (projectId) return db.select().from(note).where(eq(note.projectId, projectId));
  return db.select().from(note);
}

export async function createNote(input: NewNote): Promise<Note> {
  const [row] = await db.insert(note).values(input).returning();
  return row!;
}

export async function updateNote(id: string, patch: Partial<NewNote>): Promise<Note | undefined> {
  const [row] = await db.update(note).set({ ...patch, updatedAt: new Date() }).where(eq(note.id, id)).returning();
  return row;
}

export async function deleteNote(id: string): Promise<boolean> {
  const [row] = await db.delete(note).where(eq(note.id, id)).returning();
  return row != null;
}
