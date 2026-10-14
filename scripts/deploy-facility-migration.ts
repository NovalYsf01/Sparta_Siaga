import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

import { assertIsolatedDatabase } from "../lib/database-safety";
import { loadIsolatedDatabaseUrl } from "../lib/isolated-database-config";

async function main() {
  const migrationName = process.argv[2] ?? "005_earthquake_facility_integration.sql";
  if (!/^0(?:0[5-9]|10)_[a-z0-9_]+\.sql$/.test(migrationName)) {
    throw new Error("Only integration migrations 005 through 010 are allowed by this deploy script.");
  }
  const migrationPath = path.resolve(process.cwd(), "database/migrations", migrationName);
  const sql = fs.readFileSync(migrationPath, "utf8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  const pool = new Pool({
    connectionString: loadIsolatedDatabaseUrl().replace(/\?sslmode=[^&]+/, ""),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  const client = await pool.connect();

  try {
    await assertIsolatedDatabase(client);
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS sparta_schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(sql);
    await client.query(
      `INSERT INTO sparta_schema_migrations (name, checksum, applied_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (name) DO UPDATE
       SET checksum = EXCLUDED.checksum, applied_at = EXCLUDED.applied_at`,
      [migrationName, checksum]
    );
    await client.query("COMMIT");
    console.log(`Applied ${migrationName} to sparta_siaga_isolated.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
