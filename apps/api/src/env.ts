// Loads .env and exposes the typed config the api needs. Fails fast if DATABASE_URL
// is missing so misconfiguration is obvious at startup.
//
// The .env lives at the repo root, but this process may start with cwd = apps/api
// (e.g. `pnpm --filter @dayboard/api dev`). dotenv defaults to <cwd>/.env, so we point
// it at the root explicitly, resolved relative to this file rather than the cwd.
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  port: Number(process.env.API_PORT ?? 3000),
  // Timezone the display positions events in. Explicit DISPLAY_TZ wins; otherwise the
  // Mini's system timezone (decision 2 in the Phase 1 plan).
  displayTimezone:
    process.env.DISPLAY_TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  startHour: Number(process.env.DISPLAY_START_HOUR ?? 7),
  endHour: Number(process.env.DISPLAY_END_HOUR ?? 21),
  // Google poll interval (decision 4: 45s).
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS ?? 45_000),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    // Loopback redirect used by the one-off google:connect CLI.
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://127.0.0.1:53682/oauth2callback",
  },
} as const;
