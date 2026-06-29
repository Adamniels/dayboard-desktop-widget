// Persistence for reminders and timers (the scheduler's data).
import { schema, type NewReminder, type NewTimer, type Reminder, type Timer } from "@dayboard/shared";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../db";

const { reminder, timer } = schema;

// --- reminders ---------------------------------------------------------------

export const listReminders = (): Promise<Reminder[]> => db.select().from(reminder);

export const getReminder = async (id: string): Promise<Reminder | undefined> => {
  const [row] = await db.select().from(reminder).where(eq(reminder.id, id)).limit(1);
  return row;
};

export async function createReminder(input: NewReminder): Promise<Reminder> {
  const [row] = await db.insert(reminder).values(input).returning();
  return row!;
}

export async function updateReminder(id: string, patch: Partial<NewReminder>): Promise<Reminder | undefined> {
  const [row] = await db.update(reminder).set({ ...patch, updatedAt: new Date() }).where(eq(reminder.id, id)).returning();
  return row;
}

export async function deleteReminder(id: string): Promise<boolean> {
  const [row] = await db.delete(reminder).where(eq(reminder.id, id)).returning();
  return row != null;
}

/** Enabled reminders that still have a fire time set (the scheduler arms these). */
export const listArmableReminders = (): Promise<Reminder[]> =>
  db.select().from(reminder).where(and(eq(reminder.enabled, true), isNotNull(reminder.fireAt)));

// --- timers ------------------------------------------------------------------

export const listTimers = (): Promise<Timer[]> => db.select().from(timer);

export const getTimer = async (id: string): Promise<Timer | undefined> => {
  const [row] = await db.select().from(timer).where(eq(timer.id, id)).limit(1);
  return row;
};

export async function createTimer(input: NewTimer): Promise<Timer> {
  const [row] = await db.insert(timer).values(input).returning();
  return row!;
}

export async function updateTimer(id: string, patch: Partial<NewTimer>): Promise<Timer | undefined> {
  const [row] = await db.update(timer).set({ ...patch, updatedAt: new Date() }).where(eq(timer.id, id)).returning();
  return row;
}

export async function deleteTimer(id: string): Promise<boolean> {
  const [row] = await db.delete(timer).where(eq(timer.id, id)).returning();
  return row != null;
}

/** Running timers (the scheduler re-arms these on boot). */
export const listRunningTimers = (): Promise<Timer[]> =>
  db.select().from(timer).where(eq(timer.status, "running"));
