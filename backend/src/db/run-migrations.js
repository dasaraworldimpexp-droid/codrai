import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPostgresPool, assertPostgresReady } from "../config/postgres.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = createPostgresPool();
await assertPostgresReady(pool);

const migrationsDir = join(__dirname, "migrations");
const migrationFiles = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

for (const file of migrationFiles) {
  const migration = await readFile(join(migrationsDir, file), "utf8");
  await pool.query(migration);
}

await pool.end();

console.log(`CODRAI database migrations completed. Applied ${migrationFiles.length} migration files.`);
