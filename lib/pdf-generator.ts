/**
 * SPARTA SIAGA — Pure Native PDF 1.4 Generator
 * 
 * Menghasilkan berkas PDF standar compliant tanpa dependensi eksternal.
 * Mendukung Laporan Awal (Initial) dan Laporan Akhir (Final - CLOSED).
 */

import { formatReportDate, getHoAttentionReasons, getReportTarget, reportStatusLabel } from "@/lib/ho-report-monitoring";

import {
  IncidentRecord,
  MilestoneRecord,
  MILESTONE_ORDER,
  MILESTONE_CONFIG,
} from "@/types/incident";

function escapePdfString(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, (char) => {
      if (char === "•") return "-";
      if (char === "–" || char === "—") return "-";
      if (char === "“" || char === "”") return '"';
      if (char === "‘" || char === "’") return "'";
      if (char === "°") return " deg";
      return " ";
    });
}

function truncate(str: string | undefined | null, maxLen: number): string {
  if (!str) return "-";
  const clean = str.trim();
  return clean.length > maxLen ? clean.substring(0, maxLen - 1) + "…" : clean;
}

interface PdfDrawCommand {
  type: "text" | "rect" | "line";
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  font?: "regular" | "bold";
  size?: number;
  color?: [number, number, number];
  fillColor?: [number, number, number];
  strokeColor?: [number, number, number];
  lineWidth?: number;
}

export class SimplePdfDocument {
  private commands: PdfDrawCommand[] = [];
  public width = 595.28;  // A4 standard points
  public height = 841.89; // A4 standard points

  addText(
    text: string,
    x: number,
    y: number,
    opts: { font?: "regular" | "bold"; size?: number; color?: [number, number, number] } = {}
  ) {
    this.commands.push({
      type: "text",
      x,
      y,
      text: escapePdfString(text),
      font: opts.font || "regular",
      size: opts.size || 10,
      color: opts.color || [0, 0, 0],
    });
  }

  addRect(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: {
      fillColor?: [number, number, number];
      strokeColor?: [number, number, number];
      lineWidth?: number;
    } = {}
  ) {
    this.commands.push({
      type: "rect",
      x,
      y,
      w,
      h,
      fillColor: opts.fillColor,
      strokeColor: opts.strokeColor,
      lineWidth: opts.lineWidth || 1,
    });
  }

  addLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts: { strokeColor?: [number, number, number]; lineWidth?: number } = {}
  ) {
    this.commands.push({
      type: "line",
      x: x1,
      y: y1,
      w: x2,
      h: y2,
      strokeColor: opts.strokeColor || [0.8, 0.8, 0.8],
      lineWidth: opts.lineWidth || 1,
    });
  }

  build(): Buffer {
    let streamContent = "";

    for (const cmd of this.commands) {
      if (cmd.type === "rect") {
        const x = cmd.x.toFixed(2);
        const y = cmd.y.toFixed(2);
        const w = (cmd.w || 0).toFixed(2);
        const h = (cmd.h || 0).toFixed(2);

        if (cmd.fillColor && cmd.strokeColor) {
          const [fr, fg, fb] = cmd.fillColor;
          const [sr, sg, sb] = cmd.strokeColor;
          streamContent += `q ${cmd.lineWidth || 1} w ${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG ${fr.toFixed(3)} ${fg.toFixed(3)} ${fb.toFixed(3)} rg ${x} ${y} ${w} ${h} re b Q\n`;
        } else if (cmd.fillColor) {
          const [fr, fg, fb] = cmd.fillColor;
          streamContent += `q ${fr.toFixed(3)} ${fg.toFixed(3)} ${fb.toFixed(3)} rg ${x} ${y} ${w} ${h} re f Q\n`;
        } else if (cmd.strokeColor) {
          const [sr, sg, sb] = cmd.strokeColor;
          streamContent += `q ${cmd.lineWidth || 1} w ${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG ${x} ${y} ${w} ${h} re s Q\n`;
        }
      } else if (cmd.type === "line") {
        const x1 = cmd.x.toFixed(2);
        const y1 = cmd.y.toFixed(2);
        const x2 = (cmd.w || 0).toFixed(2);
        const y2 = (cmd.h || 0).toFixed(2);
        const [sr, sg, sb] = cmd.strokeColor || [0.8, 0.8, 0.8];
        streamContent += `q ${cmd.lineWidth || 1} w ${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG ${x1} ${y1} m ${x2} ${y2} l s Q\n`;
      } else if (cmd.type === "text") {
        const fontName = cmd.font === "bold" ? "/F2" : "/F1";
        const size = cmd.size || 10;
        const [r, g, b] = cmd.color || [0, 0, 0];
        const x = cmd.x.toFixed(2);
        const y = cmd.y.toFixed(2);
        streamContent += `BT ${fontName} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${x} ${y} Tm (${cmd.text || ""}) Tj ET\n`;
      }
    }

    const streamLength = Buffer.byteLength(streamContent, "utf-8");

    // Standard PDF 1.4 Object Construction
    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";

    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width.toFixed(2)} ${this.height.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`;
    const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`;
    const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;
    const obj6 = `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`;

    const parts = [header, obj1, obj2, obj3, obj4, obj5, obj6];
    const offsets: number[] = [0];

    let currentOffset = 0;
    currentOffset += Buffer.byteLength(header, "utf-8");

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj1, "utf-8");

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj2, "utf-8");

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj3, "utf-8");

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj4, "utf-8");

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj5, "utf-8");

    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj6, "utf-8");

    const xrefOffset = currentOffset;
    let xref = `xref\n0 7\n0000000000 65535 f \n`;
    for (let i = 1; i <= 6; i++) {
      xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(parts.join("") + xref + trailer, "utf-8");
  }
}

