// Inferred row types for select (read) and insert (write) across the wire.
import type {
  event,
  eventOverride,
  note,
  project,
  reminder,
  todo,
} from "./schema/index";

export type Event = typeof event.$inferSelect;
export type NewEvent = typeof event.$inferInsert;

export type EventOverride = typeof eventOverride.$inferSelect;
export type NewEventOverride = typeof eventOverride.$inferInsert;

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;

export type Todo = typeof todo.$inferSelect;
export type NewTodo = typeof todo.$inferInsert;

export type Reminder = typeof reminder.$inferSelect;
export type NewReminder = typeof reminder.$inferInsert;

export type Note = typeof note.$inferSelect;
export type NewNote = typeof note.$inferInsert;
