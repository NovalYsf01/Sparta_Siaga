import { getDbPool, closeDbPool } from "../lib/db";

async function run() {
  console.log("=== Testing User Management Audit & Safety ===");

  const pool = getDbPool();

  // 1. Verify System Administrator preservation
  const adminRes = await pool.query(`
    SELECT id, email, nik, password_hash, system_role, status 
    FROM users 
    WHERE id = 'usr_seed_admin' OR email = 'admin@sparta-siaga.local'
  `);

  if (adminRes.rows.length === 0) {
    console.error("FAIL: System Administrator usr_seed_admin is missing!");
    process.exit(1);
  }

  const admin = adminRes.rows[0];
  if (admin.status !== "ACTIVE") {
    console.error(`FAIL: System Administrator is not ACTIVE: ${admin.status}`);
    process.exit(1);
  }
  if (!admin.password_hash || !admin.password_hash.startsWith("$2")) {
    console.error("FAIL: System Administrator password hash is invalid or missing!");
    process.exit(1);
  }

  console.log("✔ System Administrator usr_seed_admin verified intact and ACTIVE.");

  // 2. Verify all 10 canonical UAT users
  const expectedUsers = [
    { id: "usr_seed_admin", role: null, systemRole: "ADMIN" },
    { id: "USR-HO-BUDI", role: "ho_admin", systemRole: "USER" },
    { id: "USR-DEMO-GM", role: "gm_ho", systemRole: "USER" },
    { id: "USR-BM-G001", role: "bm", systemRole: "USER" },
    { id: "USR-BMS-001", role: "bms", systemRole: "USER" },
    { id: "USR-DEMO-BMC", role: "bmc", systemRole: "USER" },
    { id: "USR-DEMO-BES", role: "bes", systemRole: "USER" },
    { id: "USR-DEMO-BEC", role: "bec", systemRole: "USER" },
    { id: "USR-DEMO-BBS", role: "bbs", systemRole: "USER" },
    { id: "USR-DEMO-BBC", role: "bbc", systemRole: "USER" },
  ];

  for (const expected of expectedUsers) {
    const userRes = await pool.query(`SELECT id, business_role, system_role, status, password_hash FROM users WHERE id = $1`, [expected.id]);
    if (userRes.rows.length === 0) {
      console.error(`FAIL: Canonical user ${expected.id} is missing from database!`);
      process.exit(1);
    }
    const u = userRes.rows[0];
    if (u.status !== "ACTIVE") {
      console.error(`FAIL: User ${expected.id} status is ${u.status}, expected ACTIVE!`);
      process.exit(1);
    }
    if (expected.role && u.business_role?.toLowerCase() !== expected.role) {
      console.error(`FAIL: User ${expected.id} business_role is ${u.business_role}, expected ${expected.role}!`);
      process.exit(1);
    }
  }

  console.log("✔ All 10 canonical UAT users verified active and properly configured!");
  await closeDbPool();
}

run().catch(async (err) => {
  console.error("Execution error:", err);
  await closeDbPool();
  process.exit(1);
});
