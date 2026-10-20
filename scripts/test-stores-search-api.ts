import assert from "node:assert/strict";
import { GET } from "../app/api/stores/search/route";
import { signSession } from "../lib/jwt";
import { dbUpsertUser } from "../lib/user-db";
import { closeDbPool } from "../lib/db";

async function run() {
  console.log("=== Testing Stores Search API Endpoint ===");

  await Promise.all([
    dbUpsertUser({ id: "usr_t_bms", nik: "T_BMS", name: "BMS Bandung Test", systemRole: "USER", businessRole: "bms", scope: "BRANCH", branch: "BANDUNG", status: "ACTIVE" }),
    dbUpsertUser({ id: "usr_t_bes", nik: "T_BES", name: "BES Bandung Test", systemRole: "USER", businessRole: "bes", scope: "BRANCH", branch: "BANDUNG", status: "ACTIVE" }),
  ]);

  const tokenBms = await signSession({ id: "usr_t_bms", nik: "T_BMS", systemRole: "USER" });
  const tokenBes = await signSession({ id: "usr_t_bes", nik: "T_BES", systemRole: "USER" });

  // 1. BMS Bandung searches "cicaheum"
  console.log("1. Testing BMS Bandung searching 'cicaheum'...");
  const bmsReq = new Request("http://localhost:3004/api/stores/search?q=cicaheum&type=TOKO", {
    headers: { cookie: `siaga_session=${tokenBms}` },
  });
  const bmsRes = await GET(bmsReq);
  assert.equal(bmsRes.status, 200, "BMS search should return 200 OK");
  const bmsData = await bmsRes.json();
  console.log(`BMS search returned ${bmsData.count} stores:`, bmsData.data.map((d: any) => `${d.kode_toko} - ${d.nama_toko}`));
  assert(bmsData.count >= 2, "Expected at least 2 Cicaheum stores");
  const storeCodes = bmsData.data.map((d: any) => d.kode_toko);
  assert(storeCodes.includes("B081"), "Should include B081");
  assert(storeCodes.includes("B190"), "Should include B190");

  // 2. BES Bandung searches DC / Facility
  console.log("2. Testing BES Bandung searching DC / Facility...");
  const besReq = new Request("http://localhost:3004/api/stores/search?q=BANDUNG&type=DC", {
    headers: { cookie: `siaga_session=${tokenBes}` },
  });
  const besRes = await GET(besReq);
  assert.equal(besRes.status, 200, "BES search should return 200 OK");
  const besData = await besRes.json();
  console.log(`BES search returned ${besData.count} facilities:`, besData.data.map((d: any) => `${d.kode_toko} - ${d.nama_toko}`));
  assert(besData.count >= 2, "Expected at least 2 facilities for Bandung");

  // 3. BMS trying to search DC must be 403 Forbidden
  console.log("3. Testing BMS trying to search DC...");
  const bmsDcReq = new Request("http://localhost:3004/api/stores/search?type=DC", {
    headers: { cookie: `siaga_session=${tokenBms}` },
  });
  const bmsDcRes = await GET(bmsDcReq);
  assert.equal(bmsDcRes.status, 403, "BMS searching DC should return 403");

  // 4. BES trying to search Toko must be 403 Forbidden
  console.log("4. Testing BES trying to search Toko...");
  const besTokoReq = new Request("http://localhost:3004/api/stores/search?type=TOKO", {
    headers: { cookie: `siaga_session=${tokenBes}` },
  });
  const besTokoRes = await GET(besTokoReq);
  assert.equal(besTokoRes.status, 403, "BES searching Toko should return 403");

  console.log("PASS: All store and DC search API tests passed successfully!");
}

run()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDbPool();
  });
