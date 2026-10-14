import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  process.cwd(),
  "database/migrations/005_earthquake_facility_integration.sql"
);
const sql = fs.readFileSync(migrationPath, "utf8");

assert.match(sql, /current_database\(\).*sparta_siaga_isolated/is);
assert.match(sql, /CREATE TABLE IF NOT EXISTS facilities/i);
assert.match(sql, /ALTER COLUMN store_id DROP NOT NULL/i);
assert.match(sql, /location_kind/i);
assert.match(sql, /location_id/i);
assert.match(sql, /canonical_event_id/i);
assert.match(sql, /UNIQUE INDEX[\s\S]*canonical_event_id[\s\S]*location_kind[\s\S]*location_id/i);
assert.match(sql, /earthquake_reconciliation_cases/i);
assert.match(sql, /pg_advisory_xact_lock/i);
assert.match(sql, /incident_pic_history/i);
assert.match(sql, /incident_repair_links/i);
assert.doesNotMatch(sql, /INSERT\s+INTO\s+stores/i);

console.log("PASS facility schema: isolated guard, typed locations, dedup, reconciliation, PIC, repair links");
