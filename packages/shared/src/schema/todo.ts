import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { project } from "./project";

export const TODO_STATUSES = ["open", "in_progress", "done"] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

// A to do belongs to a project (not to an event). It surfaces on the display while
// now falls inside an event linked to its project; that rule lives in packages/core.
export const todo = pgTable("todo", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").$type<TodoStatus>().notNull().default("open"),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
