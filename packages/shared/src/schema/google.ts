import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The single connected Google account. Tokens live in the DB on the Mini (single user,
// no public ports). Stored by the one-off `google:connect` CLI script.
export const googleCredential = pgTable("google_credential", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountEmail: text("account_email").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

// A Google calendar selected for sync (chosen at connect time). Each carries its own
// incremental sync token. Exactly one row has primaryWrite = true: the calendar app native
// events are written to.
export const googleCalendar = pgTable("google_calendar", {
  id: text("id").primaryKey(),
  summary: text("summary").notNull(),
  selected: boolean("selected").notNull().default(true),
  primaryWrite: boolean("primary_write").notNull().default(false),
  syncToken: text("sync_token"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
