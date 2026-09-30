import { getDbPool } from "../lib/db";

async function main() {
  const pool = getDbPool();
  try {
    const res = await pool.query(`
      SELECT earthquake_event_id, branch, COUNT(*) 
      FROM incidents 
      WHERE report_origin = 'automatic_earthquake' 
        AND earthquake_event_id IS NOT NULL 
      GROUP BY earthquake_event_id, branch 
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicates found:', res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
