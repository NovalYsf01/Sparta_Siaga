import assert from "node:assert";
import { CompletionApprovalService } from "../lib/completion-approval-service";
import { submitMilestoneFlexible, getMilestones } from "../lib/milestone-service";
import { dbCreateIncident, dbGetIncidentById } from "../lib/incident-db";

async function runTest() {
  console.log("==============================================================");
  console.log("🧪 TEST: ROLE-BASED SERAH TERIMA WORKFLOW (BMS/BES -> BMC/BEC -> BnM)");
  console.log("==============================================================");

  // -------------------------------------------------------------------------
  // TEST SCENARIO 1: Toko Workflow (BMS -> BMC -> BM)
  // -------------------------------------------------------------------------
  console.log("\n--- SCENARIO 1: TOKO WORKFLOW (BMS -> BMC -> BM) ---");
  const storeReportId = `TEST-ST-STORE-${Date.now()}`;
  await dbCreateIncident({
    id: storeReportId,
    storeId: "TOKO-BDG-01",
    storeName: "Alfamart Cicaheum Bandung",
    branch: "BANDUNG",
    status: "in_maintenance",
    progress: 50,
    disasterType: "flood",
    createdAt: new Date().toISOString(),
  } as any);

  const bmsOfficer = {
    id: "USR-BMS-001",
    nik: "BMS0001",
    name: "Demo BMS Bandung",
    role: "bms",
    businessRole: "bms",
    branch: "BANDUNG",
    systemRole: "USER",
  };

  const bmcCoordinator = {
    id: "USR-DEMO-BMC",
    nik: "BMC0001",
    name: "Demo BMC Bandung",
    role: "bmc",
    businessRole: "bmc",
    branch: "BANDUNG",
    systemRole: "USER",
  };

  const bnmManager = {
    id: "USR-BM-G001",
    nik: "BM0001",
    name: "Demo BnM Manajer Bandung",
    role: "bm",
    businessRole: "bm",
    branch: "BANDUNG",
    systemRole: "USER",
  };

  // Submit milestones 10%-50%
  console.log("Submitting milestones 10% to 50%...");
  for (const stage of ["CEKLIS", "ESTIMASI", "APPROVE_PROXY", "SPK"] as const) {
    await submitMilestoneFlexible({
      reportId: storeReportId,
      stageKey: stage,
      fileBuffer: Buffer.from(`%PDF-1.4 Mock document for ${stage}`),
      originalFilename: `${stage.toLowerCase()}.pdf`,
      actor: bmsOfficer as any,
    });
  }

  // Submit Serah Terima milestone (100%)
  await submitMilestoneFlexible({
    reportId: storeReportId,
    stageKey: "SERAH_TERIMA",
    fileBuffer: Buffer.from("%PDF-1.4 Dokumen Serah Terima Toko"),
    originalFilename: "serah-terima-toko.pdf",
    actor: bmsOfficer as any,
  });

  // Step 1: BMS uploads multi-file attachments and submits completion
  console.log("Step 1: BMS submits Serah Terima with multi-file attachments...");
  const storeAttachments = [
    { url: "/uploads/st-ba.pdf", originalName: "BA_Serah_Terima_Cicaheum.pdf", type: "application/pdf", size: 12400 },
    { url: "/uploads/st-selesai.jpg", originalName: "foto-pekerjaan-selesai.jpg", type: "image/jpeg", size: 45000 },
    { url: "/uploads/st-before-after.jpg", originalName: "foto-before-after.jpg", type: "image/jpeg", size: 68000 },
  ];

  await CompletionApprovalService.submitCompletion({
    reportId: storeReportId,
    actor: bmsOfficer as any,
    notes: "Pengajuan Serah Terima Fisik Toko Cicaheum",
    attachments: storeAttachments,
  });

  let approvalRecord = await CompletionApprovalService.getOrCreateApproval(storeReportId);
  assert.strictEqual(approvalRecord.status, "WAITING_COORDINATOR_APPROVAL", "Status must be WAITING_COORDINATOR_APPROVAL");
  assert.strictEqual(approvalRecord.flowType, "BMS", "Flow type must be BMS");
  assert.strictEqual(approvalRecord.coordinatorRole, "bmc", "Coordinator role must be BMC");
  assert.strictEqual((approvalRecord as any).attachments.length, 3, "Must have 3 attachments stored");
  console.log("✔ Step 1 PASS: Multi-file attachments submitted, status: WAITING_COORDINATOR_APPROVAL");

  // Step 2: Attempt by Manager to approve BEFORE coordinator must be blocked
  console.log("Step 2: Testing bypass prevention (Manager cannot approve before Coordinator)...");
  let bypassPrevented = false;
  try {
    await CompletionApprovalService.approveByManager({
      reportId: storeReportId,
      actor: bnmManager as any,
      notes: "Direct approve attempt",
    });
  } catch (err: any) {
    bypassPrevented = true;
  }
  assert.ok(bypassPrevented, "Manager approval before coordinator must be blocked");
  console.log("✔ Step 2 PASS: Direct bypass to Manager prevented");

  // Step 3: Coordinator BMC approves
  console.log("Step 3: Coordinator BMC approves...");
  await CompletionApprovalService.approveByCoordinator({
    reportId: storeReportId,
    actor: bmcCoordinator as any,
    notes: "Verifikasi lapangan oleh BMC Bandung memenuhi standar operasional",
  });

  approvalRecord = await CompletionApprovalService.getOrCreateApproval(storeReportId);
  assert.strictEqual(approvalRecord.status, "WAITING_MANAGER_APPROVAL", "Status must be WAITING_MANAGER_APPROVAL");
  console.log("✔ Step 3 PASS: BMC approval advanced status to WAITING_MANAGER_APPROVAL");

  // Step 4: BnM Manager rejects WITHOUT reason -> MUST FAIL
  console.log("Step 4: BnM Manager rejection without reason must be rejected...");
  let emptyReasonFailed = false;
  try {
    await CompletionApprovalService.rejectByManager({
      reportId: storeReportId,
      actor: bnmManager as any,
      reason: "",
    });
  } catch (err: any) {
    emptyReasonFailed = true;
    assert.strictEqual(err.code, "REJECTION_REASON_REQUIRED");
  }
  assert.ok(emptyReasonFailed, "Rejection without reason must fail");
  console.log("✔ Step 4 PASS: Rejection without reason rejected with REJECTION_REASON_REQUIRED");

  // Step 5: BnM Manager rejects WITH reason
  console.log("Step 5: BnM Manager rejects with reason...");
  const rejectionReason = "Foto perbaikan atap bocor belum menunjukkan tes siram air. Harap lampirkan bukti tes siram.";
  await CompletionApprovalService.rejectByManager({
    reportId: storeReportId,
    actor: bnmManager as any,
    reason: rejectionReason,
  });

  approvalRecord = await CompletionApprovalService.getOrCreateApproval(storeReportId);
  assert.strictEqual(approvalRecord.status, "REVISION_REQUIRED", "Status must be REVISION_REQUIRED");
  assert.strictEqual(approvalRecord.rejectionReason, rejectionReason, "Rejection reason must be stored");

  // Verify prior milestones 10%-50% are NOT reset!
  const milestonesAfterReject = await getMilestones(storeReportId);
  const stStage = milestonesAfterReject.find((m) => m.stageKey === "SERAH_TERIMA");
  assert.strictEqual(stStage?.status, "REVISION_REQUESTED", "SERAH_TERIMA milestone must be REVISION_REQUESTED");

  for (const stage of ["CEKLIS", "ESTIMASI", "APPROVE_PROXY", "SPK"]) {
    const m = milestonesAfterReject.find((x) => x.stageKey === stage);
    assert.strictEqual(m?.status, "SUBMITTED", `Milestone ${stage} must remain SUBMITTED and NOT reset`);
  }
  console.log("✔ Step 5 PASS: Rejection sets REVISION_REQUIRED; milestones 10%-50% remain intact!");

  // Step 6: BMS re-uploads updated documents and resubmits
  console.log("Step 6: BMS uploads revised documents and resubmits...");
  await submitMilestoneFlexible({
    reportId: storeReportId,
    stageKey: "SERAH_TERIMA",
    fileBuffer: Buffer.from("%PDF-1.4 Dokumen Serah Terima Revisi + Bukti Tes Siram"),
    originalFilename: "serah-terima-revisi-tessiram.pdf",
    actor: bmsOfficer as any,
  });

  const updatedAttachments = [
    ...storeAttachments,
    { url: "/uploads/st-tes-siram.jpg", originalName: "foto-tes-siram.jpg", type: "image/jpeg", size: 52000 },
  ];

  await CompletionApprovalService.submitCompletion({
    reportId: storeReportId,
    actor: bmsOfficer as any,
    notes: "Pengajuan ulang: Foto tes siram air telah dilampirkan pada halaman 4",
    attachments: updatedAttachments,
  });

  approvalRecord = await CompletionApprovalService.getOrCreateApproval(storeReportId);
  assert.strictEqual(approvalRecord.status, "WAITING_COORDINATOR_APPROVAL", "Status must return to WAITING_COORDINATOR_APPROVAL");
  console.log("✔ Step 6 PASS: Resubmission resets approval status to WAITING_COORDINATOR_APPROVAL");

  // Step 7: BMC Coordinator approves revised submission
  console.log("Step 7: BMC Coordinator re-approves...");
  await CompletionApprovalService.approveByCoordinator({
    reportId: storeReportId,
    actor: bmcCoordinator as any,
    notes: "Bukti tes siram air telah diverifikasi valid",
  });

  approvalRecord = await CompletionApprovalService.getOrCreateApproval(storeReportId);
  assert.strictEqual(approvalRecord.status, "WAITING_MANAGER_APPROVAL", "Status must advance to WAITING_MANAGER_APPROVAL");
  console.log("✔ Step 7 PASS: BMC Coordinator re-approved");

  // Step 8: BnM Manager approves -> Case Closed
  console.log("Step 8: BnM Manager approves...");
  await CompletionApprovalService.approveByManager({
    reportId: storeReportId,
    actor: bnmManager as any,
    notes: "Pekerjaan Serah Terima disetujui penuh. Kasus ditutup.",
  });

  approvalRecord = await CompletionApprovalService.getOrCreateApproval(storeReportId);
  assert.strictEqual(approvalRecord.status, "CLOSED", "Status must be CLOSED");

  const finalReport = await dbGetIncidentById(storeReportId);
  assert.strictEqual(finalReport?.status, "closed", "Final report status must be closed");
  assert.strictEqual(finalReport?.progress, 100, "Final progress must be 100");
  console.log("✔ Step 8 PASS: BnM Manager approved, report closed successfully!");

  console.log("\n==============================================================");
  console.log("🎉 ALL ROLE WORKFLOW TESTS PASSED 100%!");
  console.log("==============================================================");
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
