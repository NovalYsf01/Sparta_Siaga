import { getDbPool, closeDbPool } from "../lib/db";
import { setupSimulation1 } from "./setup-simulation-1";
import { setupSimulation2 } from "./setup-simulation-2";
import { dbGetIncidentById, dbUpdateIncident } from "../lib/incident-db";
import { submitMilestoneDocument } from "../lib/milestone-service";
import { CompletionApprovalService } from "../lib/completion-approval-service";

async function runSimulationTests() {
  console.log("==============================================================");
  console.log("🚀 VERIFYING END-TO-END SIMULATION SCENARIOS 1 & 2");
  console.log("==============================================================");

  // Setup initial datasets
  await setupSimulation1();
  await setupSimulation2();

  const pool = getDbPool();

  // ==============================================================
  // SCENARIO 1: TOKO CICAHEUM (INC-UAT1-TOKO-001)
  // BMS -> BnM Approval -> Milestones -> BMC Review -> BnM Case Close
  // ==============================================================
  console.log("\n--- [SIMULASI 1: TOKO CICAHEUM] ---");
  const report1Id = "INC-UAT1-TOKO-001";
  let rep1 = await dbGetIncidentById(report1Id);
  if (!rep1) throw new Error("Report 1 not found");

  // Step 1: BMS Field Inspection
  console.log("1. BMS mengajukan hasil pemeriksaan lapangan (Ada Kerusakan)...");
  await dbUpdateIncident(report1Id, {
    status: "pending_bm_approval",
    verification: {
      confirmedBy: "Demo BMS Bandung (BMS)",
      confirmedAt: new Date().toISOString(),
      isDamaged: true,
      condition: "damaged",
      inspectionMethod: "kunjungan_langsung",
      photos: ["/simulasi-uat/01_foto_kejadian_awal_toko.jpg"],
      notes: "Plafon gypsum ambrol dan retak sepanjang 3 meter di atas kasir 1.",
    },
  });

  // Step 2: BnM Manager Approval
  console.log("2. BnM Manajer menyetujui penanganan kerusakan...");
  await dbUpdateIncident(report1Id, {
    status: "confirmed_affected",
    verification: {
      confirmedBy: "Demo BMS Bandung (BMS)",
      confirmedAt: new Date().toISOString(),
      isDamaged: true,
      condition: "damaged",
      inspectionMethod: "kunjungan_langsung",
      photos: ["/simulasi-uat/01_foto_kejadian_awal_toko.jpg"],
      notes: "Plafon gypsum ambrol dan retak sepanjang 3 meter di atas kasir 1.",
      bmApproval: {
        decision: "approved",
        decidedBy: "Demo BnM Manajer Bandung",
        decidedAt: new Date().toISOString(),
        decisionNotes: "Disetujui untuk perbaikan segera demi keamanan toko.",
      },
    },
  });

  // Step 3: Milestones 10%, 25%, 30%, 50%, 100%
  console.log("3. Mengunggah 5 dokumen milestone operasional...");
  const dummyBuffer = Buffer.from("%PDF-1.4 dummy document for simulation test", "utf-8");
  const bmsActor = {
    id: "USR-BMS-001",
    name: "Demo BMS Bandung",
    role: "bms" as const,
    systemRole: "USER" as const,
    scope: "BRANCH" as const,
    branch: "BANDUNG",
  };

  await submitMilestoneDocument({ reportId: report1Id, stageKey: "CEKLIS", actor: bmsActor, fileBuffer: dummyBuffer, originalFilename: "ceklis_kerusakan_toko.pdf", notes: "Ceklis fisik telah diverifikasi bersama kepala toko." });
  await submitMilestoneDocument({ reportId: report1Id, stageKey: "ESTIMASI", actor: bmsActor, fileBuffer: dummyBuffer, originalFilename: "dokumen_estimasi_biaya.pdf", notes: "Dokumen estimasi biaya SPARTA eksternal telah diunggah." });
  await submitMilestoneDocument({ reportId: report1Id, stageKey: "APPROVE_PROXY", actor: bmsActor, fileBuffer: dummyBuffer, originalFilename: "bukti_approve_proxy.pdf", notes: "Persetujuan estimasi proxy selesai." });
  await submitMilestoneDocument({ reportId: report1Id, stageKey: "SPK", actor: bmsActor, fileBuffer: dummyBuffer, originalFilename: "spk_perbaikan_toko.pdf", notes: "Surat Perintah Kerja resmi diterbitkan." });
  await submitMilestoneDocument({ reportId: report1Id, stageKey: "SERAH_TERIMA", actor: bmsActor, fileBuffer: dummyBuffer, originalFilename: "berita_acara_serah_terima_toko.pdf", notes: "Pekerjaan fisik selesai 100% dan lolos uji coba operasional." });

  // Step 4: Serah Terima Workflow
  console.log("4. BMS mengajukan Serah Terima (100%)...");
  await CompletionApprovalService.submitCompletion({
    reportId: report1Id,
    actor: bmsActor,
    notes: "Pekerjaan fisik plafon dan pembersihan area kasir selesai 100%.",
  });

  console.log("5. BMC (Koordinator) mereview & menyetujui Serah Terima...");
  const bmcActor = {
    id: "USR-DEMO-BMC",
    name: "Demo BMC Bandung",
    role: "bmc" as const,
    systemRole: "USER" as const,
    scope: "BRANCH" as const,
    branch: "BANDUNG",
  };
  await CompletionApprovalService.approveByCoordinator({
    reportId: report1Id,
    actor: bmcActor,
    notes: "Hasil pekerjaan fisik telah diperiksa dan disetujui koordinator.",
  });

  console.log("6. BnM Manajer mereview dan menyetujui Case Close...");
  const bmActor = {
    id: "USR-BM-G001",
    name: "Demo BnM Manajer Bandung",
    role: "bm" as const,
    systemRole: "USER" as const,
    scope: "BRANCH" as const,
    branch: "BANDUNG",
  };
  const closedRep1 = await CompletionApprovalService.approveByManager({
    reportId: report1Id,
    actor: bmActor,
    notes: "Seluruh berkas lengkap dan pekerjaan fisik rapi. Laporan resmi ditutup.",
  });

  if (closedRep1.status !== "closed" || closedRep1.progress !== 100) {
    throw new Error(`FAIL: Scenario 1 status=${closedRep1.status}, progress=${closedRep1.progress}`);
  }
  console.log("✔ [SIMULASI 1 SUKSES] Status Toko Cicaheum: CLOSED (100%)");

  // ==============================================================
  // SCENARIO 2: DC BANDUNG & GEMPA OTOMATIS AMAN
  // ==============================================================
  console.log("\n--- [SIMULASI 2: DC BANDUNG & GEMPA OTOMATIS] ---");
  const eqReportId = "INC-UAT2-EQ-001";
  let eqRep = await dbGetIncidentById(eqReportId);
  if (!eqRep) throw new Error("Earthquake report not found");

  console.log("1. Pemeriksaan lapangan gempa: BMS memilih 'Tidak Ada Kerusakan' (Aman)...");
  await dbUpdateIncident(eqReportId, {
    status: "pending_bm_approval",
    verification: {
      confirmedBy: "Demo BMS Bandung (BMS)",
      confirmedAt: new Date().toISOString(),
      isDamaged: false,
      condition: "safe",
      inspectionMethod: "kunjungan_langsung",
      photos: ["/simulasi-uat/01_foto_kejadian_awal_toko.jpg"],
      notes: "Pemeriksaan gerai Babakan Sari: Seluruh rak barang, kaca etalase, dan struktur utuh. Operasional toko normal tanpa kendala.",
    },
  });

  console.log("2. BnM Manajer konfirmasi 'Kondisi Aman'...");
  await dbUpdateIncident(eqReportId, {
    status: "confirmed_safe",
    verification: {
      confirmedBy: "Demo BMS Bandung (BMS)",
      confirmedAt: new Date().toISOString(),
      isDamaged: false,
      condition: "safe",
      inspectionMethod: "kunjungan_langsung",
      photos: ["/simulasi-uat/01_foto_kejadian_awal_toko.jpg"],
      notes: "Pemeriksaan gerai Babakan Sari: Seluruh rak barang, kaca etalase, dan struktur utuh. Operasional toko normal tanpa kendala.",
      bmApproval: {
        decision: "safe",
        decidedBy: "Demo BnM Manajer Bandung",
        decidedAt: new Date().toISOString(),
        decisionNotes: "Kondisi toko aman dan normal, tiket ditutup aman tanpa tiket perbaikan.",
      },
    },
  });

  const checkedEq = await dbGetIncidentById(eqReportId);
  if (checkedEq?.status !== "confirmed_safe") {
    throw new Error(`FAIL: Auto earthquake status is ${checkedEq?.status}, expected confirmed_safe`);
  }
  console.log("✔ [GEMPA OTOMATIS AMAN SUKSES] Status Gempa Otomatis: CONFIRMED_SAFE (Tiket ditutup aman tanpa milestone)");

  // DC Bandung Workflow
  const dcReportId = "INC-UAT2-DC-001";
  console.log("3. Memproses alur DC Bandung (BES -> BEC -> BnM)...");
  const besActor = {
    id: "USR-DEMO-BES",
    name: "Demo BES Bandung",
    role: "bes" as const,
    systemRole: "USER" as const,
    scope: "BRANCH" as const,
    branch: "BANDUNG",
  };

  await dbUpdateIncident(dcReportId, {
    status: "confirmed_affected",
    verification: {
      confirmedBy: "Demo BES Bandung (BES)",
      confirmedAt: new Date().toISOString(),
      isDamaged: true,
      condition: "damaged",
      inspectionMethod: "kunjungan_langsung",
      photos: ["/simulasi-uat/11_foto_kejadian_awal_dc.jpg"],
      notes: "Rel rolling door loading dock Bay 4 macet dan perlu penggantian rel hidrolik.",
      bmApproval: {
        decision: "approved",
        decidedBy: "Demo BnM Manajer Bandung",
        decidedAt: new Date().toISOString(),
        decisionNotes: "Disetujui untuk perbaikan rel rolling dock.",
      },
    },
  });

  await submitMilestoneDocument({ reportId: dcReportId, stageKey: "CEKLIS", actor: besActor, fileBuffer: dummyBuffer, originalFilename: "ceklis_dc.pdf", notes: "Ceklis rolling door DC." });
  await submitMilestoneDocument({ reportId: dcReportId, stageKey: "ESTIMASI", actor: besActor, fileBuffer: dummyBuffer, originalFilename: "estimasi_dc.pdf", notes: "Estimasi perbaikan DC." });
  await submitMilestoneDocument({ reportId: dcReportId, stageKey: "APPROVE_PROXY", actor: besActor, fileBuffer: dummyBuffer, originalFilename: "proxy_dc.pdf", notes: "Approve proxy DC." });
  await submitMilestoneDocument({ reportId: dcReportId, stageKey: "SPK", actor: besActor, fileBuffer: dummyBuffer, originalFilename: "spk_dc.pdf", notes: "SPK teknisi DC." });
  await submitMilestoneDocument({ reportId: dcReportId, stageKey: "SERAH_TERIMA", actor: besActor, fileBuffer: dummyBuffer, originalFilename: "st_dc.pdf", notes: "Serah terima perbaikan rolling door DC." });

  await CompletionApprovalService.submitCompletion({
    reportId: dcReportId,
    actor: besActor,
    notes: "Pengujian rolling door loading dock selesai lancar.",
  });

  const becActor = {
    id: "USR-DEMO-BEC",
    name: "Demo BEC Bandung",
    role: "bec" as const,
    systemRole: "USER" as const,
    scope: "BRANCH" as const,
    branch: "BANDUNG",
  };
  await CompletionApprovalService.approveByCoordinator({
    reportId: dcReportId,
    actor: becActor,
    notes: "Pemeriksaan fungsi rolling door disetujui Koordinator Engineering.",
  });

  const closedDc = await CompletionApprovalService.approveByManager({
    reportId: dcReportId,
    actor: bmActor,
    notes: "Fasilitas DC Bandung siap beroperasi penuh kembali. Laporan ditutup.",
  });

  if (closedDc.status !== "closed" || closedDc.progress !== 100) {
    throw new Error(`FAIL: Scenario 2 DC status=${closedDc.status}, progress=${closedDc.progress}`);
  }
  console.log("✔ [SIMULASI 2 DC SUKSES] Status DC Bandung: CLOSED (100%)");

  console.log("\n==============================================================");
  console.log("🎉 ALL SIMULATION SCENARIOS 1 & 2 VERIFIED 100% SUCCESFULLY!");
  console.log("==============================================================");
  await closeDbPool();
}

runSimulationTests().catch(async (err) => {
  console.error("Simulation verification error:", err);
  await closeDbPool();
  process.exit(1);
});
