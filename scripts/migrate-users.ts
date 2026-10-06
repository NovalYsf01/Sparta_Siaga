import { getDbPool } from '../lib/db';

async function main() {
  const pool = getDbPool();
  console.log('Connecting to database...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      nik           TEXT,
      name          TEXT NOT NULL,
      system_role   TEXT NOT NULL DEFAULT 'USER',
      business_role TEXT NOT NULL,
      scope         TEXT NOT NULL DEFAULT 'BRANCH',
      branch        TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_system_role ON users(system_role);
    CREATE INDEX IF NOT EXISTS idx_users_branch      ON users(branch);
  `);

  console.log('SUCCESS: Table users ready!');
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR creating users table:', err);
  process.exit(1);
});
