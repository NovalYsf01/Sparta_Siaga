import assert from "node:assert/strict";

import { assertIsolatedDatabase } from "../lib/database-safety";
import { closeDbPool, getDbPool } from "../lib/db";
import { selectIsolatedDatabaseEnvironment } from "../lib/isolated-database-config";
import { recordNotificationLog } from "../lib/notification-service";

async function main() {
  selectIsolatedDatabaseEnvironment();
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);
  const eventId = `EQ-TEST-NOTIF-${Date.now()}`;
  const base = {
    disasterId: eventId,
    canonicalEventId: eventId,
    disasterType: "earthquake" as const,
    channel: "pwa_only" as const,
    branch: "TEST_BRANCH",
    recipientGroup: "BES" as const,
    category: "INFORMATION" as const,
    recipientContact: "in-app://bes/test-branch",
    title: "Ringkasan fasilitas",
    message: "Satu fasilitas perlu diperiksa",
    affectedStores: [{ kode_toko: "FAC-1", nama_toko: "Facility 1", cabang: "TEST_BRANCH", distance_km: 10, status: "MONITOR" as const }],
  };
  try {
    const first = await recordNotificationLog(base);
    const second = await recordNotificationLog({
      ...base,
      message: "Dua fasilitas perlu diperiksa",
      affectedStores: [...base.affectedStores, { ...base.affectedStores[0], kode_toko: "FAC-2", nama_toko: "Facility 2" }],
    });
    assert.equal(second.id, first.id);
    const stored = await pool.query(
      `SELECT COUNT(*)::int AS rows, MAX(affected_stores_count)::int AS affected
         FROM notification_logs
        WHERE canonical_event_id = $1 AND branch = $2 AND recipient_group = 'BES'`,
      [eventId, "TEST_BRANCH"]
    );
    assert.deepEqual(stored.rows[0], { rows: 1, affected: 2 });
    console.log("PASS notification summary: event+branch+group replay updates one record");
  } finally {
    await pool.query(`DELETE FROM notification_logs WHERE canonical_event_id = $1`, [eventId]);
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
