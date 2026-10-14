import { getDbPool, closeDbPool } from "../lib/db";
import { assertIsolatedDatabase } from "../lib/database-safety";

async function main() {
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);

  const { rows } = await pool.query(
    `SELECT id, external_user_id, nik, name, email, system_role, business_role, scope, branch, status, source,
            (password_hash IS NOT NULL AND length(password_hash) > 0) AS has_password
     FROM users
     ORDER BY created_at ASC`
  );

  console.log(`Found ${rows.length} users in sparta_siaga_isolated:`);
  for (const r of rows) {
    console.log(`- id=${r.id} | nik=${r.nik} | name=${r.name} | role=${r.business_role} | sys=${r.system_role} | branch=${r.branch} | status=${r.status} | hasPassword=${r.has_password}`);
  }

  await closeDbPool();
}

main().catch(async (e) => {
  console.error("Error inspecting users:", e);
  await closeDbPool();
  process.exit(1);
});
