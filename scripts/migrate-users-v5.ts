import { getDbPool } from "../lib/db";

async function migrate() {
  const pool = getDbPool();
  try {
    console.log("Making business_role, scope, branch NULLABLE in users table...");
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN business_role DROP NOT NULL,
      ALTER COLUMN scope DROP NOT NULL,
      ALTER COLUMN branch DROP NOT NULL;
    `);
    console.log("Migration V5 completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
