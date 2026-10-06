import { getDbPool } from "../lib/db";

async function migrate() {
  const pool = getDbPool();
  try {
    console.log("Adding avatar_url column to users table...");
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    console.log("Migration V4 completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
