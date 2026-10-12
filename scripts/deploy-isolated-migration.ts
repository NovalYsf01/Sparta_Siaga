import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function getIsolatedDbUrl(): string {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  let isolatedUrl = "";
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*SPARTA_ISOLATED_TEST_DATABASE_URL\s*=\s*(.*)?\s*$/);
    if (match) {
      isolatedUrl = match[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }

  if (!isolatedUrl) {
    throw new Error("SPARTA_ISOLATED_TEST_DATABASE_URL not found in .env.local");
  }

  const parsed = new URL(isolatedUrl);
  if (parsed.pathname.replace(/^\//, "") !== "sparta_siaga_isolated") {
    throw new Error("Target is NOT sparta_siaga_isolated! Aborting for safety.");
  }

  console.log(`[Isolated DB Deploy] Target host: ${parsed.hostname}`);
  console.log(`[Isolated DB Deploy] Target database: ${parsed.pathname.replace(/^\//, "")}`);
  return isolatedUrl;
}

async function main() {
  const isolatedUrl = getIsolatedDbUrl();
  const cleanConnString = isolatedUrl.replace(/\?sslmode=[^&]+/, "");
  const pool = new Pool({
    connectionString: cleanConnString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    const currentDb = (await client.query("SELECT current_database();")).rows[0].current_database;
    if (currentDb !== "sparta_siaga_isolated") {
      throw new Error(`Connected to ${currentDb}, expected sparta_siaga_isolated! Aborting.`);
    }

    // Ensure migration table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS sparta_schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Load migration 002
    const migrationFile = path.join(process.cwd(), "database", "migrations", "002_earthquake_store_dedup.sql");
    const sql = fs.readFileSync(migrationFile, "utf8");
    const checksum = crypto.createHash("sha256").update(sql, "utf8").digest("hex");

    console.log(`[Isolated DB Deploy] Applying 002_earthquake_store_dedup.sql...`);
    await client.query("BEGIN;");
    await client.query(sql);
    await client.query(
      `INSERT INTO sparta_schema_migrations (name, checksum, applied_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (name) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW();`,
      ["002_earthquake_store_dedup.sql", checksum]
    );
    await client.query("COMMIT;");
    console.log(`[Isolated DB Deploy] Successfully applied 002_earthquake_store_dedup.sql to sparta_siaga_isolated!`);
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error(`[Isolated DB Deploy] Failed:`, err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
