import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const isolatedUrl = process.env.SPARTA_ISOLATED_TEST_DATABASE_URL?.trim();
if (!isolatedUrl) {
  console.error("[BLOCKED] SPARTA_ISOLATED_TEST_DATABASE_URL is not configured.");
  process.exit(2);
}
const databaseName = new URL(isolatedUrl).pathname.slice(1).toLowerCase();
if (!databaseName.endsWith("_test") && !databaseName.endsWith("_isolated")) {
  throw new Error(`Refusing migration test: database '${databaseName}' is not suffixed _test or _isolated.`);
}
const pool = new Pool({
  connectionString: isolatedUrl.replace(/\?sslmode=[^&]+/, ""),
  ssl: process.env.DATABASE_SSL_MODE === "disable" ? false : { rejectUnauthorized: false },
  max: 1,
});
const client = await pool.connect();
try {
  const baseline = await readFile(path.join(process.cwd(), "database/migrations/001_production_baseline.sql"), "utf8");
  const corrective = await readFile(path.join(process.cwd(), "database/migrations/002_report_workflow_corrective.sql"), "utf8");
  await client.query("BEGIN");
  await client.query(baseline);
  await client.query(corrective);
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'incident_%'
  `);
  const names = new Set(tables.rows.map((row: { table_name: string }) => row.table_name));
  for (const required of ["incident_inspection_submissions", "incident_confirmation_decisions", "incident_evidence", "incident_earthquake_match_reviews"]) {
    if (!names.has(required)) throw new Error(`Missing table ${required}`);
  }
  await client.query("ROLLBACK");
  console.log(`[PASS] Corrective migration validated transactionally in '${databaseName}'.`);
} finally {
  client.release();
  await pool.end();
}
