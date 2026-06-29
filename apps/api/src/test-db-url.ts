// Resolves which database the api connects to. Tests use a separate database so they
// never touch dev data: TEST_DATABASE_URL if set, else DATABASE_URL with the database name
// swapped to dayboard_test when NODE_ENV=test.
import { env } from "./env";

export function databaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (process.env.NODE_ENV === "test") {
    const url = new URL(env.databaseUrl);
    url.pathname = "/dayboard_test";
    return url.toString();
  }
  return env.databaseUrl;
}
