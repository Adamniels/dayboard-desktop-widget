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
} as const;
