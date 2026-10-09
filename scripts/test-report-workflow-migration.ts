import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "database",
  "migrations",
  "002_report_workflow_corrective.sql",
);
const sql = await readFile(migrationPath, "utf8");
const normalized = sql.replace(/--.*$/gm, "").toUpperCase();

for (const table of [
  "INCIDENT_INSPECTION_SUBMISSIONS",
  "INCIDENT_CONFIRMATION_DECISIONS",
  "INCIDENT_EVIDENCE",
  "INCIDENT_EARTHQUAKE_MATCH_REVIEWS",
]) {
  assert.match(normalized, new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}`));
}

assert.doesNotMatch(normalized, /\bDROP\s+TABLE\b/);
assert.doesNotMatch(normalized, /\bTRUNCATE\b/);
assert.doesNotMatch(normalized, /\bDELETE\s+FROM\b/);
assert.match(normalized, /EARTHQUAKE_IDENTITY_VERSION\s*=\s*1/);
assert.match(normalized, /CANONICAL_EARTHQUAKE_EVENT_ID\s+IS\s+NOT\s+NULL/);
assert.match(normalized, /CANONICAL_STORE_ID\s+IS\s+NOT\s+NULL/);
assert.match(normalized, /ASSIGNED_STORE_ID/);

console.log("[PASS] Corrective migration is additive and identity-version scoped");
