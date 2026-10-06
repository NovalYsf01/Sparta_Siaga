import { getDbPool } from "../lib/db";

export async function migrateProgressFlow() {
  console.log("==================================================");
  console.log("MIGRATING ESTIMATION & PROGRESS FLOW TABLES");
  console.log("==================================================");

  const pool = getDbPool();

  // 1. Foundation columns on report_estimation_routes
  console.log("1. Ensuring report_estimation_routes table and columns...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_estimation_routes (
      id VARCHAR(64) PRIMARY KEY,
      report_id VARCHAR(64) NOT NULL UNIQUE,
      handler_type VARCHAR(32) NOT NULL,
      target_system VARCHAR(64) NOT NULL,
      routing_status VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL,
      store_code VARCHAR(64),
      branch_code VARCHAR(64),
      external_reference_id VARCHAR(128),
      notes TEXT,
      created_by VARCHAR(64) NOT NULL,
      created_by_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_synced_at TIMESTAMPTZ
    );

    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS routing_status VARCHAR(64);
    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS estimation_number VARCHAR(128);
    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS estimated_value NUMERIC;
    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS external_reference VARCHAR(128);
    ALTER TABLE report_estimation_routes ADD COLUMN IF NOT EXISTS estimation_summary TEXT;

    CREATE INDEX IF NOT EXISTS idx_estimation_routes_report ON report_estimation_routes(report_id);
    CREATE INDEX IF NOT EXISTS idx_estimation_routes_handler ON report_estimation_routes(handler_type);
  `);
  console.log("✓ report_estimation_routes updated.");

  // 2. report_progress_updates table
  console.log("2. Ensuring report_progress_updates table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_progress_updates (
      id VARCHAR(64) PRIMARY KEY,
      report_id VARCHAR(64) NOT NULL,
      progress_percentage INT NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
      description TEXT NOT NULL,
      work_status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
      notes TEXT,
      created_by VARCHAR(64) NOT NULL,
      created_by_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_progress_updates_report ON report_progress_updates(report_id);
    CREATE INDEX IF NOT EXISTS idx_progress_updates_created_at ON report_progress_updates(created_at);
  `);
  console.log("✓ report_progress_updates table created.");

  // 3. report_progress_photos table
  console.log("3. Ensuring report_progress_photos table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_progress_photos (
      id VARCHAR(64) PRIMARY KEY,
      progress_update_id VARCHAR(64) NOT NULL REFERENCES report_progress_updates(id) ON DELETE CASCADE,
      report_id VARCHAR(64) NOT NULL,
      photo_type VARCHAR(32) NOT NULL CHECK (photo_type IN ('PROGRESS', 'FINAL', 'HANDOVER')),
      original_path TEXT NOT NULL,
      watermarked_path TEXT NOT NULL,
      file_size INT NOT NULL DEFAULT 0,
      mime_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
      uploaded_by VARCHAR(64) NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_progress_photos_update ON report_progress_photos(progress_update_id);
    CREATE INDEX IF NOT EXISTS idx_progress_photos_report ON report_progress_photos(report_id);
    CREATE INDEX IF NOT EXISTS idx_progress_photos_type ON report_progress_photos(photo_type);
  `);
  console.log("✓ report_progress_photos table created.");

  console.log("All tables and columns migrated successfully!");
}

if (process.argv[1]?.endsWith("migrate-progress-flow.ts")) {
  migrateProgressFlow()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration error:", err);
      process.exit(1);
    });
}
