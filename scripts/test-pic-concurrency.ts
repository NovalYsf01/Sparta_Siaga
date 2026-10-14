import assert from "node:assert/strict";

import { assertIsolatedDatabase } from "../lib/database-safety";
import { closeDbPool, getDbPool } from "../lib/db";
import { claimIncidentPic } from "../lib/incident-assignment";
import { selectIsolatedDatabaseEnvironment } from "../lib/isolated-database-config";

async function main() {
  selectIsolatedDatabaseEnvironment();
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);
  const incidentId = `INC-TEST-PIC-${Date.now()}`;
  try {
    const users = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE status = 'ACTIVE' ORDER BY id LIMIT 2`
    );
    assert.equal(users.rows.length, 2, "Dua user aktif dibutuhkan untuk test PIC concurrency");
    await pool.query(
      `INSERT INTO incidents (
         id, date, disaster_type, report_origin, branch, status, progress,
         field_photos, timeline, created_at, updated_at
       ) VALUES ($1, NOW()::text, 'earthquake', 'manual', 'TEST_BRANCH',
         'verifying', 0, '[]'::jsonb, '[]'::jsonb, NOW(), NOW())`,
      [incidentId]
    );
    const attempts = await Promise.all(
      users.rows.map((user) => claimIncidentPic({
        incidentId,
        userId: user.id,
        branch: null,
        systemRole: "ADMIN",
      }))
    );
    assert.equal(attempts.filter((result) => result.claimed).length, 1);
    const history = await pool.query(
      `SELECT COUNT(*)::int AS count FROM incident_pic_history WHERE incident_id = $1`,
      [incidentId]
    );
    assert.equal(history.rows[0].count, 1);
    console.log("PASS PIC concurrency: exactly one claim and one audit entry");
  } finally {
    await pool.query(`DELETE FROM incident_pic_history WHERE incident_id = $1`, [incidentId]);
    await pool.query(`DELETE FROM incidents WHERE id = $1`, [incidentId]);
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
