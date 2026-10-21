import assert from "node:assert";
import { CompletionApprovalService } from "../lib/completion-approval-service";
import { submitMilestoneFlexible, getMilestones } from "../lib/milestone-service";
import { dbCreateIncident, dbGetIncidentById } from "../lib/incident-db";

async function runTest() {
  console.log("▶ Testing Serah Terima Multi-File & BnM Rejection...");

  const testReportId = `TEST-ST-${Date.now()}`;
  await dbCreateIncident({
    id: testReportId,
    storeId: "SAT-TEST02",
    storeName: "Toko Uji Serah Terima",
    branch: "JAKARTA",
    status: "in_maintenance",
    progress: 100,
    disasterType: "fire",
    createdAt: new Date().toISOString(),
  } as any);

  // Set all 5 milestones to SUBMITTED
  const actorPic = { id: "USR-BMS-02", name: "Andi BMS", role: "bms", branch: "JAKARTA", systemRole: "USER" };
  for (const stage of ["CEKLIS", "ESTIMASI", "APPROVE_PROXY", "SPK", "SERAH_TERIMA"] as const) {
    await submitMilestoneFlexible({
      reportId: testReportId,
      stageKey: stage,
      fileBuffer: Buffer.from(`%PDF-1.4 Mock document for ${stage}`),
      originalFilename: `${stage.toLowerCase()}.pdf`,
      actor: actorPic as any,
    });
  }

  // 1. Submit completion with multiple attachments
  const attachments = [
    { url: "/uploads/st-doc.pdf", originalName: "BA_Serah_Terima.pdf", type: "application/pdf", size: 1024 },
    { url: "/uploads/foto-hasil-1.jpg", originalName: "foto-hasil-1.jpg", type: "image/jpeg", size: 2048 },
    { url: "/uploads/foto-before-after.jpg", originalName: "foto-before-after.jpg", type: "image/jpeg", size: 2048 },
  ];

  await CompletionApprovalService.submitCompletion({
    reportId: testReportId,
    actor: actorPic as any,
    notes: "Pengajuan Serah Terima lengkap dengan foto sebelum-sesudah",
    attachments,
  });

  const approval = await CompletionApprovalService.getOrCreateApproval(testReportId);
  assert.strictEqual(approval.status, "WAITING_COORDINATOR_APPROVAL", "Status must be WAITING_COORDINATOR_APPROVAL");
  assert.ok(Array.isArray((approval as any).attachments), "Attachments must be an array");
  assert.strictEqual((approval as any).attachments.length, 3, "Must have 3 attachments recorded");

  // 2. Coordinator approves
  const actorCoord = { id: "USR-BMC-01", name: "Citra BMC", role: "bmc", branch: "JAKARTA", systemRole: "USER" };
  await CompletionApprovalService.approveByCoordinator({
    reportId: testReportId,
    actor: actorCoord as any,
    notes: "Pemeriksaan koordinator selesai dan disetujui",
  });

  const approvalAfterCoord = await CompletionApprovalService.getOrCreateApproval(testReportId);
  assert.strictEqual(approvalAfterCoord.status, "WAITING_MANAGER_APPROVAL", "Status after coordinator must be WAITING_MANAGER_APPROVAL");

  // 3. Manager rejects WITHOUT reason -> MUST THROW ERROR
  const actorManager = { id: "USR-BM-01", name: "Dedi BM", role: "bm", branch: "JAKARTA", systemRole: "USER" };
  let threwWithoutReason = false;
  try {
    await CompletionApprovalService.rejectByManager({
      reportId: testReportId,
      actor: actorManager as any,
      reason: "   ", // empty
    });
  } catch (err: any) {
    threwWithoutReason = true;
    assert.strictEqual(err.code, "REJECTION_REASON_REQUIRED", "Must have code REJECTION_REASON_REQUIRED");
  }
  assert.ok(threwWithoutReason, "Rejection without reason must fail");

  // 4. Manager rejects WITH reason
  await CompletionApprovalService.rejectByManager({
    reportId: testReportId,
    actor: actorManager as any,
    reason: "Foto hasil perbaikan belum lengkap. Mohon unggah foto terbaru seluruh bagian pekerjaan.",
  });

  // Verify report status is not closed, milestone SERAH_TERIMA is REVISION_REQUESTED, but prior milestones 10%-50% remain intact!
  const milestonesAfterReject = await getMilestones(testReportId);
  const stMilestone = milestonesAfterReject.find(m => m.stageKey === "SERAH_TERIMA");
  assert.strictEqual(stMilestone?.status, "REVISION_REQUESTED", "SERAH_TERIMA milestone must be REVISION_REQUESTED");

  const ceklisMilestone = milestonesAfterReject.find(m => m.stageKey === "CEKLIS");
  assert.strictEqual(ceklisMilestone?.status, "SUBMITTED", "CEKLIS milestone must remain SUBMITTED");

  const estimasiMilestone = milestonesAfterReject.find(m => m.stageKey === "ESTIMASI");
  assert.strictEqual(estimasiMilestone?.status, "SUBMITTED", "ESTIMASI milestone must remain SUBMITTED");

  const proxyMilestone = milestonesAfterReject.find(m => m.stageKey === "APPROVE_PROXY");
  assert.strictEqual(proxyMilestone?.status, "SUBMITTED", "APPROVE_PROXY milestone must remain SUBMITTED");

  const spkMilestone = milestonesAfterReject.find(m => m.stageKey === "SPK");
  assert.strictEqual(spkMilestone?.status, "SUBMITTED", "SPK milestone must remain SUBMITTED");

  // 5. PIC revises Serah Terima: uploads updated Serah Terima document
  await submitMilestoneFlexible({
    reportId: testReportId,
    stageKey: "SERAH_TERIMA",
    fileBuffer: Buffer.from("%PDF-1.4 Revised Serah Terima with full photo appendix"),
    originalFilename: "serah-terima-revisi.pdf",
    actor: actorPic as any,
    notes: "Sudah dilengkapi foto terbaru seluruh bagian pekerjaan",
  });

  // 6. PIC resubmits completion
  await CompletionApprovalService.submitCompletion({
    reportId: testReportId,
    actor: actorPic as any,
    notes: "Pengajuan ulang Serah Terima setelah revisi foto",
    attachments: [
      ...attachments,
      { url: "/uploads/foto-tambahan.jpg", originalName: "foto-tambahan.jpg", type: "image/jpeg", size: 3000 },
    ],
  });

  // Coordinator re-approves
  await CompletionApprovalService.approveByCoordinator({
    reportId: testReportId,
    actor: actorCoord as any,
    notes: "Foto revisi telah diperiksa lengkap oleh koordinator",
  });

  // 7. Manager approves -> Case Closed!
  await CompletionApprovalService.approveByManager({
    reportId: testReportId,
    actor: actorManager as any,
    notes: "Semua dokumen dan foto perbaikan telah lengkap dan disetujui",
  });

  const finalInc = await dbGetIncidentById(testReportId);
  assert.strictEqual(finalInc?.status, "closed", "Final incident status must be closed");
  assert.strictEqual(finalInc?.progress, 100, "Final progress must be 100%");

  console.log("✔ Test Serah Terima Multi-File & Rejection passed successfully!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
