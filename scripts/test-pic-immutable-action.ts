import assert from "node:assert/strict";

import { assignIncidentPicForPersistedAction } from "../lib/incident-assignment";
import { assertIsolatedDatabase } from "../lib/database-safety";
import { closeDbPool, getDbPool } from "../lib/db";
import { selectIsolatedDatabaseEnvironment } from "../lib/isolated-database-config";

async function main() {
  selectIsolatedDatabaseEnvironment();
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);
  const suffix = Date.now();
  const incidentId = `INC-TEST-PIC-ACTION-${suffix}`;
  const firstUser = `USR-TEST-PIC-FIRST-${suffix}`;
  const secondUser = `USR-TEST-PIC-SECOND-${suffix}`;

  try {
    await pool.query(
      `INSERT INTO users (id, nik, name, email, system_role, business_role, scope, branch, status)
       VALUES
        ($1, $1, 'First BMS', $1 || '@test.local', 'USER', 'bms', 'BRANCH', 'TEST_BRANCH', 'ACTIVE'),
        ($2, $2, 'Second BMS', $2 || '@test.local', 'USER', 'bms', 'BRANCH', 'TEST_BRANCH', 'ACTIVE')`,
      [firstUser, secondUser]
    );
    await pool.query(
      `INSERT INTO incidents (
         id, date, disaster_type, report_origin, branch, status, progress,
         location_kind, location_id, tkp_type, field_photos, timeline, created_at, updated_at
       ) VALUES ($1, NOW()::text, 'flood', 'manual', 'TEST_BRANCH', 'verifying', 0,
         'STORE', 'LOC-TEST-1', 'toko', '[]'::jsonb, '[]'::jsonb, NOW(), NOW())`,
      [incidentId]
    );

    const first = await pool.connect();
    try {
      await first.query("BEGIN");
      const assigned = await assignIncidentPicForPersistedAction(first, {
        incidentId,
        userId: firstUser,
        branch: "TEST_BRANCH",
        role: "bms",
        action: "INSPECTION_SUBMITTED",
      });
      assert.equal(assigned.assigned, true);
      await first.query("COMMIT");
    } finally {
      first.release();
    }

    const second = await pool.connect();
    try {
      await second.query("BEGIN");
      const unchanged = await assignIncidentPicForPersistedAction(second, {
        incidentId,
        userId: secondUser,
        branch: "TEST_BRANCH",
        role: "bms",
        action: "PROGRESS_UPDATED",
      });
      assert.equal(unchanged.assigned, false);
      assert.equal(unchanged.currentPicUserId, firstUser);
      await second.query("COMMIT");
    } finally {
      second.release();
    }

    const incident = await pool.query(
      `SELECT primary_pic_user_id FROM incidents WHERE id = $1`,
      [incidentId]
    );
    assert.equal(incident.rows[0].primary_pic_user_id, firstUser);
    const history = await pool.query(
      `SELECT action, to_user_id, reason FROM incident_pic_history WHERE incident_id = $1`,
      [incidentId]
    );
    assert.equal(history.rows.length, 1);
    assert.equal(history.rows[0].action, "AUTO_ASSIGN");
    assert.equal(history.rows[0].to_user_id, firstUser);
    assert.match(history.rows[0].reason, /INSPECTION_SUBMITTED/);
    console.log("PASS PIC is assigned by the first persisted action and remains immutable");
  } finally {
    await pool.query(`DELETE FROM incident_pic_history WHERE incident_id = $1`, [incidentId]);
    await pool.query(`DELETE FROM incidents WHERE id = $1`, [incidentId]);
    await pool.query(`DELETE FROM users WHERE id = ANY($1::text[])`, [[firstUser, secondUser]]);
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
