import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { MILESTONE_CONFIG } from "../types/incident";

async function runTest() {
  console.log("▶ Verifying Estimasi UI adjustment and 25% milestone retention...");

  // 1. Verify Milestone Estimasi exists with target progress 25%
  assert.strictEqual(MILESTONE_CONFIG.ESTIMASI.progress, 25, "Estimasi milestone target must be 25%");
  assert.strictEqual(MILESTONE_CONFIG.ESTIMASI.label, "Estimasi", "Estimasi milestone label must be 'Estimasi'");

  // 2. Verify OperationalReportCenter no longer has "Buat Estimasi" button
  const reportCenterPath = path.resolve(process.cwd(), "components/reports/operational-report-center.tsx");
  const reportCenterCode = fs.readFileSync(reportCenterPath, "utf-8");
  assert.ok(!reportCenterCode.includes('setSelectReportPurpose("ESTIMATION")'), "Buat Estimasi button must be removed from OperationalReportCenter");
  assert.ok(!reportCenterCode.includes('>Buat Estimasi<'), "Text 'Buat Estimasi' button must not be present");

  console.log("✔ Estimasi UI verification passed!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
