import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { getDbPool } from "../lib/db";
import {
  syncStoresFromGoogleSheets,
  getLastStoreSyncHistory,
  ensureStoreSyncTables,
} from "../lib/google-sheets-sync";

async function main() {
  console.log("=== Testing Google Sheets Store Sync Engine ===");

  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  let isolatedUrl = "";
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*SPARTA_ISOLATED_TEST_DATABASE_URL\s*=\s*(.*)?\s*$/);
    if (match) {
      isolatedUrl = match[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }
  if (isolatedUrl) {
    process.env.DATABASE_URL = isolatedUrl;
    process.env.DATABASE_SSL_MODE = "require";
  }

  // 1. Ensure tables
  await ensureStoreSyncTables();
  console.log("✓ ensureStoreSyncTables created store_sync_history & stores tables");

  // 2. Run sync
  console.log("Running syncStoresFromGoogleSheets()...");
  const result = await syncStoresFromGoogleSheets();
  console.log("Sync result:", {
    id: result.id,
    source: result.sync_source,
    status: result.status,
    records_read: result.records_read,
    records_added: result.records_added,
    records_updated: result.records_updated,
    error: result.error_message,
  });

  assert.ok(result.id, "Sync must generate an ID");
  assert.ok(
    result.status === "COMPLETED" || result.status === "OFFLINE_SOURCE_PRESERVED",
    `Status must be COMPLETED or OFFLINE_SOURCE_PRESERVED, got: ${result.status}`
  );
  assert.ok(result.records_read > 20000, `Must read > 20,000 stores, got: ${result.records_read}`);

  // 3. Verify getLastStoreSyncHistory
  const lastSync = await getLastStoreSyncHistory();
  assert.ok(lastSync, "getLastStoreSyncHistory must return the sync record");
  assert.strictEqual(lastSync.id, result.id, "Last sync ID must match");
  console.log("✓ getLastStoreSyncHistory returns valid record");

  // 4. Verify stores in PostgreSQL
  const pool = getDbPool();
  const countRes = await pool.query("SELECT COUNT(*) as count FROM stores");
  const storeCount = parseInt(countRes.rows[0].count, 10);
  console.log(`✓ PostgreSQL stores count: ${storeCount}`);
  assert.ok(storeCount > 20000, `PostgreSQL stores table must have > 20,000 rows, got: ${storeCount}`);

  // Check sample store
  const sampleRes = await pool.query("SELECT * FROM stores WHERE kode_toko = 'T770' OR kode_toko = '1A01' LIMIT 2");
  console.log("Sample stores from DB:", sampleRes.rows);
  assert.ok(sampleRes.rows.length > 0, "Should find sample store in stores table");

  console.log("=== All Google Sheets Sync Tests PASSED! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
