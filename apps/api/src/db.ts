// Drizzle client bound to DATABASE_URL. The full schema is imported from
// @dayboard/shared so the api and drizzle-kit share one definition.
import { schema } from "@dayboard/shared";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env";

const pool = new Pool({ connectionString: env.databaseUrl });

export const db = drizzle(pool, { schema });
export type Db = typeof db;
