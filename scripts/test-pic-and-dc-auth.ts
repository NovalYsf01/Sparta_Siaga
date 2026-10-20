import assert from "node:assert/strict";
import { getDbPool } from "../lib/db";
import { claimIncidentPic } from "../lib/incident-assignment";

async function main() {
  console.log("=== TESTING PIC CLAIM ROLE ELIGIBILITY & DC VISIBILITY ===");

  const pool = getDbPool();

  // 1. Verify DC count in database
  const dcs = await pool.query("SELECT id, name, facility_type, branch_id FROM facilities WHERE facility_type = 'DC'");
  console.log(`Found ${dcs.rows.length} DCs in facilities table.`);
  assert.equal(dcs.rows.length, 28, "Must have exactly 28 DCs in database");

  // 2. Test PIC claim role-target eligibility
  const storeIncId = `TEST-STORE-${Date.now()}`;
  const facilityIncId = `TEST-FACILITY-${Date.now()}`;

  await pool.query(
    `INSERT INTO incidents (id, date, branch, store_id, store_name, disaster_type, status, location_kind, location_id, tkp_type, created_at, updated_at)
     VALUES ($1, '2026-10-20', 'BANDUNG', 'B001', 'Store Test', 'flood', 'pending_confirmation', 'STORE', 'B001', 'toko', NOW(), NOW())`,
    [storeIncId]
  );

  await pool.query(
    `INSERT INTO incidents (id, date, branch, store_id, store_name, disaster_type, status, location_kind, location_id, tkp_type, created_at, updated_at)
     VALUES ($1, '2026-10-20', 'BANDUNG', 'DC-BDG', 'DC Bandung Test', 'flood', 'pending_confirmation', 'FACILITY', 'DC-BDG', 'dc', NOW(), NOW())`,
    [facilityIncId]
  );

  try {
    // A. BMS claiming store incident -> should succeed
    const bmsClaimStore = await claimIncidentPic({
      incidentId: storeIncId,
      userId: "usr_bms_verify",
      branch: "BANDUNG",
      systemRole: "USER",
      role: "bms",
    });
    assert.equal(bmsClaimStore.claimed, true, "BMS must successfully claim store incident");
    assert.equal(bmsClaimStore.currentPicUserId, "usr_bms_verify");

    // B. Duplicate claim on store incident -> should fail with claimed: false
    const dupClaim = await claimIncidentPic({
      incidentId: storeIncId,
      userId: "usr_t_bms",
      branch: "BANDUNG",
      systemRole: "USER",
      role: "bms",
    });
    assert.equal(dupClaim.claimed, false, "Duplicate claim must be rejected");
    assert.equal(dupClaim.currentPicUserId, "usr_bms_verify");

    // C. BMS claiming facility/DC incident -> should fail with BMS_STORE_ONLY
    const bmsClaimFacility = await claimIncidentPic({
      incidentId: facilityIncId,
      userId: "usr_bms_verify",
      branch: "BANDUNG",
      systemRole: "USER",
      role: "bms",
    });
    assert.equal(bmsClaimFacility.claimed, false);
    assert.equal(bmsClaimFacility.error, "BMS_STORE_ONLY", "BMS must NOT be allowed to claim facility/DC");

    // D. BES claiming facility/DC incident -> should succeed
    const besClaimFacility = await claimIncidentPic({
      incidentId: facilityIncId,
      userId: "usr_bes_verify",
      branch: "BANDUNG",
      systemRole: "USER",
      role: "bes",
    });
    assert.equal(besClaimFacility.claimed, true, "BES must successfully claim facility incident");
    assert.equal(besClaimFacility.currentPicUserId, "usr_bes_verify");

    // E. BES claiming a store incident -> should fail with BES_FACILITY_ONLY
    const storeInc2 = `TEST-STORE2-${Date.now()}`;
    await pool.query(
      `INSERT INTO incidents (id, date, branch, store_id, store_name, disaster_type, status, location_kind, location_id, tkp_type, created_at, updated_at)
       VALUES ($1, '2026-10-20', 'BANDUNG', 'B002', 'Store Test 2', 'flood', 'pending_confirmation', 'STORE', 'B002', 'toko', NOW(), NOW())`,
      [storeInc2]
    );

    const besClaimStore = await claimIncidentPic({
      incidentId: storeInc2,
      userId: "usr_bes_verify",
      branch: "BANDUNG",
      systemRole: "USER",
      role: "bes",
    });
    assert.equal(besClaimStore.claimed, false);
    assert.equal(besClaimStore.error, "BES_FACILITY_ONLY", "BES must NOT be allowed to claim store incident");

    await pool.query("DELETE FROM incidents WHERE id = $1", [storeInc2]);

    // F. Audit history check
    const history = await pool.query(
      "SELECT * FROM incident_pic_history WHERE incident_id = $1",
      [storeIncId]
    );
    assert.ok(history.rows.length >= 1, "Must record audit history in incident_pic_history");
    assert.equal(history.rows[0].action, "CLAIM");
    assert.equal(history.rows[0].to_user_id, "usr_bms_verify");

    console.log("PASS: PIC Claim Authorization & Eligibility checks verified!");
  } finally {
    await pool.query("DELETE FROM incident_pic_history WHERE incident_id IN ($1, $2)", [storeIncId, facilityIncId]);
    await pool.query("DELETE FROM incidents WHERE id IN ($1, $2)", [storeIncId, facilityIncId]);
    await pool.end();
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
