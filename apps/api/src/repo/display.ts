// Persistence for the display_setting singleton (Phase 3). getSetting seeds a single `week`
// row on first read so the rest of the app never has to special-case an empty table;
// setActiveView updates that row. The admin drives these; the change is broadcast so the
// display switches live.
import { schema, type DisplaySetting, type DisplayView } from "@dayboard/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";

const { displaySetting } = schema;

export async function getSetting(): Promise<DisplaySetting> {
  const [existing] = await db.select().from(displaySetting).limit(1);
  if (existing) return existing;
  const [seeded] = await db.insert(displaySetting).values({ activeView: "week" }).returning();
  return seeded!;
}

export async function setActiveView(activeView: DisplayView): Promise<DisplaySetting> {
  const current = await getSetting();
  const [row] = await db
    .update(displaySetting)
    .set({ activeView, updatedAt: new Date() })
    .where(eq(displaySetting.id, current.id))
    .returning();
  return row!;
}
