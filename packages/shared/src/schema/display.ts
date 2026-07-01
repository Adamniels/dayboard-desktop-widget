import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Display-level settings the admin controls (Phase 3). A single row (singleton): the api
// seeds one on first read and updates it in place. Today it holds only the active view the
// wall display shows; the admin flips it and the change is broadcast so the display switches
// live. Kept as its own table so future display settings (e.g. day/night dimming) slot in.
export const DISPLAY_VIEWS = ["day", "week", "month"] as const;
export type DisplayView = (typeof DISPLAY_VIEWS)[number];

export const displaySetting = pgTable("display_setting", {
  id: uuid("id").primaryKey().defaultRandom(),
  activeView: text("active_view").$type<DisplayView>().notNull().default("week"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
