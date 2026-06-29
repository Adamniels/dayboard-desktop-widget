import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { project } from "./project";

// Event kinds. Extend Dayboard by adding a kind here, never a new table
// (see .claude/memory/decisions/unified-event-model.md).
export const EVENT_TYPES = ["meeting", "block"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// The unified Event. Time is absolute (timestamptz, stored UTC) plus an explicit
// IANA timezone, plus an optional RFC 5545 RRULE string expanded to occurrences by
// packages/core (see .claude/memory/decisions/datetime-recurrence-model.md). The
// prototype's weekday-index shape is deliberately NOT used.
export const event = pgTable("event", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").$type<EventType>().notNull(),
  start: timestamp("start", { withTimezone: true, mode: "date" }).notNull(),
  end: timestamp("end", { withTimezone: true, mode: "date" }).notNull(),
  timezone: text("timezone").notNull(),
  allDay: boolean("all_day").notNull().default(false),
  recurrence: text("recurrence"),
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  projectId: uuid("project_id").references(() => project.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  // updatedAt drives last-write-wins for Google sync.
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

// Recurrence exceptions: a moved or cancelled instance of a recurring event,
// keyed by the original occurrence instant (RFC 5545 RECURRENCE-ID).
export const eventOverride = pgTable(
  "event_override",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    occurrenceStart: timestamp("occurrence_start", { withTimezone: true, mode: "date" }).notNull(),
    cancelled: boolean("cancelled").notNull().default(false),
    start: timestamp("start", { withTimezone: true, mode: "date" }),
    end: timestamp("end", { withTimezone: true, mode: "date" }),
    title: text("title"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("event_override_instance").on(t.eventId, t.occurrenceStart)],
);
