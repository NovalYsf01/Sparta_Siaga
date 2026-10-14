import { getDbPool, closeDbPool } from "../lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `SELECT id, nik, name, business_role, system_role, password_hash
     FROM users
     WHERE password_hash IS NOT NULL`
  );

  const testPasswords = [
    process.env.DEV_ADMIN_PASSWORD || "admin123",
    process.env.DEMO_USER_PASSWORD || "pass123",
    "AdminSiaga2026!",
    "password",
    "password123",
  ];

  console.log(`Checking ${rows.length} users with password_hash:`);
  for (const u of rows) {
    let matched = false;
    for (let i = 0; i < testPasswords.length; i++) {
      const p = testPasswords[i];
      if (await bcrypt.compare(p, u.password_hash)) {
        console.log(`- User id=${u.id}, nik=${u.nik}, role=${u.business_role}, sys=${u.system_role}: matches candidate [index ${i}]`);
        matched = true;
        break;
      }
    }
    if (!matched) {
      console.log(`- User id=${u.id}, nik=${u.nik}, role=${u.business_role}, sys=${u.system_role}: NO MATCH with candidate passwords`);
    }
  }

  await closeDbPool();
}

main().catch(async (e) => {
  console.error("Error checking passwords:", e);
  await closeDbPool();
  process.exit(1);
});
