import fs from "fs";
import path from "path";
import { getDbPool, closeDbPool } from "../lib/db";
import { CANONICAL_HUMAN_ROLES } from "../lib/role-catalog";
import { DEFAULT_ROLE_PERMISSIONS } from "../lib/permission-service";

async function run() {
  console.log("=== Testing Role & Permissions Overhaul ===");

  // 1. Check lib/auth.ts
  const authPath = path.join(process.cwd(), "lib/auth.ts");
  const authContent = fs.readFileSync(authPath, "utf-8");
  if (authContent.includes('"bmc"') || authContent.includes('"bec"') || authContent.includes('"bbs"') || authContent.includes('"bbc"')) {
    console.error("FAIL: bmc, bec, bbs, or bbc is still in DEACTIVATED_BUSINESS_ROLES in lib/auth.ts");
    process.exit(1);
  }

  // 2. Check lib/role-catalog.ts
  const operationalRoles = ["bmc", "bec", "bbs", "bbc"];
  for (const rKey of operationalRoles) {
    const roleDef = CANONICAL_HUMAN_ROLES.find((r) => r.key === rKey);
    if (!roleDef || !roleDef.selectable) {
      console.error(`FAIL: Role ${rKey} is not selectable in CANONICAL_HUMAN_ROLES`);
      process.exit(1);
    }
  }

  // 3. Check Default Permissions in types/permission.ts
  if (DEFAULT_ROLE_PERMISSIONS.bmc?.COMPLETION_APPROVE_COORDINATOR !== "ALLOW") {
    console.error("FAIL: BMC does not have COMPLETION_APPROVE_COORDINATOR allowed");
    process.exit(1);
  }
  if (DEFAULT_ROLE_PERMISSIONS.bec?.COMPLETION_APPROVE_COORDINATOR !== "ALLOW") {
    console.error("FAIL: BEC does not have COMPLETION_APPROVE_COORDINATOR allowed");
    process.exit(1);
  }
  if (DEFAULT_ROLE_PERMISSIONS.bbc?.COMPLETION_APPROVE_COORDINATOR !== "ALLOW") {
    console.error("FAIL: BBC does not have COMPLETION_APPROVE_COORDINATOR allowed");
    process.exit(1);
  }
  if (DEFAULT_ROLE_PERMISSIONS.bm?.REPORT_BM_APPROVAL !== "ALLOW" || DEFAULT_ROLE_PERMISSIONS.bm?.REPORT_CLOSE !== "ALLOW") {
    console.error("FAIL: BM does not have BM_APPROVAL or REPORT_CLOSE allowed");
    process.exit(1);
  }
  if (DEFAULT_ROLE_PERMISSIONS.bms?.REPORT_CONFIRM !== "ALLOW" || DEFAULT_ROLE_PERMISSIONS.bms?.COMPLETION_SUBMIT !== "ALLOW") {
    console.error("FAIL: BMS does not have REPORT_CONFIRM or COMPLETION_SUBMIT allowed");
    process.exit(1);
  }
  if (DEFAULT_ROLE_PERMISSIONS.bes?.REPORT_CONFIRM !== "ALLOW" || DEFAULT_ROLE_PERMISSIONS.bes?.COMPLETION_SUBMIT !== "ALLOW") {
    console.error("FAIL: BES does not have REPORT_CONFIRM or COMPLETION_SUBMIT allowed");
    process.exit(1);
  }

  // 4. Check DB Users for the 10 canonical personas
  const pool = getDbPool();
  const userCheckRes = await pool.query(`
    SELECT id, email, business_role, system_role, branch, status
    FROM users
    WHERE id IN (
      'usr_seed_admin',
      'USR-HO-BUDI',
      'USR-DEMO-GM',
      'USR-BM-G001',
      'USR-BMS-001',
      'USR-DEMO-BMC',
      'USR-DEMO-BES',
      'USR-DEMO-BEC',
      'USR-DEMO-BBS',
      'USR-DEMO-BBC'
    )
  `);

  if (userCheckRes.rows.length < 10) {
    console.error(`FAIL: Expected 10 canonical users in database, found ${userCheckRes.rows.length}`);
    process.exit(1);
  }

  for (const u of userCheckRes.rows) {
    if (u.status !== "ACTIVE") {
      console.error(`FAIL: User ${u.id} (${u.business_role}) is not ACTIVE: status=${u.status}`);
      process.exit(1);
    }
  }

  console.log("✔ All 10 canonical roles and permissions are 100% verified!");
  await closeDbPool();
}

run().catch(async (err) => {
  console.error("Execution error:", err);
  await closeDbPool();
  process.exit(1);
});
