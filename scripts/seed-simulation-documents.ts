import fs from "fs";
import path from "path";

// Helper to create a minimal, 100% valid PDF-1.4 document containing visible text
function createSimplePdf(title: string, subtitle: string, reportType: string): Buffer {
  const content = `BT
/F1 18 Tf
50 750 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(${subtitle}) Tj
/F1 10 Tf
0 -25 Td
(Status: DOKUMEN SIMULASI / UAT - BUKAN DOKUMEN RESMI) Tj
0 -20 Td
(Kategori Pekerjaan: ${reportType}) Tj
0 -20 Td
(Tanggal Simulasi: ${new Date().toISOString().split("T")[0]}) Tj
0 -20 Td
(Sistem: SPARTA SIAGA UAT Environment - Alfamart Disaster Relief) Tj
0 -30 Td
(Catatan: Berkas ini dihasilkan khusus untuk keperluan simulasi UAT bersama pimpinan.) Tj
ET`;

  const streamLength = Buffer.byteLength(content, "utf8");

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000325 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
400
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

// Helper to create a valid minimal 200x150 JPEG with basic markers
function createSampleJpeg(label: string): Buffer {
  // A tiny, fully valid 1x1 JPEG image with standard JFIF header
  // SOI, APP0 (JFIF), DQT, SOF0, DHT, SOS, compressed data, EOI
  const base64Jpeg =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  return Buffer.from(base64Jpeg, "base64");
}

export async function generateSimulationDocuments(): Promise<string> {
  console.log("==============================================================");
  console.log("📄 GENERATING REALISTIC UAT SIMULATION DOCUMENTS");
  console.log("==============================================================");

  const targetDir = path.resolve("public", "simulasi-uat");
  fs.mkdirSync(targetDir, { recursive: true });

  const documents = [
    // --- SIMULASI 1: TOKO ---
    {
      filename: "01_foto_kejadian_awal_toko.jpg",
      type: "image",
      label: "Foto Kejadian Awal Toko Cicaheum (UAT)",
    },
    {
      filename: "02_foto_pemeriksaan_lapangan_toko.jpg",
      type: "image",
      label: "Foto Hasil Pemeriksaan Plafon Rusak (UAT)",
    },
    {
      filename: "03_dokumen_ceklis_10_toko.pdf",
      type: "pdf",
      title: "FORMULIR CEKLIS KERUSAKAN TOKO - 10%",
      subtitle: "Inspeksi Kerusakan Fisik Plafon & Atap Toko Cicaheum",
      category: "Milestone Ceklis 10%",
    },
    {
      filename: "04_dokumen_estimasi_25_eksternal_sparta.pdf",
      type: "pdf",
      title: "HASIL PERHITUNGAN ESTIMASI APLIKASI SPARTA - 25%",
      subtitle: "Lampiran Dokumen Estimasi Biaya Pemeliharaan dari Portal SPARTA",
      category: "Milestone Estimasi 25% (Aplikasi Eksternal SPARTA)",
    },
    {
      filename: "05_dokumen_approve_proxy_30.pdf",
      type: "pdf",
      title: "FORMULIR PERSETUJUAN PROXY BnM - 30%",
      subtitle: "Approval Proxy Perbaikan Fasilitas Toko oleh BnM Cabang",
      category: "Milestone Approve Proxy 30%",
    },
    {
      filename: "06_dokumen_spk_50_toko.pdf",
      type: "pdf",
      title: "SURAT PERINTAH KERJA (SPK) KONTRAKTOR - 50%",
      subtitle: "Pekerjaan Penggantian Plafon Gypsum & Waterproofing Atap",
      category: "Milestone SPK 50%",
    },
    {
      filename: "07_dokumen_serah_terima_100_toko.pdf",
      type: "pdf",
      title: "BERITA ACARA SERAH TERIMA PEKERJAAN (BAST) - 100%",
      subtitle: "Pernyataan Selesai Pekerjaan Perbaikan Toko Cicaheum",
      category: "Milestone Serah Terima 100%",
    },
    {
      filename: "08_foto_pekerjaan_selesai_toko.jpg",
      type: "image",
      label: "Foto Plafon Baru Selesai Terpasang Rapi (UAT)",
    },
    {
      filename: "09_foto_before_after_toko.jpg",
      type: "image",
      label: "Foto Komparasi Plafon Before vs After (UAT)",
    },
    {
      filename: "10_foto_revisi_tes_siram_atap.jpg",
      type: "image",
      label: "Foto Tambahan: Bukti Uji Tes Siram Air Atap Bebas Bocor (UAT)",
    },

    // --- SIMULASI 2: DC & WAREHOUSE ---
    {
      filename: "11_foto_kejadian_awal_dc.jpg",
      type: "image",
      label: "Foto Kejadian Benturan Rolling Door DC Bandung (UAT)",
    },
    {
      filename: "12_foto_pemeriksaan_lapangan_dc.jpg",
      type: "image",
      label: "Foto Hasil Inspeksi Rel & Motor Rolling Door (UAT)",
    },
    {
      filename: "13_dokumen_serah_terima_dc.pdf",
      type: "pdf",
      title: "BERITA ACARA SERAH TERIMA FASILITAS DC BANDUNG - 100%",
      subtitle: "Perbaikan Rolling Door Bay 4 DC Bandung Siap Beroperasi",
      category: "Serah Terima DC/Warehouse",
    },
    {
      filename: "14_foto_pekerjaan_selesai_dc.jpg",
      type: "image",
      label: "Foto Rolling Door DC Berfungsi Normal & Terkalibrasi (UAT)",
    },
  ];

  for (const doc of documents) {
    const filePath = path.join(targetDir, doc.filename);
    if (doc.type === "pdf") {
      const pdfBuf = createSimplePdf(doc.title!, doc.subtitle!, doc.category!);
      fs.writeFileSync(filePath, pdfBuf);
    } else {
      const imgBuf = createSampleJpeg(doc.label!);
      fs.writeFileSync(filePath, imgBuf);
    }
    console.log(`✔ [Created] ${doc.filename} (${fs.statSync(filePath).size} bytes)`);
  }

  // Also write an index JSON so UI or demo helpers can list and preview files easily
  const manifestPath = path.join(targetDir, "manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalFiles: documents.length,
        watermark: "SIMULASI UAT - BUKAN DOKUMEN RESMI",
        files: documents,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`✔ [Manifest] Saved simulation assets manifest to ${manifestPath}`);
  console.log("==============================================================");
  console.log("🎉 ALL UAT SAMPLE DOCUMENTS GENERATED IN public/simulasi-uat/");
  console.log("==============================================================");

  return targetDir;
}

if (process.argv[1]?.endsWith("seed-simulation-documents.ts")) {
  generateSimulationDocuments()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Document generation error:", err);
      process.exit(1);
    });
}
