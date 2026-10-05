import { sql } from "drizzle-orm";

import { db } from "./index.js";

/** Lightweight connectivity probe. Throws if the database is unreachable. */
export async function checkDatabaseConnection(): Promise<{ ok: true }> {
  await db.execute(sql`SELECT 1`);
  return { ok: true as const };
}
