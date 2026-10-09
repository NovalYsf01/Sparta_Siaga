import { Pool } from "pg";

const auditUrl = process.env.SPARTA_AUDIT_DATABASE_URL?.trim();
if (!auditUrl) {
  throw new Error("SPARTA_AUDIT_DATABASE_URL is required. DATABASE_URL is intentionally ignored by this read-only audit.");
}
const pool = new Pool({
  connectionString: auditUrl.replace(/\?sslmode=[^&]+/, ""),
  ssl: process.env.DATABASE_SSL_MODE === "disable" ? false : { rejectUnauthorized: false },
  max: 1,
});
const client = await pool.connect();
try {
  await client.query("BEGIN READ ONLY");
  const duplicates = await client.query(`
    SELECT canonical_earthquake_event_id, canonical_store_id, COUNT(*)::int AS incident_count,
           ARRAY_AGG(id ORDER BY created_at) AS incident_ids
    FROM incidents WHERE earthquake_identity_version = 1
    GROUP BY canonical_earthquake_event_id, canonical_store_id HAVING COUNT(*) > 1
    ORDER BY canonical_earthquake_event_id, canonical_store_id
  `);
  const legacy = await client.query(`
    SELECT id, earthquake_event_id, branch, status, affected_store_count, created_at, updated_at
    FROM incidents
    WHERE disaster_type = 'earthquake' AND report_origin = 'automatic_earthquake'
      AND COALESCE(earthquake_identity_version, 0) <> 1
    ORDER BY created_at
  `);
  const active = new Set([
    "pending_confirmation", "verifying", "field_inspection_required",
    "awaiting_manager_confirmation", "clarification_required", "confirmed_affected",
    "investigating", "in_estimation", "awaiting_spk", "spk_issued",
    "in_maintenance", "in_construction", "awaiting_st",
  ]);
  console.log(JSON.stringify({
    versionedDuplicates: duplicates.rows,
    historicalBranchLevelCount: legacy.rowCount ?? 0,
    activeHistoricalBranchLevelReports: legacy.rows.filter((row) => active.has(row.status)),
  }, null, 2));
  await client.query("ROLLBACK");
} finally {
  client.release();
  await pool.end();
}
