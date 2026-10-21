import assert from "node:assert";
import { getMilestones, submitMilestoneFlexible, checkMilestoneCompleteness } from "../lib/milestone-service";
import { dbGetIncidentById, dbCreateIncident } from "../lib/incident-db";

async function runTest() {
  console.log("▶ Testing Flexible Milestone Progression...");

  // 1. Create a test incident
  const testReportId = `TEST-FLEX-${Date.now()}`;
  await dbCreateIncident({
    id: testReportId,
    storeId: "SAT-TEST01",
    storeName: "Toko Uji Milestone",
    branch: "TANGERANG",
    status: "in_maintenance",
    progress: 0,
    disasterType: "flood",
    createdAt: new Date().toISOString(),
  } as any);

  const actor = {
    id: "USR-BMS-01",
    name: "Budi BMS",
    role: "bms",
    branch: "TANGERANG",
    systemRole: "USER",
  };

  // 2. Submit APPROVE_PROXY (30%) directly WITHOUT prior 10% (Ceklis) or 25% (Estimasi)
  const dummyBuffer = Buffer.from("%PDF-1.4 Mock Proxy Approval Document Content");
  const result = await submitMilestoneFlexible({
    reportId: testReportId,
    stageKey: "APPROVE_PROXY",
    fileBuffer: dummyBuffer,
    originalFilename: "surat-proxy-30.pdf",
    actor: actor as any,
    notes: "Pekerjaan lapangan telah disetujui proxy",
  });

  assert.ok(result, "Submission result should exist");
  assert.strictEqual(result.milestone.status, "SUBMITTED", "Target milestone status must be SUBMITTED");

  // 3. Verify incident progress advances to 30%
  const updatedInc = await dbGetIncidentById(testReportId);
  assert.strictEqual(updatedInc?.progress, 30, "Incident progress must be 30%");

  // 4. Verify document completeness is false because Ceklis and Estimasi are missing
  const completeness = await checkMilestoneCompleteness(testReportId);
  assert.strictEqual(completeness.isDocumentComplete, false, "Document completeness must be false");
  assert.ok(completeness.missingDocuments.some((d: string) => d.includes("10%")), "Must list Ceklis 10% as missing");
  assert.ok(completeness.missingDocuments.some((d: string) => d.includes("25%")), "Must list Estimasi 25% as missing");

  // 5. Submit remaining documents: CEKLIS (10%), ESTIMASI (25%), SPK (50%), SERAH_TERIMA (100%)
  for (const stage of ["CEKLIS", "ESTIMASI", "SPK", "SERAH_TERIMA"] as const) {
    await submitMilestoneFlexible({
      reportId: testReportId,
      stageKey: stage,
      fileBuffer: Buffer.from(`%PDF-1.4 Mock ${stage}`),
      originalFilename: `${stage.toLowerCase()}.pdf`,
      actor: actor as any,
    });
  }

  // 6. Verify now document completeness is true and progress is 100%
  const fullCompleteness = await checkMilestoneCompleteness(testReportId);
  assert.strictEqual(fullCompleteness.isDocumentComplete, true, "All mandatory documents must now be complete");
  assert.strictEqual(fullCompleteness.missingDocuments.length, 0, "No missing documents should remain");

  const finalInc = await dbGetIncidentById(testReportId);
  assert.strictEqual(finalInc?.progress, 100, "Progress must be 100%");

  console.log("✔ Test Flexible Milestone passed successfully!");
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
