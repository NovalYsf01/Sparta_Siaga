import fs from "node:fs";
import path from "node:path";
import { generateInitialReportPdf, generateFinalReportPdf } from "../lib/pdf-generator";
import { IncidentRecord } from "../types/incident";

async function main() {
  console.log("Generating sample Initial & Final PDFs for visual verification...");

  const scratchDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  // Sample JPEG buffer (100x100 white/red box)
  const sampleJpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64"
  );

  const sampleIncident: IncidentRecord = {
    id: "INC-VISUAL-TEST-001",
    date: "13 Oktober 2026",
    reportOrigin: "manual",
    storeId: "T-BDG-088",
    storeName: "Alfamart Dago Heritage",
    branch: "BANDUNG",
    locationCity: "Bandung",
    tkpType: "toko",
    disasterType: "earthquake",
    status: "closed",
    progress: 100,
    fieldPhotos: [sampleJpeg.toString("base64")],
    verification: {
      confirmedBy: "Asep BMS Bandung",
      confirmedAt: "13 Okt 2026, 09:30 WIB",
      isDamaged: true,
      condition: "damaged",
      severity: "Sedang",
      notes: "Plafon depan roboh sepanjang 4 meter, instalasi kabel lampu terputus.",
      photos: [sampleJpeg.toString("base64")],
      bmApproval: {
        decision: "approved",
        decidedBy: "Hendro BMM Bandung",
        decidedAt: "13 Okt 2026, 10:00 WIB",
        decisionNotes: "Disetujui untuk perbaikan segera oleh tim operasional.",
      },
    },
    timeline: [
      {
        stage: "Laporan Masuk",
        label: "Laporan Dibuat",
        timestamp: "13 Okt 2026, 09:00 WIB",
        actor: "Asep BMS Bandung",
      },
      {
        stage: "Pemeriksaan",
        label: "Pemeriksaan Fisik Lapangan",
        timestamp: "13 Okt 2026, 09:30 WIB",
        actor: "Asep BMS Bandung",
      },
      {
        stage: "Persetujuan BM",
        label: "Persetujuan Awal BMM",
        timestamp: "13 Okt 2026, 10:00 WIB",
        actor: "Hendro BMM Bandung",
      },
      {
        stage: "Milestone Ceklis",
        label: "Ceklis 10% Selesai",
        timestamp: "13 Okt 2026, 11:00 WIB",
        actor: "Asep BMS Bandung",
      },
      {
        stage: "Milestone Estimasi",
        label: "Estimasi 25% Disubmit",
        timestamp: "13 Okt 2026, 13:00 WIB",
        actor: "Asep BMS Bandung",
      },
      {
        stage: "Milestone Approve Proxy",
        label: "Persetujuan Eksternal 30% Diunggah",
        timestamp: "13 Okt 2026, 14:00 WIB",
        actor: "Asep BMS Bandung",
      },
      {
        stage: "Milestone SPK",
        label: "SPK 50% Diterbitkan",
        timestamp: "13 Okt 2026, 15:00 WIB",
        actor: "Asep BMS Bandung",
      },
      {
        stage: "Milestone Serah Terima",
        label: "Serah Terima 100% Selesai",
        timestamp: "13 Okt 2026, 16:30 WIB",
        actor: "Asep BMS Bandung",
      },
      {
        stage: "Penyelesaian Final",
        label: "Penyelesaian Disetujui BMM",
        timestamp: "13 Okt 2026, 17:00 WIB",
        actor: "Hendro BMM Bandung",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const initialPdf = await generateInitialReportPdf(sampleIncident);
  const initialPdfPath = path.join(scratchDir, "initial_sample.pdf");
  fs.writeFileSync(initialPdfPath, initialPdf);
  console.log(`Saved Initial PDF: ${initialPdfPath} (${initialPdf.length} bytes)`);

  const finalPdf = await generateFinalReportPdf(sampleIncident);
  const finalPdfPath = path.join(scratchDir, "final_sample.pdf");
  fs.writeFileSync(finalPdfPath, finalPdf);
  console.log(`Saved Final PDF: ${finalPdfPath} (${finalPdf.length} bytes)`);

  // Verify magic bytes
  const initMagic = initialPdf.subarray(0, 8).toString("utf-8");
  const finalMagic = finalPdf.subarray(0, 8).toString("utf-8");
  console.log(`Initial Magic: ${initMagic.trim()}`);
  console.log(`Final Magic:   ${finalMagic.trim()}`);

  if (initMagic.startsWith("%PDF-") && finalMagic.startsWith("%PDF-")) {
    console.log("PDF Generation Test: SUCCESS!");
  } else {
    console.error("PDF Generation Test: FAILED!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error generating PDFs:", err);
  process.exit(1);
});
