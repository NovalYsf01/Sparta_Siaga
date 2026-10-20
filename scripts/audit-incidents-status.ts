import { getDbPool } from "../lib/db";

async function main() {
  const pool = getDbPool();
  
  // Inspect all columns for these 3 sample incidents
  const res = await pool.query(`
    SELECT *
    FROM incidents 
    WHERE id IN ('INC-MAN-1792392520925', 'INC-MAN-1792116839286', 'LAP-EQ-DEMO-BDG-001')
    ORDER BY created_at DESC
  `);
  console.log("=== TARGET INCIDENTS AUDIT ===");
  console.log(JSON.stringify(res.rows, null, 2));

  for (const row of res.rows) {
    console.log(`\n--- INCIDENT ${row.id} ---`);
    console.log("store_name:", row.store_name);
    console.log("status:", row.status);
    console.log("progress:", row.progress);
    console.log("primary_pic_user_id:", row.primary_pic_user_id);
    console.log("primary_pic_claimed_at:", row.primary_pic_claimed_at);
    console.log("verification:", JSON.stringify(row.verification));
  }

  // Check milestone submissions for these incidents
  const milestones = await pool.query(`
    SELECT incident_id, milestone_code, progress_percentage, status, approved_at, approved_by
    FROM milestone_submissions
    WHERE incident_id IN ('INC-MAN-1792392520925', 'INC-MAN-1792116839286', 'LAP-EQ-DEMO-BDG-001')
    ORDER BY incident_id, progress_percentage
  `);
  console.log("\n=== MILESTONE SUBMISSIONS ===");
  console.log(milestones.rows);

  // Check estimation records
  const estimations = await pool.query(`
    SELECT incident_id, status, total_cost, created_at, approved_at
    FROM estimations
    WHERE incident_id IN ('INC-MAN-1792392520925', 'INC-MAN-1792116839286', 'LAP-EQ-DEMO-BDG-001')
  `);
  console.log("\n=== ESTIMATIONS ===");
  console.log(estimations.rows);

  // Check completion submissions
  const completions = await pool.query(`
    SELECT incident_id, status, step, submitted_at, approved_at
    FROM completion_submissions
    WHERE incident_id IN ('INC-MAN-1792392520925', 'INC-MAN-1792116839286', 'LAP-EQ-DEMO-BDG-001')
  `);
  console.log("\n=== COMPLETION SUBMISSIONS ===");
  console.log(completions.rows);
}

main().catch(console.error).finally(() => process.exit(0));
