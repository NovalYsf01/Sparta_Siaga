import { 
  runAutonomousStoreSyncCycle, 
  getStoreSyncStatus,
  isStoreSyncDue
} from "../lib/server-daemon";

async function runTest() {
  console.log("=== TEST: AUTONOMOUS STORE SYNC SCHEDULER ===");

  // 1. Verify functions exist
  if (typeof runAutonomousStoreSyncCycle !== "function") {
    throw new Error("FAIL: runAutonomousStoreSyncCycle is not exported from server-daemon");
  }
  if (typeof isStoreSyncDue !== "function") {
    throw new Error("FAIL: isStoreSyncDue is not exported from server-daemon");
  }

  // 2. Test due check calculation
  console.log("Testing isStoreSyncDue...");
  const isDue = await isStoreSyncDue();
  console.log("Is store sync due right now?", isDue);

  // 3. Test running an autonomous sync cycle with force = true
  console.log("Executing runAutonomousStoreSyncCycle(true)...");
  const cycleResult = await runAutonomousStoreSyncCycle(true);
  console.log("Cycle execution result:", cycleResult.success, cycleResult.status);

  if (!cycleResult.success) {
    throw new Error(`FAIL: runAutonomousStoreSyncCycle failed: ${cycleResult.error}`);
  }

  // 4. Verify status getter
  const status = await getStoreSyncStatus();
  console.log("Current store sync daemon status:", status);

  if (!status.lastSyncAt) {
    throw new Error("FAIL: status.lastSyncAt is empty after successful cycle");
  }

  console.log("PASS: Autonomous store sync scheduler is fully functional!");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
