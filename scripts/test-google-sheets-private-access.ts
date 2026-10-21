import { 
  syncStoresFromGoogleSheets, 
  getLastStoreSyncHistory,
  fetchPrivateGoogleSheetsCSV
} from "../lib/google-sheets-sync";

async function runTest() {
  console.log("=== TEST: GOOGLE SHEETS PRIVATE ACCESS & STATUS DISTINCTION ===");

  // 1. Verify private access fetcher exists
  if (typeof fetchPrivateGoogleSheetsCSV !== "function") {
    throw new Error("FAIL: fetchPrivateGoogleSheetsCSV is not implemented");
  }

  // 2. Run sync without private credentials
  console.log("Testing sync behavior without private credentials...");
  const result = await syncStoresFromGoogleSheets();

  console.log("Sync result status:", result.status);
  console.log("Sync source:", result.sync_source);
  console.log("Error message / note:", result.error_message);

  // Status must clearly indicate local fallback, NOT pretend Google Sheets synced
  if (result.status !== "OFFLINE_SOURCE_PRESERVED" && result.status !== "LOCAL_FALLBACK") {
    throw new Error(`FAIL: Expected status OFFLINE_SOURCE_PRESERVED or LOCAL_FALLBACK, got ${result.status}`);
  }

  if (result.sync_source !== "FALLBACK_LOCAL_CSV" && result.sync_source !== "LOCAL_MASTER") {
    throw new Error(`FAIL: Expected sync_source FALLBACK_LOCAL_CSV or LOCAL_MASTER, got ${result.sync_source}`);
  }

  // 3. Verify getLastStoreSyncHistory returns clear distinction
  const lastSync = await getLastStoreSyncHistory();
  if (!lastSync) {
    throw new Error("FAIL: getLastStoreSyncHistory returned null");
  }

  console.log("Last sync source type:", (lastSync as any).sourceType);
  if ((lastSync as any).sourceType !== "LOCAL_MASTER" && (lastSync as any).sourceType !== "GOOGLE_SHEETS") {
    throw new Error(`FAIL: Expected sourceType LOCAL_MASTER or GOOGLE_SHEETS, got ${(lastSync as any).sourceType}`);
  }

  console.log("PASS: Google Sheets private access handling & status distinction verified!");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
