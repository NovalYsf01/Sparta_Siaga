import { getDbPool } from '../lib/db';

async function main() {
  const pool = getDbPool();
  console.log('Connecting to database...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id VARCHAR(64) PRIMARY KEY,
      disaster_id VARCHAR(64) NOT NULL,
      disaster_type VARCHAR(32) NOT NULL,
      channel VARCHAR(32) NOT NULL,
      branch VARCHAR(100) NOT NULL,
      recipient_role VARCHAR(100) NOT NULL DEFAULT 'Duty Officer DC Cabang',
      recipient_contact VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      affected_stores_count INT NOT NULL DEFAULT 0,
      affected_stores_sample JSONB,
      ticket_number VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'sent',
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notif_disaster ON notification_logs(disaster_id, disaster_type);
    CREATE INDEX IF NOT EXISTS idx_notif_branch ON notification_logs(branch);
    CREATE INDEX IF NOT EXISTS idx_notif_sent_at ON notification_logs(sent_at DESC);
  `);
  console.log('SUCCESS: Table notification_logs ready!');
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR creating tables:', err);
  process.exit(1);
});
