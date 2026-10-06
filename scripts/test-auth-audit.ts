import { getDbPool } from "../lib/db";
import bcrypt from "bcryptjs";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD || "admin123";

async function runTests() {
  console.log("=== RUNNING AUTHENTICATION & IDENTITY AUDIT TESTS ===");
  const pool = getDbPool();

  try {
    // -------------------------------------------------------------
    // Scenario A: Login ADM0001
    // -------------------------------------------------------------
    console.log("\n[Scenario A] Testing Login as ADM0001...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "ADM0001", password: DEV_ADMIN_PASSWORD }),
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const setCookieHeader = loginRes.headers.get("set-cookie") || "";
    const sessionMatch = setCookieHeader.match(/siaga_session=([^;]+)/);
    if (!sessionMatch) {
      throw new Error("No siaga_session cookie returned from login");
    }
    const adminCookie = `siaga_session=${sessionMatch[1]}`;
    console.log("✓ Login ADM0001 success, session cookie acquired.");

    // -------------------------------------------------------------
    // Scenario B: GET /api/auth/me for System Admin
    // -------------------------------------------------------------
    console.log("\n[Scenario B] Testing GET /api/auth/me for ADM0001...");
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: adminCookie },
    });

    if (!meRes.ok) {
      throw new Error(`GET /api/auth/me failed with status ${meRes.status}`);
    }

    const meData = await meRes.json();
    console.log("Actual /api/auth/me response for ADM0001:");
    console.log(JSON.stringify(meData, null, 2));

    if (meData.systemRole !== "ADMIN") throw new Error("Expected systemRole to be 'ADMIN'");
    if (meData.businessRole !== null) throw new Error("Expected businessRole to be null");
    if (meData.scope !== null) throw new Error("Expected scope to be null");
    if (meData.branch !== null) throw new Error("Expected branch to be null");
    if (meData.nik !== "ADM0001") throw new Error("Expected nik to be 'ADM0001'");
    if (!meData.name.includes("Admin")) throw new Error("Expected valid Admin name");
    console.log("✓ GET /api/auth/me response matches all criteria perfectly.");

    // -------------------------------------------------------------
    // Scenario F: Admin accessing /api/admin/users
    // -------------------------------------------------------------
    console.log("\n[Scenario F] Testing Admin accessing /api/admin/users...");
    const adminUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: adminCookie },
    });

    if (!adminUsersRes.ok) {
      throw new Error(`Admin users endpoint failed with status ${adminUsersRes.status}`);
    }
    const adminUsersData = await adminUsersRes.json();
    console.log(`✓ Admin access to /api/admin/users allowed (returned ${adminUsersData.data?.length} users).`);

    // -------------------------------------------------------------
    // Scenario I & J: Seed HO Admin user and test login & 403 on /admin
    // -------------------------------------------------------------
    console.log("\n[Scenario I] Seeding and testing HO Admin user...");
    const hoUserId = "usr_test_ho_admin";
    const hoUserNik = "HO_TEST_01";
    const hoPasswordHash = await bcrypt.hash("hoadmin123", 10);

    await pool.query(
      `INSERT INTO users (id, nik, name, system_role, business_role, scope, branch, status, source, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         system_role = EXCLUDED.system_role,
         business_role = EXCLUDED.business_role,
         scope = EXCLUDED.scope,
         branch = EXCLUDED.branch,
         password_hash = EXCLUDED.password_hash`,
      [hoUserId, hoUserNik, "Budi HO Admin", "USER", "ho_admin", "HO", null, "ACTIVE", "LOCAL", hoPasswordHash]
    );

    const hoLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: hoUserNik, password: "hoadmin123" }),
    });

    if (!hoLoginRes.ok) throw new Error("HO Admin login failed");
    const hoCookieMatch = (hoLoginRes.headers.get("set-cookie") || "").match(/siaga_session=([^;]+)/);
    if (!hoCookieMatch) throw new Error("No session cookie for HO Admin");
    const hoCookie = `siaga_session=${hoCookieMatch[1]}`;

    const hoMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: hoCookie },
    });
    const hoMeData = await hoMeRes.json();
    console.log("HO Admin identity:", {
      systemRole: hoMeData.systemRole,
      businessRole: hoMeData.businessRole,
      scope: hoMeData.scope,
      branch: hoMeData.branch,
    });

    if (hoMeData.systemRole !== "USER" || hoMeData.businessRole !== "ho_admin" || hoMeData.scope !== "HO") {
      throw new Error("HO Admin identity does not match USER/ho_admin/HO");
    }
    console.log("✓ HO Admin identity verified: systemRole=USER, businessRole=ho_admin, scope=HO");

    // Scenario J: HO Admin accessing /api/admin/users -> MUST BE 403
    console.log("\n[Scenario J] Testing HO Admin accessing /api/admin/users (Expected: 403 Forbidden)...");
    const hoForbiddenRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: hoCookie },
    });

    if (hoForbiddenRes.status === 403) {
      console.log("✓ HO Admin access to /api/admin/users correctly rejected with HTTP 403 Forbidden.");
    } else {
      throw new Error(`Expected 403 for HO Admin accessing admin endpoint, got ${hoForbiddenRes.status}`);
    }

    // -------------------------------------------------------------
    // Scenario L: DB Change reflected immediately without re-login
    // -------------------------------------------------------------
    console.log("\n[Scenario L] Testing DB change immediate reflection in getSessionUser...");
    await pool.query(`UPDATE users SET name = 'Budi HO Updated Name' WHERE id = $1`, [hoUserId]);

    const updatedMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: hoCookie },
    });
    const updatedMeData = await updatedMeRes.json();
    if (updatedMeData.name === "Budi HO Updated Name") {
      console.log("✓ Live DB update immediately reflected in getSessionUser without re-authenticating!");
    } else {
      throw new Error(`Expected name 'Budi HO Updated Name', got '${updatedMeData.name}'`);
    }

    // -------------------------------------------------------------
    // Scenario H: Logout
    // -------------------------------------------------------------
    console.log("\n[Scenario H] Testing Logout...");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: adminCookie },
    });

    if (!logoutRes.ok) throw new Error("Logout failed");
    console.log("✓ Logout endpoint succeeded, session cleared.");

    // Clean up test user
    await pool.query(`DELETE FROM users WHERE id = $1`, [hoUserId]);

    console.log("\n=======================================================");
    console.log("ALL TEST SCENARIOS PASSED WITH 100% SUCCESS!");
    console.log("=======================================================");
  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
