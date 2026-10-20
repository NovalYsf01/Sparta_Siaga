import assert from "node:assert/strict";
import { getDbPool, closeDbPool } from "../lib/db";
import { resolveBranchAliases } from "../app/api/stores/search/route";

async function test() {
  const pool = getDbPool();
  const aliases = resolveBranchAliases("BANDUNG");
  console.log("Aliases for BANDUNG:", aliases);

  // Test facility query matching branch_id OR name containing branch alias
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  // Search query (e.g. "DC" or empty)
  const q = "";
  if (q.trim()) {
    conditions.push(
      `(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR facility_type ILIKE $${paramIndex})`
    );
    values.push(`%${q.trim()}%`);
    paramIndex++;
  }

  // Branch scoping: matches branch_id OR facility name containing branch name
  const branchConditions: string[] = [];
  branchConditions.push(`UPPER(COALESCE(branch_id, '')) = ANY($${paramIndex}::text[])`);
  values.push(aliases.map(a => a.toUpperCase()));
  paramIndex++;

  for (const alias of aliases) {
    branchConditions.push(`name ILIKE $${paramIndex}`);
    values.push(`%${alias}%`);
    paramIndex++;
  }

  conditions.push(`(${branchConditions.join(" OR ")})`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const query = `
    SELECT id::text, code, name, facility_type, latitude, longitude,
           branch_id, operational_status, auto_report_enabled, mapping_verified_at
    FROM facilities
    ${whereClause}
    ORDER BY name ASC
    LIMIT 20;
  `;

  const res = await pool.query(query, values);
  console.log("Found facilities for BES Bandung:", res.rows);
  assert(res.rows.length >= 2, "Expected DC BANDUNG and WAREHOUSE BANDUNG2");

  console.log("PASS: BES Bandung can now successfully find their branch facilities!");
}

test()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDbPool();
  });
