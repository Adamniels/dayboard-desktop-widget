// Drizzle client bound to DATABASE_URL. The full schema is imported from
// @dayboard/shared so the api and drizzle-kit share one definition.
import { schema } from "@dayboard/shared";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseUrl } from "./test-db-url";

export const pool = new Pool({ connectionString: databaseUrl() });

export const db = drizzle(pool, { schema });
export type Db = typeof db;
