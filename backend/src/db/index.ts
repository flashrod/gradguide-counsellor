import "dotenv/config";

import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { loadEnv } from "../env.js";
import * as schema from "./schema.js";

const env = loadEnv();

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export type Database = typeof db;

/** Close the underlying pg pool (scripts, tests, graceful shutdown). */
export async function closePool(): Promise<void> {
  await pool.end();
}
