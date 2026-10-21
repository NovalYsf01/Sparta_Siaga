import { getDbPool } from "../lib/db";

async function main() {
  const pool = getDbPool();
  try {
    const testIds = ["usr_pw_admin", "usr_mv_admin", "usr_vis_admin", "usr_ho_verify"];
    console.log("Checking references for candidate test accounts...");
    const { rows: fkRows } = await pool.query(`
      SELECT tc.table_name, kcu.column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users';
    `);
    for (const id of testIds) {
      const { rows: ov } = await pool.query("SELECT count(*) FROM user_permission_overrides WHERE user_id = $1", [id]);
      const { rows: inc } = await pool.query("SELECT count(*) FROM incidents WHERE primary_pic_user_id = $1", [id]);
      console.log(`Auditing ID: ${id} -> overrides: ${ov[0].count}, incidents: ${inc[0].count}`);
    }


    const { rows: users } = await pool.query(
      "SELECT id, nik, name, system_role, business_role, scope, branch, status, created_at FROM users ORDER BY created_at ASC"
    );
    console.log("Current Users in DB (" + users.length + "):");
    users.forEach((u) => {
      console.log(`- [${u.id}] NIK: ${u.nik} | Name: ${u.name} | Role: ${u.system_role}/${u.business_role || "-"} | Status: ${u.status}`);
    });
  } catch (err) {
    console.error("Error auditing users:", err);
  } finally {
    await pool.end();
  }
}

main();
