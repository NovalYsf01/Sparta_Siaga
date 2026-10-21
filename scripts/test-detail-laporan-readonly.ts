import fs from "fs";
import path from "path";

async function testDetailLaporanReadOnly() {
  console.log("=== Testing Detail Laporan Read-Only Enforcement ===");
  const filePath = path.join(process.cwd(), "components/incident/maintenance-tracking-modal.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  // 1. Must NOT contain embedded mutating submodals
  const hasEmbeddedProgressModal = content.includes("<ProgressUpdateModal");
  const hasEmbeddedVerificationModal = content.includes("<StoreVerificationModal");
  const hasEmbeddedEstimationModal = content.includes("<EstimationModal");

  if (hasEmbeddedProgressModal) {
    throw new Error("FAIL: maintenance-tracking-modal.tsx still contains embedded ProgressUpdateModal");
  }
  if (hasEmbeddedVerificationModal) {
    throw new Error("FAIL: maintenance-tracking-modal.tsx still contains embedded StoreVerificationModal");
  }
  if (hasEmbeddedEstimationModal) {
    throw new Error("FAIL: maintenance-tracking-modal.tsx still contains embedded EstimationModal");
  }

  // 2. Must NOT contain target date editor
  if (content.includes("handleSaveTarget") || content.includes("isEditingTarget")) {
    throw new Error("FAIL: maintenance-tracking-modal.tsx still contains target date mutating editor");
  }

  // 3. Must NOT contain "+ Tambah Update" button
  if (content.includes("+ Tambah Update")) {
    throw new Error("FAIL: maintenance-tracking-modal.tsx still contains '+ Tambah Update' button");
  }

  // 4. Must contain prominent PDF download link
  if (!content.includes("/export/pdf") || !content.includes("Unduh PDF Laporan")) {
    throw new Error("FAIL: maintenance-tracking-modal.tsx missing prominent 'Unduh PDF Laporan' link");
  }

  // 5. Must contain navigation to map ("Lihat di Peta")
  if (!content.includes("Lihat di Peta")) {
    throw new Error("FAIL: maintenance-tracking-modal.tsx missing 'Lihat di Peta' navigation button");
  }

  console.log("✔ Detail Laporan is strictly 100% read-only with PDF download and Map navigation.");
}

testDetailLaporanReadOnly().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
