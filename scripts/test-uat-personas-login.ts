import assert from "node:assert";
import bcrypt from "bcryptjs";
import { getDbPool, closeDbPool } from "../lib/db";
import { dbGetUserByIdentifier } from "../lib/user-db";
import { assertIsolatedDatabase } from "../lib/database-safety";

async function testPersonasLogin() {
  console.log("==============================================================");
  console.log("🔐 TESTING LOGIN & PERMISSIONS FOR UAT PERSONAS & ADMIN");
  console.log("==============================================================");

  const pool = getDbPool();
  await assertIsolatedDatabase(pool);

  const adminPass = process.env.DEV_ADMIN_PASSWORD || "admin123";
  const userPass = process.env.DEMO_USER_PASSWORD || "pass123";

  // 1. Verify System Administrator ADM0001
  console.log("Testing System Administrator (ADM0001)...");
  const adminUser = await dbGetUserByIdentifier("ADM0001");
  assert.ok(adminUser, "System Administrator ADM0001 must exist");
  assert.strictEqual(adminUser.systemRole, "ADMIN", "Role must be ADMIN");
  assert.strictEqual(adminUser.status, "ACTIVE", "Status must be ACTIVE");
  assert.ok(adminUser.passwordHash, "Password hash must exist");
  const adminPassValid = await bcrypt.compare(adminPass, adminUser.passwordHash);
  assert.ok(adminPassValid, "Admin password verification must succeed");
  console.log("✔ System Administrator ADM0001 verified login successfully!");

  // 2. Verify all UAT personas
  const testPersonas = [
    { nik: "BMS0001", externalId: "bms", expectedRole: "bms", expectedBranch: "BANDUNG" },
    { nik: "BES0001", externalId: "bes", expectedRole: "bes", expectedBranch: "BANDUNG" },
    { nik: "BBS0001", externalId: "bbs", expectedRole: "bbs", expectedBranch: "BANDUNG" },
    { nik: "BMC0001", externalId: "bmc", expectedRole: "bmc", expectedBranch: "BANDUNG" },
    { nik: "BEC0001", externalId: "bec", expectedRole: "bec", expectedBranch: "BANDUNG" },
    { nik: "BBC0001", externalId: "bbc", expectedRole: "bbc", expectedBranch: "BANDUNG" },
    { nik: "BM0001", externalId: "bmm", expectedRole: "bm", expectedBranch: "BANDUNG" },
    { nik: "HO0001", externalId: "ho", expectedRole: "ho_admin", expectedBranch: null },
    { nik: "GM0001", externalId: "gm", expectedRole: "gm_ho", expectedBranch: null },
  ];

  for (const tp of testPersonas) {
    console.log(`Testing persona: ${tp.nik} (${tp.expectedRole})...`);
    // Test lookup by NIK
    const userByNik = await dbGetUserByIdentifier(tp.nik);
    assert.ok(userByNik, `User with NIK ${tp.nik} must exist`);
    assert.strictEqual(userByNik.businessRole, tp.expectedRole, `Role must be ${tp.expectedRole}`);
    assert.strictEqual(userByNik.branch, tp.expectedBranch, `Branch must match`);
    assert.strictEqual(userByNik.status, "ACTIVE", `Status must be ACTIVE`);
    assert.ok(userByNik.passwordHash, "Password hash must exist");
    const passValidByNik = await bcrypt.compare(userPass, userByNik.passwordHash);
    assert.ok(passValidByNik, `Password for NIK ${tp.nik} must match`);

    // Test lookup by external_user_id (short username)
    const userByExt = await dbGetUserByIdentifier(tp.externalId);
    assert.ok(userByExt, `User with username ${tp.externalId} must exist`);
    assert.strictEqual(userByExt.id, userByNik.id, "NIK and external_user_id must resolve to same user");

    console.log(`✔ Persona ${tp.nik} (${tp.expectedRole}) verified login & credentials!`);
  }

  console.log("==============================================================");
  console.log("🎉 ALL UAT PERSONAS & ADMIN CREDENTIALS VERIFIED 100%!");
  console.log("==============================================================");
}

testPersonasLogin()
  .then(async () => {
    await closeDbPool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Test failed:", err);
    await closeDbPool();
    process.exit(1);
  });
