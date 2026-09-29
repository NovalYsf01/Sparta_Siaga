import { getDbPool } from '../lib/db';

async function run() {
  try {
    const pool = getDbPool();
    await pool.query(`
      ALTER TABLE notification_logs 
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
      ADD COLUMN IF NOT EXISTS store_verifications JSONB DEFAULT '{}'::jsonb;
    `);
    console.log('RESOLUTION COLUMNS ADDED SUCCESSFULLY');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
