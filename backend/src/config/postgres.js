import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export function createPostgresPool() {
  if (!env.databaseUrl) {
    return null;
  }

  return new Pool({
    connectionString: env.databaseUrl,
    max: Number(process.env.POSTGRES_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export async function assertPostgresReady(pool) {
  if (!pool) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL.");
  }

  await pool.query("select 1");
}
