import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { project } from "./project";

export const REMINDER_KINDS = ["absolute", "relative"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

// Schema only in Phase 0; the scheduler that fires these lives on the Mini in Phase 2.
// Absolute reminders set fireAt; relative reminders/timers (incl. Pomodoro) set
// offsetMinutes. Either may recur via an RRULE string.
export const reminder = pgTable("reminder", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  kind: text("kind").$type<ReminderKind>().notNull(),
  fireAt: timestamp("fire_at", { withTimezone: true, mode: "date" }),
  offsetMinutes: integer("offset_minutes"),
  recurrence: text("recurrence"),
  chime: boolean("chime").notNull().default(false),
  // A reminder can be paused without deleting it (the prototype's toggle).
  enabled: boolean("enabled").notNull().default(true),
  // For recurring reminders, the last fire, so the next occurrence advances past it.
  lastFiredAt: timestamp("last_fired_at", { withTimezone: true, mode: "date" }),
  projectId: uuid("project_id").references(() => project.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
