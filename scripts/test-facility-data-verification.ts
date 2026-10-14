import assert from "node:assert/strict";

import { assertIsolatedDatabase } from "../lib/database-safety";
import { closeDbPool, getDbPool } from "../lib/db";
import { selectIsolatedDatabaseEnvironment } from "../lib/isolated-database-config";

async function main() {
  selectIsolatedDatabaseEnvironment();
  const pool = getDbPool();
  try {
    await assertIsolatedDatabase(pool);
    const counts = await pool.query(
      `SELECT facility_type, COUNT(*)::int AS count
         FROM facilities GROUP BY facility_type ORDER BY facility_type`
    );
    assert.deepEqual(
      Object.fromEntries(counts.rows.map((row) => [row.facility_type, row.count])),
      { BULKY: 5, DC: 28, DEPO: 9, STORE_HUB: 12, WAREHOUSE: 13 }
    );
    const status = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE branch_id IS NOT NULL AND mapping_verified_at IS NOT NULL)::int AS mapped,
              COUNT(*) FILTER (WHERE auto_report_enabled)::int AS auto_enabled
         FROM facilities`
    );
    assert.deepEqual(status.rows[0], { total: 67, mapped: 0, auto_enabled: 0 });
    const balaraja = await pool.query(
      `SELECT code FROM facilities
        WHERE latitude = -6.219 AND longitude = 106.47142 ORDER BY code`
    );
    assert.deepEqual(balaraja.rows.map((row) => row.code), ["KY10", "KY11"]);
    const runs = await pool.query(
      `SELECT new_count, changed_count, unchanged_count, invalid_count
         FROM facility_import_runs ORDER BY created_at DESC LIMIT 2`
    );
    assert.equal(runs.rows.length, 2);
    assert.deepEqual(runs.rows[0], { new_count: 0, changed_count: 0, unchanged_count: 67, invalid_count: 0 });
    assert.deepEqual(runs.rows[1], { new_count: 67, changed_count: 0, unchanged_count: 0, invalid_count: 0 });
    console.log("PASS facility data: 67 imported, 0 invalid, 0 mapped, 0 enabled, replay idempotent");
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
