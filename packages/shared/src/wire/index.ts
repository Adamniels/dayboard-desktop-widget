// Wire schemas: zod derived from the Drizzle tables via drizzle-zod, with the
// enum/union columns refined so validation matches the type contract. Used by the api
// to validate REST payloads; the inferred types feed the frontends.
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  EVENT_TYPES,
  REMINDER_KINDS,
  TIMER_MODES,
  TODO_STATUSES,
  event,
  eventOverride,
  googleCalendar,
  googleCredential,
  note,
  project,
  reminder,
  timer,
  todo,
} from "../schema/index";

export const eventSelectSchema = createSelectSchema(event);
export const eventInsertSchema = createInsertSchema(event, {
  type: z.enum(EVENT_TYPES),
  timezone: z.string().min(1),
});

export const eventOverrideSelectSchema = createSelectSchema(eventOverride);
export const eventOverrideInsertSchema = createInsertSchema(eventOverride);

export const projectSelectSchema = createSelectSchema(project);
export const projectInsertSchema = createInsertSchema(project);

export const todoSelectSchema = createSelectSchema(todo);
export const todoInsertSchema = createInsertSchema(todo, {
  status: z.enum(TODO_STATUSES),
});

export const reminderSelectSchema = createSelectSchema(reminder);
export const reminderInsertSchema = createInsertSchema(reminder, {
  kind: z.enum(REMINDER_KINDS),
});

export const timerSelectSchema = createSelectSchema(timer);
export const timerInsertSchema = createInsertSchema(timer, {
  mode: z.enum(TIMER_MODES),
});

export const noteSelectSchema = createSelectSchema(note);
export const noteInsertSchema = createInsertSchema(note);

export const googleCredentialSelectSchema = createSelectSchema(googleCredential);
export const googleCredentialInsertSchema = createInsertSchema(googleCredential);

export const googleCalendarSelectSchema = createSelectSchema(googleCalendar);
export const googleCalendarInsertSchema = createInsertSchema(googleCalendar);
