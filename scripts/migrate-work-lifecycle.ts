import { getDbPool } from "../lib/db";

async function runMigration() {
  console.log("Running migration: adding work_status, data_source, and stage columns...");
  const pool = getDbPool();

  await pool.query(`
    -- Add work_status and data_source to report_estimation_routes
    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS work_status VARCHAR(32) DEFAULT 'NOT_READY';
    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS data_source VARCHAR(64) DEFAULT 'MANUAL';

    -- Add stage to report_progress_updates
    ALTER TABLE report_progress_updates ADD COLUMN IF NOT EXISTS stage VARCHAR(32) DEFAULT 'PENGERJAAN';
  `);

  console.log("Migration completed successfully!");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
