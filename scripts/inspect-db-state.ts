import { getDbPool } from "../lib/db";
import { assertIsolatedDatabase } from "../lib/database-safety";

async function main() {
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);
  const dbRes = await pool.query("SELECT current_database() as db_name");
  console.log("CONNECTED_DB:", dbRes.rows[0].db_name);

  const usersRes = await pool.query(
    "SELECT id, nik, name, email, system_role, business_role, branch, status, created_at FROM users ORDER BY created_at DESC"
  );
  console.log("TOTAL_USERS:", usersRes.rows.length);
  
  const admins = usersRes.rows.filter((u) => u.system_role === "ADMIN");
  console.log("ADMIN_USERS:", JSON.stringify(admins, null, 2));

  console.log("ALL_USERS:");
  usersRes.rows.forEach((u) => {
    console.log(`- [${u.system_role}] NIK: ${u.nik} | ID: ${u.id} | Name: ${u.name} | Role: ${u.business_role} | Branch: ${u.branch || 'ALL'} | Status: ${u.status}`);
  });

  const incRes = await pool.query(
    "SELECT id, store_id, store_name, branch, status, progress, disaster_type, created_at FROM incidents ORDER BY created_at DESC"
  );
  console.log("\nTOTAL_INCIDENTS:", incRes.rows.length);
  incRes.rows.forEach((i) => {
    console.log(`- ID: ${i.id} | Store: ${i.store_name} (${i.store_id}) | Branch: ${i.branch} | Status: ${i.status} | Progress: ${i.progress}% | Type: ${i.disaster_type} | Date: ${i.created_at}`);
  });

  const tableListRes = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("\nALL_PUBLIC_TABLES:", tableListRes.rows.map((r) => r.table_name));

  process.exit(0);
}

main().catch((err) => {
  console.error("Inspection error:", err);
  process.exit(1);
});
