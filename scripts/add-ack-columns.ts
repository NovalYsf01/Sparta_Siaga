import { getDbPool } from '../lib/db';

async function run() {
  try {
    const pool = getDbPool();
    await pool.query(`
      ALTER TABLE notification_logs 
      ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS acknowledgment_notes TEXT;
    `);
    console.log('ALTER TABLE SUCCESSFUL');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
