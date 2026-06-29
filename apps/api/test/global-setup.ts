// Vitest global setup: create the test database if missing and apply the committed
// migrations. Runs once before the integration suite (which needs Postgres, so it runs on
// Adam's machine via `pnpm check`, not in the sandbox).
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

process.env.NODE_ENV = "test";

export default async function setup(): Promise<void> {
  const { databaseUrl } = await import("../src/test-db-url");
  const url = new URL(databaseUrl());
  const dbName = url.pathname.slice(1);

  // Create the test database via the maintenance "postgres" database if it does not exist.
  const admin = new URL(url.toString());
  admin.pathname = "/postgres";
  const adminPool = new Pool({ connectionString: admin.toString() });
  try {
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
  } catch {
    // already exists
  }
  await adminPool.end();

  const pool = new Pool({ connectionString: url.toString() });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  await pool.end();
}
