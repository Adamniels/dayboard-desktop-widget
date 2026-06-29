import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { project } from "./project";

// A note is general, or optionally linked to a project (projectId null = general).
export const note = pgTable("note", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  projectId: uuid("project_id").references(() => project.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
