import { getDbPool, closeDbPool } from "../lib/db";

async function main() {
  const pool = getDbPool();
  try {
    const storeCount = await pool.query("SELECT COUNT(*) FROM stores;");
    console.log("stores table count:", storeCount.rows[0].count);
    const sampleFac = await pool.query("SELECT id, code, name, branch_id, facility_type FROM facilities LIMIT 10;");
    console.log("sample facilities:", sampleFac.rows);
  } finally {
    await closeDbPool();
  }
}

main().catch(console.error);
