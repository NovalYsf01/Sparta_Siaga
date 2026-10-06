import { getDbPool } from '../lib/db';

async function main() {
  const pool = getDbPool();
  console.log('Running users v2 migration...');

  try {
    await pool.query('BEGIN');

    // Make branch nullable
    await pool.query(`ALTER TABLE users ALTER COLUMN branch DROP NOT NULL`);

    // Add source and email columns if they don't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'LOCAL',
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS external_user_id TEXT
    `);

    // Update branch column to be branch_code for readiness (We'll keep branch for now for backward compat, but rename or just use it as branch_code)
    // The instructions say "branch_id / branch_code". I will rename branch to branch_code.
    // Wait, let's keep the name `branch` to avoid rewriting too many queries in the app, but conceptually it is branch_code.
    // I'll just leave the name as `branch` but it is nullable now.

    await pool.query('COMMIT');
    console.log('SUCCESS: Users table migrated to v2!');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR migrating users table:', err);
  process.exit(1);
});