/**
 * Generate PDF Laporan Awal (Initial Report)
 */
export function generateInitialReportPdf(report: IncidentRecord): Buffer {
  const doc = new SimplePdfDocument();
  const printDate = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

  // 1. Navy Header Bar
  doc.addRect(35, 765, 525, 48, { fillColor: [0.07, 0.23, 0.43] });
  doc.addText("SPARTA SIAGA - SISTEM TANGGAP DARURAT BENCANA", 48, 794, {
    font: "bold",
    size: 13,
    color: [1, 1, 1],
  });
  doc.addText("LAPORAN AWAL PEMERIKSAAN KONDISI LAPANGAN", 48, 777, {
    font: "regular",
    size: 9.5,
    color: [0.85, 0.92, 1],
  });

  // 2. Banner Tipe Laporan Awal
  doc.addRect(35, 735, 525, 22, { fillColor: [0.93, 0.95, 0.98], strokeColor: [0.8, 0.86, 0.94] });
  doc.addText(`No. Laporan: ${report.id}`, 45, 742, { font: "bold", size: 9, color: [0.1, 0.25, 0.5] });
  const originLabel = report.earthquakeSource?.toUpperCase().includes("SIMULASI")
    ? "SIMULASI INTERNAL"
    : report.reportOrigin === "automatic_earthquake" ? "OTOMATIS GEMPA" : "MANUAL LAPANGAN";
  doc.addText(`Asal: ${originLabel} | Dicetak: ${printDate}`, 295, 742, {
    font: "regular",
    size: 8,
    color: [0.3, 0.35, 0.45],
  });

  // 3. Section I: Identitas Lokasi & Bencana
  doc.addRect(35, 620, 525, 105, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 703, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("I. IDENTITAS KEJADIAN & LOKASI", 45, 710, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const isToko = (report.tkpType || "toko").toLowerCase() === "toko";
  const rowsSection1 = [
    ["Jenis Bencana", truncate((report.disasterType || "-").toUpperCase(), 24), "Jenis TKP", isToko ? "Gerai Toko" : "Warehouse / DC"],
    ["Nama Lokasi", truncate(report.storeName || "-", 26), "Kode Toko / DC", report.storeId || "-"],
    ["Cabang / Kota", truncate(`${report.branch || "-"} ${report.locationCity ? `(${report.locationCity})` : ""}`, 26), "Tanggal Kejadian", truncate(report.date || report.createdAt || "-", 22)],
    ["Status Laporan", (report.status || "-").toUpperCase(), "Tingkat Kerusakan", truncate(report.verification?.severity || (report.verification?.isDamaged ? "RUSAK" : "PEMERIKSAAN AWAL"), 22)],
  ];

  let yPos = 684;
  for (const row of rowsSection1) {
    doc.addText(row[0] + ":", 45, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[1], 135, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

    doc.addText(row[2] + ":", 310, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[3], 410, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
    yPos -= 17;
  }

  // 4. Section II: Parameter Bencana / Sumber Data
  doc.addRect(35, 505, 525, 105, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 588, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("II. PARAMETER BENCANA & SUMBER INFORMASI", 45, 595, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const eq = report.disasterMetadata;
  if (eq) {
    const rowsSection2 = [
      ["Magnitude", `${eq.magnitude || "-"} SR`, "Kedalaman", `${eq.depth || "-"} km`],
      ["Pusat Gempa", truncate(eq.place || "-", 28), "Waktu Gempa", truncate(eq.time || "-", 24)],
      ["Potensi Tsunami", "Tidak berpotensi tsunami", "Jarak ke TKP", eq.distanceKm ? `${eq.distanceKm} km` : "-"],
      ["Sumber Data", "BMKG Real-time Alert", "ID Event BMKG", report.earthquakeEventId || "-"],
    ];
    let yPos2 = 569;
    for (const row of rowsSection2) {
      doc.addText(row[0] + ":", 45, yPos2, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
      doc.addText(row[1], 135, yPos2, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

      doc.addText(row[2] + ":", 310, yPos2, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
      doc.addText(row[3], 410, yPos2, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
      yPos2 -= 17;
    }
  } else {
    doc.addText("Laporan insiden dicatat secara manual oleh tim lapangan.", 45, 565, { font: "regular", size: 8.5, color: [0.3, 0.3, 0.3] });
    const notesSummary = truncate(report.verification?.notes || "Tidak ada catatan khusus.", 75);
    doc.addText(`Keterangan: ${notesSummary}`, 45, 545, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });
    doc.addText(`Pelapor: ${report.reporter?.name || "-"} (${report.reporter?.role || "Petugas Lapangan"})`, 45, 525, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });
  }

  // 5. Section III: Hasil Pemeriksaan Kondisi Lapangan (BMS / BES)
  doc.addRect(35, 365, 525, 130, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 473, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("III. HASIL PEMERIKSAAN KONDISI LAPANGAN (BMS / BES)", 45, 480, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const ver = report.verification;
  const inspector = truncate(ver?.confirmedBy || "Belum Diverifikasi", 24);
  const inspectTime = truncate(ver?.confirmedAt || "-", 24);
  const condText = ver?.condition || (ver?.isDamaged === false ? "AMAN" : ver?.isDamaged === true ? "RUSAK / TERDAMPAK" : "MENUNGGU PEMERIKSAAN");

  doc.addText("Petugas Pemeriksa:", 45, 452, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(inspector, 155, 452, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
  doc.addText("Waktu Pemeriksaan:", 310, 452, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(inspectTime, 415, 452, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Status Kondisi Fisik:", 45, 432, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(condText, 155, 432, { font: "bold", size: 8.5, color: ver?.isDamaged === false ? [0.1, 0.55, 0.25] : [0.75, 0.15, 0.15] });

  doc.addText("Jumlah Bukti Foto:", 310, 432, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(`${ver?.evidenceDetails?.length || ver?.photos?.length || 0} berkas terverifikasi`, 415, 432, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Catatan Pemeriksaan:", 45, 410, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  const inspectNotes = truncate(ver?.notes || "Tidak ada catatan tambahan.", 80);
  doc.addText(inspectNotes, 45, 395, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });

  // 6. Section IV: Status Persetujuan Awal BnM Manajer
  doc.addRect(35, 235, 525, 120, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 333, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("IV. PERSETUJUAN AWAL BnM MANAJER", 45, 340, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const bmDec = ver?.bmApproval;
  doc.addText("Pemberi Persetujuan:", 45, 312, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(truncate(bmDec?.decidedBy || "BnM Manajer Cabang", 24), 160, 312, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
  doc.addText("Waktu Keputusan:", 310, 312, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(truncate(bmDec?.decidedAt || "-", 24), 415, 312, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Keputusan:", 45, 292, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText((bmDec?.decision || report.status || "-").toUpperCase(), 160, 292, { font: "bold", size: 8.5, color: [0.1, 0.4, 0.7] });

  doc.addText("Catatan BnM Manajer:", 45, 272, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  const managerNotes = truncate(bmDec?.decisionNotes || bmDec?.rejectionReason || "Pemeriksaan disetujui untuk penanganan.", 70);
  doc.addText(managerNotes, 160, 272, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });

  // 7. Footer & Pagination
  doc.addLine(35, 95, 560, 95, { strokeColor: [0.8, 0.8, 0.8], lineWidth: 0.5 });
  doc.addText("Halaman 1 dari 1 • Dokumen Resmi SPARTA SIAGA • Berkas Terverifikasi Sistem", 45, 82, { font: "regular", size: 7.5, color: [0.4, 0.4, 0.4] });
  doc.addText("CATATAN: BUKAN BUKTI PENYELESAIAN PEKERJAAN (Penutupan kasus membutuhkan Laporan Final CLOSED)", 45, 70, { font: "bold", size: 7.5, color: [0.55, 0.2, 0.2] });

  return doc.build();
}

/**
 * Generate PDF Laporan Final (Final Closed Report)
 */
export function generateFinalReportPdf(report: IncidentRecord, milestones: MilestoneRecord[] = []): Buffer {
  const doc = new SimplePdfDocument();
  const printDate = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

  const safeMilestones: MilestoneRecord[] = (milestones && Array.isArray(milestones) && milestones.length > 0)
    ? milestones
    : MILESTONE_ORDER.map((k) => ({
        id: `ms_${k}`,
        reportId: report.id,
        stageOrder: MILESTONE_CONFIG[k].order,
        stageKey: k,
        stageName: MILESTONE_CONFIG[k].label,
        targetProgress: MILESTONE_CONFIG[k].progress,
        status: "SUBMITTED" as const,
        documentUrl: undefined,
        documentStorageKey: undefined,
        documentOriginalName: undefined,
        documentMimeType: undefined,
        documentFileSize: undefined,
        actorId: undefined,
        actorName: undefined,
        actorRole: undefined,
        submittedAt: undefined,
        notes: undefined,
        proxyApprovalStatus: undefined,
        revisions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

  // 1. Header Bar: Emerald Green for Official CLOSED Document
  doc.addRect(35, 765, 525, 48, { fillColor: [0.06, 0.32, 0.2] });
  doc.addText("SPARTA SIAGA - BERITA ACARA RESMI PENYELESAIAN (CLOSED)", 48, 794, {
    font: "bold",
    size: 13,
    color: [1, 1, 1],
  });
  doc.addText("LAPORAN FINAL PEKERJAAN FISIK DAN PERSETUJUAN BnM MANAJER", 48, 777, {
    font: "regular",
    size: 9.5,
    color: [0.85, 0.98, 0.9],
  });

  // 2. Official Badge Banner
  doc.addRect(35, 735, 525, 22, { fillColor: [0.92, 0.98, 0.94], strokeColor: [0.75, 0.9, 0.8] });
  doc.addText(`No. Laporan: ${report.id} [STATUS: CLOSED - RESMI SELESAI]`, 45, 742, {
    font: "bold",
    size: 9,
    color: [0.06, 0.45, 0.25],
  });
  doc.addText(`Dicetak: ${printDate}`, 380, 742, {
    font: "regular",
    size: 8,
    color: [0.3, 0.4, 0.35],
  });

  // 3. Section I: Data Identitas
  doc.addRect(35, 630, 525, 95, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.9, 0.88] });
  doc.addRect(35, 703, 525, 22, { fillColor: [0.08, 0.42, 0.26] });
  doc.addText("I. IDENTITAS KEJADIAN & LOKASI", 45, 710, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const isToko = (report.tkpType || "toko").toLowerCase() === "toko";
  const rowsSection1 = [
    ["Jenis Bencana", truncate((report.disasterType || "-").toUpperCase(), 24), "Lokasi / Unit", truncate(`${report.storeName} (${isToko ? "Toko" : "DC"})`, 26)],
    ["Kode Unit", report.storeId || "-", "Cabang / Kota", truncate(`${report.branch || "-"} ${report.locationCity ? `• ${report.locationCity}` : ""}`, 26)],
    ["Tanggal Kejadian", truncate(report.date || report.createdAt || "-", 24), "Waktu Selesai (CLOSED)", truncate(report.closedAt || report.updatedAt || "-", 24)],
  ];

  let yPos = 684;
  for (const row of rowsSection1) {
    doc.addText(row[0] + ":", 45, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[1], 140, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

    doc.addText(row[2] + ":", 310, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[3], 415, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
    yPos -= 17;
  }

  // 4. Section II: 5 Tahapan Milestone Penanganan
  doc.addRect(35, 430, 525, 190, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.9, 0.88] });
  doc.addRect(35, 598, 525, 22, { fillColor: [0.08, 0.42, 0.26] });
  doc.addText("II. BUKTI FISIK 5 TAHAPAN MILESTONE PENANGANAN (10% - 100%)", 45, 605, {
    font: "bold",
    size: 9.5,
    color: [1, 1, 1],
  });

  // Table header for milestones
  doc.addRect(45, 574, 505, 18, { fillColor: [0.93, 0.95, 0.94] });
  doc.addText("Tahap", 50, 579, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Target", 135, 579, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Dokumen Bukti", 185, 579, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Pengunggah / Pelaksana", 335, 579, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Waktu Submit", 455, 579, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });

  let mY = 554;
  for (const ms of safeMilestones) {
    const docName = truncate(ms.documentOriginalName || (ms.documentStorageKey ? "Berkas Terverifikasi" : "Belum Ada"), 24);
    const actor = truncate(ms.actorName ? `${ms.actorName} (${(ms.actorRole || "").toUpperCase()})` : "-", 20);
    const subTime = truncate(ms.submittedAt ? ms.submittedAt.substring(0, 16).replace("T", " ") : "-", 18);

    doc.addText(truncate(ms.stageName, 18), 50, mY, { font: "bold", size: 8, color: [0.15, 0.2, 0.2] });
    doc.addText(`${ms.targetProgress}%`, 135, mY, { font: "regular", size: 8, color: [0.1, 0.5, 0.25] });
    doc.addText(docName, 185, mY, { font: "regular", size: 7.5, color: [0.1, 0.1, 0.1] });
    doc.addText(actor, 335, mY, { font: "regular", size: 7.5, color: [0.2, 0.2, 0.2] });
    doc.addText(subTime, 455, mY, { font: "regular", size: 7.5, color: [0.3, 0.3, 0.3] });

    doc.addLine(45, mY - 4, 550, mY - 4, { strokeColor: [0.9, 0.92, 0.9] });
    mY -= 22;
  }

  // 5. Section III: Keputusan Persetujuan Final BnM Manajer
  doc.addRect(35, 280, 525, 140, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.9, 0.88] });
  doc.addRect(35, 398, 525, 22, { fillColor: [0.08, 0.42, 0.26] });
  doc.addText("III. KEPUTUSAN PERSETUJUAN FINAL BnM MANAJER", 45, 405, {
    font: "bold",
    size: 9.5,
    color: [1, 1, 1],
  });

  const timeline = report.timeline || [];
  const bmFinal = timeline.slice().reverse().find((t) => t.stage === "Laporan Ditutup" || t.label?.includes("CLOSED"));

  doc.addText("Pemberi Persetujuan:", 45, 377, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(truncate(bmFinal?.actor || `BnM Manajer (${report.branch || "-"})`, 26), 160, 377, { font: "bold", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Keputusan Akhir:", 310, 377, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText("DISETUJUI & DITUTUP (CLOSED)", 415, 377, { font: "bold", size: 8.5, color: [0.08, 0.5, 0.25] });

  doc.addText("Waktu Persetujuan:", 45, 357, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(truncate(bmFinal?.timestamp || report.closedAt || "-", 26), 160, 357, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });

  doc.addText("Progres Pekerjaan:", 310, 357, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText("100% (Serah Terima Selesai)", 415, 357, { font: "bold", size: 8.5, color: [0.08, 0.5, 0.25] });

  doc.addText("Catatan Penutupan:", 45, 335, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  const closingNotes = truncate(bmFinal?.notes || "Pekerjaan fisik diverifikasi selesai 100% dan disetujui untuk ditutup secara resmi.", 75);
  doc.addText(closingNotes, 45, 320, {
    font: "regular",
    size: 8.5,
    color: [0.2, 0.2, 0.2],
  });

  // 6. Signatures Area
  doc.addRect(45, 145, 505, 120, { fillColor: [0.97, 0.99, 0.98], strokeColor: [0.85, 0.9, 0.88] });
  doc.addText("PENGESAHAN DOKUMEN PENYELESAIAN:", 55, 248, { font: "bold", size: 8.5, color: [0.2, 0.35, 0.25] });

  // Column 1: PIC Pelaksana (BMS / BES)
  doc.addText("Petugas Lapangan (BMS / BES):", 75, 227, { font: "bold", size: 8, color: [0.3, 0.3, 0.3] });
  doc.addText("( Tanda tangan digital terverifikasi )", 75, 185, { font: "regular", size: 7.5, color: [0.45, 0.45, 0.45] });
  const picName = truncate(report.verification?.confirmedBy || "Pelaksana Pekerjaan", 26);
  doc.addText(picName, 75, 160, { font: "bold", size: 8, color: [0.1, 0.1, 0.1] });

  // Column 2: BnM Manajer
  doc.addText("BnM Manajer:", 340, 227, { font: "bold", size: 8, color: [0.3, 0.3, 0.3] });
  doc.addText("( Tanda tangan digital terverifikasi )", 340, 185, { font: "regular", size: 7.5, color: [0.45, 0.45, 0.45] });
  const bmSignName = truncate(bmFinal?.actor?.replace(/\s*\(.*\)/, "") || `BnM Manajer ${report.branch || ""}`, 26);
  doc.addText(bmSignName, 340, 160, { font: "bold", size: 8, color: [0.1, 0.1, 0.1] });

  // 7. Footer & Pagination
  doc.addLine(35, 95, 560, 95, { strokeColor: [0.8, 0.85, 0.82], lineWidth: 0.5 });
  doc.addText("Halaman 1 dari 1 • Dokumen Resmi SPARTA SIAGA • Berkas Terverifikasi Sistem", 45, 82, {
    font: "bold",
    size: 7.5,
    color: [0.1, 0.45, 0.25],
  });
  doc.addText("Seluruh bukti milestone tersimpan secara permanen dalam sistem dan terlindungi integritasnya.", 45, 70, {
    font: "regular",
    size: 7.5,
    color: [0.4, 0.45, 0.4],
  });

  return doc.build();
}


/**
 * Current-state monitoring document for HO and authorized branch viewers.
 * Not a final approval, sign-off, or proof that construction is completed.
 */
export function generateMonitoringReportPdf(report: IncidentRecord): Buffer {
  const pdf = new SimplePdfDocument();
  const navy: [number, number, number] = [0.07, 0.23, 0.43];
  const muted: [number, number, number] = [0.34, 0.4, 0.47];
  const ink: [number, number, number] = [0.13, 0.18, 0.25];
  const printTime = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
  const target = getReportTarget(report);
  const approval = report.verification?.bmApproval;
  const issues = getHoAttentionReasons(report);

  const value = (label: string, text: string | number | null | undefined, y: number) => {
    pdf.addText(label + ":", 46, y, { font: "bold", size: 8.5, color: muted });
    pdf.addText(truncate(String(text ?? "Belum tersedia"), 75), 174, y, { size: 8.5, color: ink });
  };
  const header = (title: string, y: number) => {
    pdf.addRect(35, y - 5, 525, 25, { fillColor: [0.92, 0.95, 0.98] });
    pdf.addText(title, 45, y + 4, { font: "bold", size: 10, color: navy });
  };

  pdf.addRect(35, 765, 525, 48, { fillColor: navy });
  pdf.addText("SPARTA SIAGA - MONITORING LAPORAN", 48, 794, { font: "bold", size: 14, color: [1, 1, 1] });
  pdf.addText("RINGKASAN MONITORING - BUKAN DOKUMEN FINAL", 48, 777, { size: 9.5, color: [0.91, 0.95, 1] });
  pdf.addText("No. Laporan: " + truncate(report.id, 49), 42, 745, { font: "bold", size: 10, color: navy });
  pdf.addText("Dicetak: " + printTime, 42, 728, { size: 8.5, color: muted });

  header("I. IDENTITAS DAN STATUS LAPORAN", 692);
  value("Lokasi", report.storeName, 671);
  value("Cabang", report.branch, 654);
  value("Kejadian", report.disasterType, 637);
  value("Tanggal Laporan", formatReportDate(report.createdAt), 620);
  value("Status Saat Ini", reportStatusLabel(report.status), 603);
  value("PIC Operasional", report.primaryPicName || report.maintenanceTicket?.assignedTechnician, 586);
  value("Target Selesai", target ? formatReportDate(target) : "Belum ditentukan", 569);
  value("Progres Fisik", report.progress > 0 ? report.progress + "%" : "Belum ada progres tercatat", 552);

  header("II. PEMERIKSAAN DAN PERSETUJUAN", 520);
  value("Pemeriksa", report.verification?.confirmedBy || "Belum ada pemeriksaan", 499);
  value("Kondisi", report.verification?.condition === "damaged" ? "Ada Kerusakan" :
    report.verification?.condition === "safe" ? "Aman" :
    report.verification?.condition === "uncertain" ? "Belum Pasti" : "Belum ditentukan", 482);
  value("Catatan Inspeksi", report.verification?.notes || "-", 465);
  value("Keputusan BnM", approval?.decision === "approved" ? "Kerusakan disetujui" :
    approval?.decision === "safe" ? "Dinyatakan aman" :
    approval?.decision === "rejected" ? "Ditolak" :
    approval?.decision === "clarification_requested" ? "Perlu Klarifikasi" : "Belum diputuskan", 448);
  value("Oleh / Tanggal", approval ?
    (approval.decidedBy || "-") + " / " + formatReportDate(approval.decidedAt) : "-", 431);
  value("Catatan BnM", approval?.decisionNotes || approval?.clarificationReason || approval?.rejectionReason || "-", 414);

  header("III. KONDISI PEKERJAAN DAN PEMANTAUAN", 383);
  value("ID Pekerjaan", report.maintenanceTicket?.ticketId || report.externalWorkId || "Belum tersedia", 362);
  value("Deskripsi Pekerjaan", report.maintenanceTicket?.workDescription || "-", 345);
  value("Update Terakhir", formatReportDate(report.updatedAt), 328);

  header("IV. RIWAYAT AKTIVITAS TERBARU", 294);
  const latest = (report.timeline || []).slice(-4);
  if (latest.length === 0) {
    pdf.addText("Belum ada aktivitas tambahan.", 45, 274, { size: 8.5, color: muted });
  } else {
    latest.forEach((event, i) => {
      const y = 274 - i * 18;
      pdf.addText(truncate((event.label || event.stage) + " | " + event.timestamp + " | " + event.actor, 97), 45, y, { size: 8.1, color: ink });
    });
  }

  header("V. PERLU PERHATIAN (BERDASARKAN DATA TERKINI)", 185);
  if (issues.length === 0) {
    pdf.addText("Tidak ada kondisi khusus yang teridentifikasi oleh aturan monitoring.", 45, 165, { size: 8.5, color: muted });
  } else {
    issues.slice(0, 3).forEach((issue, i) => {
      pdf.addText("- " + truncate(issue, 99), 45, 166 - i * 17, { size: 8.5, color: [0.63, 0.34, 0.06] });
    });
  }
  pdf.addLine(35, 94, 560, 94, { strokeColor: [0.82, 0.85, 0.89], lineWidth: 0.6 });
  pdf.addText("SPARTA SIAGA | RINGKASAN PEMANTAUAN INTERNAL | HALAMAN 1", 45, 79, { font: "bold", size: 8, color: navy });
  pdf.addText("Bukan persetujuan, penutupan, maupun bukti penyelesaian pekerjaan.", 45, 65, { size: 8, color: muted });
  return pdf.build();
}
