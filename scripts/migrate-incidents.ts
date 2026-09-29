import { getDbPool } from '../lib/db';

async function main() {
  const pool = getDbPool();
  console.log('Connecting to database...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id                 TEXT PRIMARY KEY,
      date               TEXT NOT NULL,
      disaster_type      TEXT NOT NULL,
      store_id           TEXT NOT NULL,
      store_name         TEXT NOT NULL,
      branch             TEXT NOT NULL,
      location_city      TEXT NOT NULL,
      status             TEXT NOT NULL DEFAULT 'verifying',
      progress           INTEGER NOT NULL DEFAULT 0,
      disaster_metadata  JSONB,
      verification       JSONB,
      maintenance_ticket JSONB,
      timeline           JSONB NOT NULL DEFAULT '[]',
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at          TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_status     ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_store_id   ON incidents(store_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_branch     ON incidents(branch);
  `);

  console.log('SUCCESS: Table incidents ready!');
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR creating incidents table:', err);
  process.exit(1);
});
