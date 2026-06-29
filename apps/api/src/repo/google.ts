// Google credential and calendar persistence used by the sync engine, CLI, and meta routes.
import { schema, type GoogleCalendar, type GoogleCredential, type NewGoogleCredential } from "@dayboard/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";

const { googleCredential, googleCalendar } = schema;

export async function getCredential(): Promise<GoogleCredential | undefined> {
  const [row] = await db.select().from(googleCredential).limit(1);
  return row;
}

export async function upsertCredential(input: NewGoogleCredential): Promise<GoogleCredential> {
  const existing = await getCredential();
  if (existing) {
    const [row] = await db
      .update(googleCredential)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(googleCredential.id, existing.id))
      .returning();
    return row!;
  }
  const [row] = await db.insert(googleCredential).values(input).returning();
  return row!;
}

export async function listSelectedCalendars(): Promise<GoogleCalendar[]> {
  return db.select().from(googleCalendar).where(eq(googleCalendar.selected, true));
}

export async function listCalendars(): Promise<GoogleCalendar[]> {
  return db.select().from(googleCalendar);
}

export async function getPrimaryWriteCalendar(): Promise<GoogleCalendar | undefined> {
  const [row] = await db.select().from(googleCalendar).where(eq(googleCalendar.primaryWrite, true)).limit(1);
  return row;
}

export async function saveCalendarSelection(
  calendars: Array<{ id: string; summary: string; primaryWrite: boolean }>,
): Promise<void> {
  for (const c of calendars) {
    await db
      .insert(googleCalendar)
      .values({ id: c.id, summary: c.summary, selected: true, primaryWrite: c.primaryWrite })
      .onConflictDoUpdate({
        target: googleCalendar.id,
        set: { summary: c.summary, selected: true, primaryWrite: c.primaryWrite, updatedAt: new Date() },
      });
  }
}

export async function setCalendarSyncToken(
  calendarId: string,
  syncToken: string | null,
  lastSyncedAt: Date,
): Promise<void> {
  await db
    .update(googleCalendar)
    .set({ syncToken, lastSyncedAt, updatedAt: new Date() })
    .where(eq(googleCalendar.id, calendarId));
}
