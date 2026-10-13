/**
 * SPARTA SIAGA — Pure Native PDF 1.4 Generator
 * 
 * Menghasilkan berkas PDF standar compliant tanpa dependensi eksternal.
 * Mendukung Laporan Awal (Initial) dan Laporan Akhir (Final - CLOSED).
 */

import { IncidentRecord, MilestoneRecord } from "@/types/incident";

function escapePdfString(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, (char) => {
      // Convert common unicode characters to plain ASCII
      if (char === "•") return "-";
      if (char === "–" || char === "—") return "-";
      if (char === "“" || char === "”") return '"';
      if (char === "‘" || char === "’") return "'";
      if (char === "°") return " deg";
      return " ";
    });
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
    // Calculate offsets for objects 1..6
    currentOffset += Buffer.byteLength(header, "utf-8");

    offsets.push(currentOffset); // obj 1
    currentOffset += Buffer.byteLength(obj1, "utf-8");

    offsets.push(currentOffset); // obj 2
    currentOffset += Buffer.byteLength(obj2, "utf-8");

    offsets.push(currentOffset); // obj 3
    currentOffset += Buffer.byteLength(obj3, "utf-8");

    offsets.push(currentOffset); // obj 4
    currentOffset += Buffer.byteLength(obj4, "utf-8");

    offsets.push(currentOffset); // obj 5
    currentOffset += Buffer.byteLength(obj5, "utf-8");

    offsets.push(currentOffset); // obj 6
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
    size: 10,
    color: [0.85, 0.92, 1],
  });

  // 2. Banner Tipe Laporan Awal
  doc.addRect(35, 735, 525, 22, { fillColor: [0.93, 0.95, 0.98], strokeColor: [0.8, 0.86, 0.94] });
  doc.addText(`No. Laporan: ${report.id}`, 45, 742, { font: "bold", size: 9, color: [0.1, 0.25, 0.5] });
  const originLabel = report.reportOrigin === "automatic_earthquake" ? "OTOMATIS BMKG" : "MANUAL LAPANGAN";
  doc.addText(`Asal: ${originLabel} | Tanggal Cetak: ${printDate}`, 300, 742, {
    font: "regular",
    size: 8.5,
    color: [0.3, 0.35, 0.45],
  });

  // 3. Section I: Identitas Lokasi & Bencana
  doc.addRect(35, 615, 525, 110, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 703, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("I. IDENTITAS KEJADIAN & LOKASI", 45, 710, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const isToko = (report.tkpType || "toko").toLowerCase() === "toko";
  const rowsSection1 = [
    ["Jenis Bencana", (report.disasterType || "-").toUpperCase(), "Jenis TKP", isToko ? "Gerai Toko" : "Warehouse / DC"],
    ["Nama Lokasi", report.storeName || "-", "Kode Toko / DC", report.storeId || "-"],
    ["Cabang / Kota", `${report.branch || "-"} ${report.locationCity ? `(${report.locationCity})` : ""}`, "Tanggal Kejadian", report.date || report.createdAt || "-"],
    ["Status Laporan", (report.status || "-").toUpperCase(), "Tingkat Kerusakan", report.verification?.severity || (report.verification?.isDamaged ? "RUSAK" : "DALAM PEMERIKSAAN")],
  ];

  let yPos = 684;
  for (const row of rowsSection1) {
    doc.addText(row[0] + ":", 45, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[1], 135, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

    doc.addText(row[2] + ":", 310, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[3], 410, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
    yPos -= 17;
  }

  // 4. Section II: Data Gempa BMKG (jika ada) atau Parameter Bencana
  doc.addRect(35, 495, 525, 110, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 583, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("II. PARAMETER BENCANA & SUMBER INFORMASI", 45, 590, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const eq = report.disasterMetadata;
  if (eq) {
    const rowsSection2 = [
      ["Magnitude", `${eq.magnitude || "-"} SR`, "Kedalaman", `${eq.depth || "-"} km`],
      ["Pusat Gempa", eq.place || "-", "Waktu Gempa", eq.time || "-"],
      ["Potensi Tsunami", "Tidak berpotensi tsunami", "Jarak ke TKP", eq.distanceKm ? `${eq.distanceKm} km` : "-"],
      ["Sumber Data", "BMKG Real-time Alert", "ID Event BMKG", report.earthquakeEventId || "-"],
    ];
    let yPos2 = 564;
    for (const row of rowsSection2) {
      doc.addText(row[0] + ":", 45, yPos2, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
      doc.addText(row[1], 135, yPos2, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

      doc.addText(row[2] + ":", 310, yPos2, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
      doc.addText(row[3], 410, yPos2, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
      yPos2 -= 17;
    }
  } else {
    doc.addText("Laporan insiden dicatat secara manual oleh tim lapangan.", 45, 555, { font: "regular", size: 9, color: [0.3, 0.3, 0.3] });
    doc.addText(`Keterangan: ${report.verification?.notes || "Tidak ada catatan khusus."}`, 45, 535, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });
    doc.addText(`Pelapor: ${report.reporter?.name || "-"} (${report.reporter?.role || "Petugas Lapangan"})`, 45, 515, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });
  }

  // 5. Section III: Hasil Pemeriksaan Kondisi Lapangan (BMS / BES)
  doc.addRect(35, 345, 525, 140, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 463, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("III. HASIL PEMERIKSAAN KONDISI LAPANGAN (BMS / BES)", 45, 470, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const ver = report.verification;
  const inspector = ver?.confirmedBy || "Belum Diverifikasi";
  const inspectTime = ver?.confirmedAt || "-";
  const condText = ver?.condition || (ver?.isDamaged === false ? "AMAN" : ver?.isDamaged === true ? "RUSAK / TERDAMPAK" : "MENUNGGU PEMERIKSAAN");

  doc.addText("Petugas Pemeriksa:", 45, 444, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(inspector, 155, 444, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
  doc.addText("Waktu Pemeriksaan:", 310, 444, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(inspectTime, 410, 444, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Status Kondisi Fisik:", 45, 425, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(condText, 155, 425, { font: "bold", size: 8.5, color: ver?.isDamaged === false ? [0.1, 0.55, 0.25] : [0.75, 0.15, 0.15] });

  doc.addText("Jumlah Bukti Foto:", 310, 425, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(`${ver?.evidenceDetails?.length || ver?.photos?.length || 0} berkas terverifikasi`, 410, 425, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Catatan Pemeriksaan:", 45, 404, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  const inspectNotes = ver?.notes || "Tidak ada catatan tambahan.";
  doc.addText(inspectNotes.substring(0, 85), 45, 390, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });

  // 6. Section IV: Status Persetujuan Awal Manager Branch
  doc.addRect(35, 230, 525, 105, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.88, 0.92] });
  doc.addRect(35, 313, 525, 22, { fillColor: [0.11, 0.35, 0.65] });
  doc.addText("IV. PERSETUJUAN AWAL BRANCH MANAGER", 45, 320, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const bmDec = ver?.bmApproval;
  doc.addText("Pemberi Persetujuan:", 45, 294, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(bmDec?.decidedBy || "Branch Manager Cabang", 160, 294, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
  doc.addText("Waktu Keputusan:", 310, 294, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(bmDec?.decidedAt || "-", 410, 294, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Keputusan:", 45, 275, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText((bmDec?.decision || report.status || "-").toUpperCase(), 160, 275, { font: "bold", size: 8.5, color: [0.1, 0.4, 0.7] });

  doc.addText("Catatan Manager:", 45, 256, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(bmDec?.decisionNotes || bmDec?.rejectionReason || "Pemeriksaan disetujui untuk penanganan.", 160, 256, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });

  // 7. Footer & Disclaimer
  doc.addLine(35, 110, 560, 110, { strokeColor: [0.8, 0.8, 0.8], lineWidth: 0.5 });
  doc.addText("Dokumen ini merupakan Laporan Awal Kejadian yang sah dan diterbitkan dari sistem SPARTA SIAGA.", 45, 96, { font: "regular", size: 7.5, color: [0.4, 0.4, 0.4] });
  doc.addText("BUKAN BUKTI PENYELESAIAN PEKERJAAN (Pekerjaan fisik dan penutupan kasus membutuhkan Laporan Final CLOSED).", 45, 84, { font: "bold", size: 7.5, color: [0.5, 0.2, 0.2] });

  return doc.build();
}

/**
 * Generate PDF Laporan Final (Final Closed Report)
 */
export function generateFinalReportPdf(report: IncidentRecord, milestones: MilestoneRecord[]): Buffer {
  const doc = new SimplePdfDocument();
  const printDate = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

  // 1. Header Bar: Emerald Green for Official CLOSED Document
  doc.addRect(35, 765, 525, 48, { fillColor: [0.06, 0.32, 0.2] });
  doc.addText("SPARTA SIAGA - BERITA ACARA RESMI PENYELESAIAN (CLOSED)", 48, 794, {
    font: "bold",
    size: 13,
    color: [1, 1, 1],
  });
  doc.addText("LAPORAN FINAL PEKERJAAN FISIK DAN PERSETUJUAN BRANCH MANAGER", 48, 777, {
    font: "regular",
    size: 10,
    color: [0.85, 0.98, 0.9] });

  // 2. Official Badge Banner
  doc.addRect(35, 735, 525, 22, { fillColor: [0.92, 0.98, 0.94], strokeColor: [0.75, 0.9, 0.8] });
  doc.addText(`No. Laporan: ${report.id} [STATUS: CLOSED - SELESAI]`, 45, 742, {
    font: "bold",
    size: 9,
    color: [0.06, 0.45, 0.25],
  });
  doc.addText(`Dicetak: ${printDate}`, 430, 742, {
    font: "regular",
    size: 8.5,
    color: [0.3, 0.4, 0.35],
  });

  // 3. Section I: Data Identitas
  doc.addRect(35, 625, 525, 100, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.9, 0.88] });
  doc.addRect(35, 703, 525, 22, { fillColor: [0.08, 0.42, 0.26] });
  doc.addText("I. IDENTITAS KEJADIAN & LOKASI", 45, 710, { font: "bold", size: 9.5, color: [1, 1, 1] });

  const isToko = (report.tkpType || "toko").toLowerCase() === "toko";
  const rowsSection1 = [
    ["Jenis Bencana", (report.disasterType || "-").toUpperCase(), "Lokasi / Unit", `${report.storeName} (${isToko ? "Toko" : "DC"})`],
    ["Kode Unit", report.storeId || "-", "Cabang / Kota", `${report.branch || "-"} ${report.locationCity ? `• ${report.locationCity}` : ""}`],
    ["Tanggal Kejadian", report.date || report.createdAt || "-", "Tanggal Ditutup (CLOSED)", report.closedAt || report.updatedAt || "-"],
  ];

  let yPos = 684;
  for (const row of rowsSection1) {
    doc.addText(row[0] + ":", 45, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[1], 145, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });

    doc.addText(row[2] + ":", 310, yPos, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
    doc.addText(row[3], 420, yPos, { font: "regular", size: 8.5, color: [0.1, 0.1, 0.1] });
    yPos -= 17;
  }

  // 4. Section II: 5 Tahapan Milestone Penanganan
  doc.addRect(35, 425, 525, 190, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.9, 0.88] });
  doc.addRect(35, 593, 525, 22, { fillColor: [0.08, 0.42, 0.26] });
  doc.addText("II. BUKTI FISIK 5 TAHAPAN MILESTONE PENANGANAN (10% - 100%)", 45, 600, {
    font: "bold",
    size: 9.5,
    color: [1, 1, 1],
  });

  // Table header for milestones
  doc.addRect(45, 570, 505, 18, { fillColor: [0.93, 0.95, 0.94] });
  doc.addText("Tahap", 50, 575, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Progres", 145, 575, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Dokumen Bukti", 200, 575, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Pengunggah / Pelaksana", 345, 575, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });
  doc.addText("Waktu Submit", 460, 575, { font: "bold", size: 8, color: [0.2, 0.3, 0.25] });

  let mY = 550;
  for (const ms of milestones) {
    const docName = ms.documentOriginalName || (ms.documentStorageKey ? "Berkas Terverifikasi" : "Belum Ada");
    const actor = ms.actorName ? `${ms.actorName} (${(ms.actorRole || "").toUpperCase()})` : "-";
    const subTime = ms.submittedAt ? ms.submittedAt.substring(0, 16).replace("T", " ") : "-";

    doc.addText(ms.stageName, 50, mY, { font: "bold", size: 8, color: [0.15, 0.2, 0.2] });
    doc.addText(`${ms.targetProgress}%`, 145, mY, { font: "regular", size: 8, color: [0.1, 0.5, 0.25] });
    doc.addText(docName.substring(0, 24), 200, mY, { font: "regular", size: 7.5, color: [0.1, 0.1, 0.1] });
    doc.addText(actor.substring(0, 20), 345, mY, { font: "regular", size: 7.5, color: [0.2, 0.2, 0.2] });
    doc.addText(subTime, 460, mY, { font: "regular", size: 7.5, color: [0.3, 0.3, 0.3] });

    doc.addLine(45, mY - 4, 550, mY - 4, { strokeColor: [0.9, 0.92, 0.9] });
    mY -= 22;
  }

  // 5. Section III: Keputusan Persetujuan Final Branch Manager
  doc.addRect(35, 275, 525, 140, { fillColor: [1, 1, 1], strokeColor: [0.85, 0.9, 0.88] });
  doc.addRect(35, 393, 525, 22, { fillColor: [0.08, 0.42, 0.26] });
  doc.addText("III. KEPUTUSAN PERSETUJUAN FINAL BRANCH MANAGER", 45, 400, {
    font: "bold",
    size: 9.5,
    color: [1, 1, 1],
  });

  const timeline = report.timeline || [];
  const bmFinal = timeline.slice().reverse().find((t) => t.stage === "Laporan Ditutup" || t.label?.includes("CLOSED"));

  doc.addText("Branch Manager:", 45, 374, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(bmFinal?.actor || `Branch Manager (${report.branch || "-"})`, 160, 374, { font: "bold", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.addText("Keputusan Akhir:", 310, 374, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText("DISETUJUI & DITUTUP (CLOSED)", 410, 374, { font: "bold", size: 8.5, color: [0.08, 0.5, 0.25] });

  doc.addText("Waktu Persetujuan:", 45, 354, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(bmFinal?.timestamp || report.closedAt || "-", 160, 354, { font: "regular", size: 8.5, color: [0.2, 0.2, 0.2] });

  doc.addText("Progres Pekerjaan:", 310, 354, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText("100% (Serah Terima Selesai)", 410, 354, { font: "bold", size: 8.5, color: [0.08, 0.5, 0.25] });

  doc.addText("Catatan Penutupan:", 45, 332, { font: "bold", size: 8.5, color: [0.25, 0.3, 0.35] });
  doc.addText(bmFinal?.notes || "Pekerjaan fisik diverifikasi selesai 100% dan disetujui untuk ditutup secara resmi.", 45, 318, {
    font: "regular",
    size: 8.5,
    color: [0.2, 0.2, 0.2],
  });

  // 6. Signatures Area
  doc.addRect(45, 140, 505, 120, { fillColor: [0.97, 0.99, 0.98], strokeColor: [0.85, 0.9, 0.88] });
  doc.addText("PENGESAHAN DOKUMEN PENYELESAIAN:", 55, 245, { font: "bold", size: 8.5, color: [0.2, 0.35, 0.25] });

  // Column 1: PIC Pelaksana (BMS / BES)
  doc.addText("Petugas Lapangan (BMS / BES):", 75, 225, { font: "bold", size: 8, color: [0.3, 0.3, 0.3] });
  doc.addText("( Tanda tangan digital )", 85, 180, { font: "regular", size: 7.5, color: [0.5, 0.5, 0.5] });
  const picName = report.verification?.confirmedBy || "Pelaksana Pekerjaan";
  doc.addText(picName, 75, 155, { font: "bold", size: 8, color: [0.1, 0.1, 0.1] });

  // Column 2: Branch Manager
  doc.addText("Manager Branch (BM):", 350, 225, { font: "bold", size: 8, color: [0.3, 0.3, 0.3] });
  doc.addText("( Tanda tangan digital )", 360, 180, { font: "regular", size: 7.5, color: [0.5, 0.5, 0.5] });
  const bmSignName = bmFinal?.actor?.replace(/\s*\(.*\)/, "") || `Branch Manager ${report.branch || ""}`;
  doc.addText(bmSignName, 350, 155, { font: "bold", size: 8, color: [0.1, 0.1, 0.1] });

  // 7. Footer Notice
  doc.addLine(35, 105, 560, 105, { strokeColor: [0.8, 0.85, 0.82], lineWidth: 0.5 });
  doc.addText("Dokumen ini diterbitkan secara sah melalui sistem SPARTA SIAGA berdasarkan persetujuan resmi Branch Manager.", 45, 92, {
    font: "bold",
    size: 7.5,
    color: [0.1, 0.45, 0.25],
  });
  doc.addText("Seluruh bukti milestone tersimpan secara permanen dalam sistem dan terlindungi integritasnya.", 45, 80, {
    font: "regular",
    size: 7.5,
    color: [0.4, 0.45, 0.4],
  });

  return doc.build();
}
