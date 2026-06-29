// drizzle-kit config. Schema comes from the shared package (single source of truth);
// migrations are written into apps/api/drizzle/ and committed.
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "node:url";

// Load the repo-root .env regardless of cwd (drizzle-kit runs from apps/api).
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

export default defineConfig({
  dialect: "postgresql",
  schema: "../../packages/shared/src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://dayboard:dayboard@localhost:5432/dayboard",
  },
});
