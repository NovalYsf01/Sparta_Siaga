import { getDbPool } from "../lib/db";

async function cleanTestUsers() {
  const pool = getDbPool();
  try {
    const testIds = ["usr_pw_admin", "usr_mv_admin", "usr_vis_admin", "usr_ho_verify"];
    console.log("Cleaning test leftover accounts:", testIds);
    const res = await pool.query("DELETE FROM users WHERE id = ANY($1::text[]) RETURNING id, nik, name", [testIds]);
    console.log(`Successfully removed ${res.rowCount} test accounts:`, res.rows);

    const { rows: remaining } = await pool.query("SELECT id, nik, name, system_role, business_role, branch, status FROM users ORDER BY system_role DESC, business_role ASC, name ASC");
    console.log(`Remaining active accounts (${remaining.length}):`);
    remaining.forEach(u => console.log(`- [${u.nik}] ${u.name} (${u.system_role}/${u.business_role || "-"}, ${u.branch || "HO"}) - ${u.status}`));
  } catch (err) {
    console.error("Error cleaning test users:", err);
  } finally {
    await pool.end();
  }
}

cleanTestUsers();
