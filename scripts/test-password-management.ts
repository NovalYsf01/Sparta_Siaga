import { getDbPool } from "../lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD || "admin123";

async function runPasswordAuditTests() {
  console.log("=== RUNNING USER PASSWORD & MANAGEMENT AUDIT TESTS ===");
  const pool = getDbPool();

  try {
    // Pre-cleanup in case of previous interrupted runs
    await pool.query(`DELETE FROM users WHERE nik IN ('HOADMIN01', 'GMHO001', 'BM001', 'TEST_SHORT', 'TEST_MISMATCH')`);

    // 1. Login as System Admin
    console.log("\n[Auth] Logging in as System Admin (ADM0001)...");
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "ADM0001", password: DEV_ADMIN_PASSWORD }),
    });

    if (!adminLoginRes.ok) throw new Error("Admin login failed");
    const adminCookie = (adminLoginRes.headers.get("set-cookie") || "").split(";")[0];
    console.log("✓ Admin logged in.");

    // -------------------------------------------------------------------------
    // Test F: Password validation (short password & mismatch)
    // -------------------------------------------------------------------------
    console.log("\n[Test F] Testing Password Validation Errors...");
    
    // Short password
    const shortPassRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Test Short",
        nik: "TEST_SHORT",
        businessRole: "ho_admin",
        password: "123",
        confirmPassword: "123",
      }),
    });
    const shortPassData = await shortPassRes.json();
    if (shortPassRes.status !== 400 || !shortPassData.error.includes("minimal 8 karakter")) {
      throw new Error(`Expected min 8 chars error, got: ${JSON.stringify(shortPassData)}`);
    }
    console.log("✓ Password < 8 characters correctly rejected:", shortPassData.error);

    // Mismatched password
    const mismatchPassRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Test Mismatch",
        nik: "TEST_MISMATCH",
        businessRole: "ho_admin",
        password: "password123",
        confirmPassword: "differentPassword123",
      }),
    });
    const mismatchData = await mismatchPassRes.json();
    if (mismatchPassRes.status !== 400 || !mismatchData.error.includes("tidak sesuai")) {
      throw new Error(`Expected confirmation mismatch error, got: ${JSON.stringify(mismatchData)}`);
    }
    console.log("✓ Mismatched password confirmation correctly rejected:", mismatchData.error);

    // -------------------------------------------------------------------------
    // Test A: Create HO Admin from UI API
    // -------------------------------------------------------------------------
    console.log("\n[Test A] Creating HO Admin (USER / HO_ADMIN / HO / branch NULL)...");
    const createHoRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Ahmad Pratama",
        nik: "HOADMIN01",
        email: "ahmad.ho@alfamart.com",
        businessRole: "ho_admin",
        password: "hoadmin_secret_123",
        confirmPassword: "hoadmin_secret_123",
      }),
    });

    if (!createHoRes.ok) {
      const err = await createHoRes.json();
      throw new Error(`Failed to create HO Admin: ${JSON.stringify(err)}`);
    }

    const createdHo = (await createHoRes.json()).data;
    console.log("Created HO Admin:", {
      id: createdHo.id,
      name: createdHo.name,
      nik: createdHo.nik,
      systemRole: createdHo.systemRole,
      businessRole: createdHo.businessRole,
      scope: createdHo.scope,
      branch: createdHo.branch,
      has_password_in_response: "password" in createdHo || "passwordHash" in createdHo,
    });

    if (
      createdHo.systemRole !== "USER" ||
      createdHo.businessRole !== "ho_admin" ||
      createdHo.scope !== "HO" ||
      createdHo.branch !== null ||
      "password" in createdHo ||
      "passwordHash" in createdHo
    ) {
      throw new Error("Created HO Admin properties invalid or sensitive hash exposed");
    }
    console.log("✓ Test A Passed: HO Admin created with correct mappings and no leaked password/hash.");

    // -------------------------------------------------------------------------
    // Test G: API User List never returns password_hash
    // -------------------------------------------------------------------------
    console.log("\n[Test G] Verifying API user list does not expose password_hash...");
    const userListRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: adminCookie },
    });
    const userListData = await userListRes.json();
    for (const u of userListData.data) {
      if ("password" in u || "passwordHash" in u || "password_hash" in u) {
        throw new Error(`User ${u.id} leaked password hash!`);
      }
    }
    console.log(`✓ Test G Passed: All ${userListData.data.length} users in list have no password or hash exposed.`);

    // -------------------------------------------------------------------------
    // Test B: HO Admin login using created password
    // -------------------------------------------------------------------------
    console.log("\n[Test B] Testing HO Admin login with created password...");
    const hoLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "HOADMIN01", password: "hoadmin_secret_123" }),
    });

    if (!hoLoginRes.ok) {
      const err = await hoLoginRes.json();
      throw new Error(`HO Admin login failed: ${JSON.stringify(err)}`);
    }

    const hoCookie = (hoLoginRes.headers.get("set-cookie") || "").split(";")[0];
    console.log("✓ Test B Passed: HO Admin logged in successfully with the created password.");

    // -------------------------------------------------------------------------
    // Test C: HO Admin accessing /api/admin/users -> 403 Forbidden
    // -------------------------------------------------------------------------
    console.log("\n[Test C] Testing HO Admin access to User Management API (Expected: 403)...");
    const hoAccessAdminRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: hoCookie },
    });
    if (hoAccessAdminRes.status !== 403) {
      throw new Error(`Expected 403 for HO Admin accessing admin endpoint, got ${hoAccessAdminRes.status}`);
    }
    console.log("✓ Test C Passed: HO Admin access correctly rejected with 403 Forbidden.");

    // -------------------------------------------------------------------------
    // Test D: Create GM HO (scope HO otomatis, password required)
    // -------------------------------------------------------------------------
    console.log("\n[Test D] Creating GM HO user...");
    const createGmRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Bambang GM",
        nik: "GMHO001",
        businessRole: "gm_ho",
        password: "gmho_secure_pass",
        confirmPassword: "gmho_secure_pass",
      }),
    });
    if (!createGmRes.ok) throw new Error("Failed to create GM HO");
    const gmUser = (await createGmRes.json()).data;
    if (gmUser.scope !== "HO" || gmUser.branch !== null) {
      throw new Error("GM HO scope was not automatically HO or branch not null");
    }
    console.log("✓ Test D Passed: GM HO created with scope HO automatically.");

    // -------------------------------------------------------------------------
    // Test E: Create Branch Manager (branch required)
    // -------------------------------------------------------------------------
    console.log("\n[Test E] Creating Branch Manager with branch requirement...");
    const noBranchBmRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Cahyo BM",
        nik: "BM001",
        businessRole: "bm",
        password: "bm_secure_pass",
        confirmPassword: "bm_secure_pass",
      }),
    });
    if (noBranchBmRes.status !== 400) {
      throw new Error("Expected BM without branch to fail with 400");
    }
    console.log("✓ BM without branch rejected as expected.");

    const validBmRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Cahyo BM",
        nik: "BM001",
        businessRole: "bm",
        branch: "G001",
        password: "bm_secure_pass",
        confirmPassword: "bm_secure_pass",
      }),
    });
    if (!validBmRes.ok) throw new Error("Failed to create BM with branch");
    const bmUser = (await validBmRes.json()).data;
    if (bmUser.scope !== "BRANCH" || bmUser.branch !== "G001") {
      throw new Error("BM scope/branch invalid");
    }
    console.log("✓ Test E Passed: Branch Manager created with scope BRANCH and branch G001.");

    // -------------------------------------------------------------------------
    // Test H: Edit user without changing password -> old password still valid
    // -------------------------------------------------------------------------
    console.log("\n[Test H] Editing user without changing password...");
    const editHoRes = await fetch(`${BASE_URL}/api/admin/users/${createdHo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Ahmad Pratama Updated",
        businessRole: "ho_admin",
      }),
    });
    if (!editHoRes.ok) throw new Error("Failed to edit HO Admin name");
    console.log("✓ User edited without password field.");

    // Login with old password must still work
    const oldPassLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "HOADMIN01", password: "hoadmin_secret_123" }),
    });
    if (!oldPassLoginRes.ok) throw new Error("Old password became invalid after non-password edit");
    console.log("✓ Test H Passed: Old password remains valid after non-password profile update.");

    // -------------------------------------------------------------------------
    // Test I: Reset password -> old password invalid, new password valid
    // -------------------------------------------------------------------------
    console.log("\n[Test I] Resetting user password...");
    const resetPassRes = await fetch(`${BASE_URL}/api/admin/users/${createdHo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        password: "new_fresh_password_789",
        confirmPassword: "new_fresh_password_789",
      }),
    });
    if (!resetPassRes.ok) throw new Error("Password reset PATCH failed");
    console.log("✓ Password reset PATCH succeeded.");

    // Old password should now fail
    const oldLoginFailRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "HOADMIN01", password: "hoadmin_secret_123" }),
    });
    if (oldLoginFailRes.status !== 401) {
      throw new Error(`Expected old password to fail with 401, got ${oldLoginFailRes.status}`);
    }
    console.log("✓ Old password successfully invalidated (HTTP 401).");

    // New password should now succeed
    const newLoginSuccessRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "HOADMIN01", password: "new_fresh_password_789" }),
    });
    if (!newLoginSuccessRes.ok) {
      throw new Error("New password failed to log in");
    }
    console.log("✓ Test I Passed: New password logged in successfully.");

    // -------------------------------------------------------------------------
    // Test J: System Admin cannot be created from API
    // -------------------------------------------------------------------------
    console.log("\n[Test J] Attempting to create System Admin via API (Expected: rejection)...");
    const fakeAdminRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: "Rogue Admin",
        nik: "ROGUE01",
        systemRole: "ADMIN",
        businessRole: "ho_admin",
        password: "admin_password_99",
      }),
    });
    if (fakeAdminRes.status !== 400) {
      throw new Error("Creating ADMIN from API was not blocked");
    }
    const fakeAdminData = await fakeAdminRes.json();
    console.log("✓ Test J Passed: Creating ADMIN from API blocked with message:", fakeAdminData.error);

    // Clean up created test users
    console.log("\n[Cleanup] Cleaning up created test users from database...");
    await pool.query(`DELETE FROM users WHERE nik IN ('HOADMIN01', 'GMHO001', 'BM001')`);
    console.log("✓ Cleanup finished.");

    console.log("\n=======================================================");
    console.log("ALL PASSWORD & MANAGEMENT TESTS PASSED WITH 100% SUCCESS!");
    console.log("=======================================================");
  } finally {
    await pool.end();
  }
}

runPasswordAuditTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
