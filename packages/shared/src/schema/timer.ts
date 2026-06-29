import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { project } from "./project";

export const TIMER_MODES = ["countdown", "pomodoro"] as const;
export type TimerMode = (typeof TIMER_MODES)[number];

export const TIMER_PHASES = ["work", "short_break", "long_break"] as const;
export type TimerPhase = (typeof TIMER_PHASES)[number];

export const TIMER_STATUSES = ["running", "paused", "done"] as const;
export type TimerStatus = (typeof TIMER_STATUSES)[number];

// A running countdown or Pomodoro session. Persisted (with an absolute endsAt) so the
// scheduler can re-arm it after an api restart. Durations are chosen when the timer starts.
export const timer = pgTable("timer", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label"),
  mode: text("mode").$type<TimerMode>().notNull(),
  status: text("status").$type<TimerStatus>().notNull().default("running"),
  phase: text("phase").$type<TimerPhase>(),
  // Absolute instant the current phase ends; the scheduler arms off this.
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
  // Remaining milliseconds, set when paused.
  remainingMs: integer("remaining_ms"),
  workMinutes: integer("work_minutes"),
  breakMinutes: integer("break_minutes"),
  longBreakMinutes: integer("long_break_minutes"),
  cyclesTarget: integer("cycles_target"),
  cyclesDone: integer("cycles_done").notNull().default(0),
  chime: boolean("chime").notNull().default(false),
  projectId: uuid("project_id").references(() => project.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
