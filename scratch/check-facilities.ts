import { getDbPool } from "../lib/db";
import fs from "node:fs";
import path from "node:path";

function setupEnv() {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

setupEnv();

async function check() {
  const pool = getDbPool();
  const count = await pool.query("SELECT COUNT(*) FROM facilities");
  console.log("Total facilities:", count.rows[0].count);

  const sample = await pool.query("SELECT code, name, facility_type, branch_id, mapping_verified_at, operational_status, auto_report_enabled FROM facilities LIMIT 10");
  console.log("Sample facilities:", sample.rows);

  const branches = await pool.query("SELECT branch_id, COUNT(*) FROM facilities GROUP BY branch_id ORDER BY count DESC");
  console.log("Facilities by branch_id:", branches.rows);

  await pool.end();
}

check().catch(console.error);
