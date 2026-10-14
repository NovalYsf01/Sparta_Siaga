import assert from "node:assert/strict";

import { assertIsolatedDatabase } from "../lib/database-safety";
import { getDbPool, closeDbPool } from "../lib/db";
import { ensureEarthquakeReport } from "../lib/earthquake-report-service";
import { selectIsolatedDatabaseEnvironment } from "../lib/isolated-database-config";

async function main() {
  selectIsolatedDatabaseEnvironment();
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);
  const suffix = Date.now().toString();
  const eventId = `EQ-TEST-FAC-${suffix}`;
  const manualId = `INC-TEST-FAC-MAN-${suffix}`;
  const autoId = `INC-TEST-FAC-AUTO-${suffix}`;
  const locationId = `facility-test-${suffix}`;
  const occurredAt = new Date();

  try {
    await pool.query(
      `INSERT INTO earthquake_events (
         id, source_primary, magnitude, depth_km, latitude, longitude,
         occurred_at, title, priority_radius_km, monitoring_radius_km
       ) VALUES ($1, 'BMKG', 5.5, 10, -6.8, 107.1, $2, 'Test', 50, 110)`,
      [eventId, occurredAt]
    );
    await pool.query(
      `INSERT INTO incidents (
         id, date, disaster_type, report_origin, tkp_type, branch, status,
         progress, field_photos, timeline, location_kind, location_id,
         created_at, updated_at
       ) VALUES ($1, $2::timestamptz::text, 'earthquake', 'manual', 'dc', 'TEST_BRANCH',
         'verifying', 10, '["private-evidence"]'::jsonb,
         '[{"stage":"manual"}]'::jsonb, 'FACILITY', $3, $2::timestamptz, $2::timestamptz)`,
      [manualId, occurredAt, locationId]
    );

    const input = {
      reportId: autoId,
      canonicalEventId: eventId,
      eventOccurredAt: occurredAt,
      source: "BMKG",
      location: {
        kind: "FACILITY" as const,
        id: locationId,
        code: "TEST-FAC",
        name: "Test Facility",
        type: "DC",
        branch: "TEST_BRANCH",
        latitude: -6.8,
        longitude: 107.1,
      },
    };
    const linked = await ensureEarthquakeReport(input);
    assert.deepEqual(linked, { outcome: "linked_manual", incidentId: manualId });

    const preserved = await pool.query(
      `SELECT status, progress, field_photos, timeline, store_id, canonical_event_id
         FROM incidents WHERE id = $1`,
      [manualId]
    );
    assert.equal(preserved.rows[0].status, "verifying");
    assert.equal(preserved.rows[0].progress, 10);
    assert.deepEqual(preserved.rows[0].field_photos, ["private-evidence"]);
    assert.deepEqual(preserved.rows[0].timeline, [{ stage: "manual" }]);
    assert.equal(preserved.rows[0].store_id, null);
    assert.equal(preserved.rows[0].canonical_event_id, eventId);

    const replay = await ensureEarthquakeReport({ ...input, reportId: `${autoId}-RETRY` });
    assert.deepEqual(replay, { outcome: "existing", incidentId: manualId });

    const secondLocation = { ...input.location, id: `${locationId}-race`, code: "TEST-RACE" };
    const raced = await Promise.all([
      ensureEarthquakeReport({ ...input, reportId: `${autoId}-A`, location: secondLocation }),
      ensureEarthquakeReport({ ...input, reportId: `${autoId}-B`, location: secondLocation }),
    ]);
    assert.equal(new Set(raced.map((result) => "incidentId" in result && result.incidentId)).size, 1);
    const count = await pool.query(
      `SELECT COUNT(*)::int AS count FROM incidents
        WHERE canonical_event_id = $1 AND location_kind = 'FACILITY' AND location_id = $2`,
      [eventId, secondLocation.id]
    );
    assert.equal(count.rows[0].count, 1);

    console.log("PASS reconciliation: manual preserved, retry idempotent, concurrent create singular");
  } finally {
    await pool.query(`DELETE FROM incidents WHERE id LIKE $1`, [`INC-TEST-FAC-%${suffix}%`]);
    await pool.query(`DELETE FROM earthquake_events WHERE id = $1`, [eventId]);
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
