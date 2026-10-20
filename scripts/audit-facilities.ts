import { getDbPool } from "../lib/db";

async function main() {
  const pool = getDbPool();
  const res = await pool.query(`
    SELECT facility_type, count(id) as total, count(branch_id) as with_branch, count(latitude) as with_coords
    FROM facilities
    GROUP BY facility_type
  `);
  console.log("Facility summary:", res.rows);

  const dcs = await pool.query(`
    SELECT id, code, name, facility_type, branch_id, latitude, longitude, mapping_verified_at, operational_status
    FROM facilities
    WHERE facility_type = 'DC'
    LIMIT 10
  `);
  console.log("Sample DCs:", dcs.rows);

  const bandungDcs = await pool.query(`
    SELECT id, code, name, facility_type, branch_id, latitude, longitude
    FROM facilities
    WHERE branch_id ILIKE '%bandung%' OR name ILIKE '%bandung%'
  `);
  console.log("Bandung facilities:", bandungDcs.rows);
}

main().catch(console.error).finally(() => process.exit(0));
