import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canAccessReportAsync } from "@/lib/report-access-policy";
import { dbGetIncidentById } from "@/lib/incident-db";
import { getMilestones } from "@/lib/milestone-service";
import { generateFinalReportPdf } from "@/lib/pdf-generator";
import { getMilestoneDocumentFile } from "@/lib/milestone-storage";
import { getInspectionPhotoFile } from "@/lib/inspection-storage";
import { appendInspectionEvidencePages, PdfEvidencePhoto } from "@/lib/pdf-evidence-appendix";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized: Sesi login diperlukan." }, { status: 401 });
    }

    const { id } = await params;
    const report = await dbGetIncidentById(id);
    if (!report) {
      return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    // Deny unscoped branch accounts, and enforce the report's branch at the API boundary.
    if (!await canAccessReportAsync(sessionUser, report)) {
      return NextResponse.json({ error: "Akses dokumen laporan ditolak." }, { status: 403 });
    }

    // Validation: Final PDF requires CLOSED / resolved status
    const isClosed = report.status === "closed" || report.status === "resolved";
    if (!isClosed) {
      return NextResponse.json(
        {
          error: "Dokumen final hanya dapat diunduh setelah laporan resmi disetujui BnM Manajer / Administrator (CLOSED).",
          code: "REPORT_NOT_CLOSED",
        },
        { status: 422 }
      );
    }

    const milestones = await getMilestones(id);
    const basePdf = generateFinalReportPdf(report, milestones);

    // Collect all evidence photos & milestone proof images for appendix
    const evidence: PdfEvidencePhoto[] = [];
    const sanitizedReportId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const photoIds = new Set<string>();

    // 1. Initial field photos
    if (report.fieldPhotos && Array.isArray(report.fieldPhotos)) {
      for (let idx = 0; idx < report.fieldPhotos.length; idx++) {
        const item = report.fieldPhotos[idx];
        if (!item) continue;
        const photoUrl = typeof item === "string" ? item : item.url;
        const slotLabel = (typeof item === "object" && item.slotLabel) ? item.slotLabel : `Foto Awal #${idx + 1}`;
        const source = typeof item === "object" ? item.source : "camera";
        const srcText = source === "gallery" ? "Unggahan Galeri HP" : "Foto Kamera Langsung";

        if (photoUrl.startsWith("/api/incidents/")) {
          const prefix = "/api/incidents/" + encodeURIComponent(id) + "/inspection/evidence/";
          if (photoUrl.startsWith(prefix)) {
            const key = decodeURIComponent(photoUrl.slice(prefix.length));
            if (!photoIds.has(key)) {
              photoIds.add(key);
              const p = await getInspectionPhotoFile(key);
              if (p) {
                evidence.push({
                  buffer: p.buffer,
                  label: `BUKTI AWAL PELAPOR: ${slotLabel.toUpperCase()}`,
                  subtitle: `Sumber: ${srcText} • Dokumentasi awal saat pembuatan laporan`,
                });
              }
            }
          }
        } else if (photoUrl.startsWith("data:image/")) {
          const parts = photoUrl.split(",");
          if (parts[1]) {
            try {
              evidence.push({
                buffer: Buffer.from(parts[1], "base64"),
                label: `BUKTI AWAL PELAPOR: ${slotLabel.toUpperCase()}`,
                subtitle: `Sumber: ${srcText}`,
              });
            } catch {}
          }
        }
      }
    }

    // 2. Inspection verification photos
    if (report.verification?.evidenceDetails && Array.isArray(report.verification.evidenceDetails)) {
      for (const ev of report.verification.evidenceDetails) {
        if (!ev?.photoUrl) continue;
        const prefix = "/api/incidents/" + encodeURIComponent(id) + "/inspection/evidence/";
        if (ev.photoUrl.startsWith(prefix)) {
          const key = decodeURIComponent(ev.photoUrl.slice(prefix.length));
          if (!photoIds.has(key)) {
            photoIds.add(key);
            const p = await getInspectionPhotoFile(key);
            if (p) {
              evidence.push({
                buffer: p.buffer,
                label: `BUKTI INSPEKSI FISIK: ${(ev.caption || "Pemeriksaan Lapangan").toUpperCase()}`,
                subtitle: `Petugas: ${report.verification.confirmedBy || "BMS/BES"} • Waktu: ${report.verification.confirmedAt || "-"}`,
              });
            }
          }
        }
      }
    }

    // 3. Milestone Proof Documents
    for (const ms of milestones) {
      if (ms.documentStorageKey) {
        const file = await getMilestoneDocumentFile(ms.documentStorageKey);
        if (file && (file.mimeType.startsWith("image/") || file.fileName.match(/\.(jpe?g|png|webp)$/i))) {
          evidence.push({
            buffer: file.buffer,
            label: `BUKTI MILESTONE ${ms.targetProgress}% - ${ms.stageName.toUpperCase()}`,
            subtitle: `Pengunggah: ${ms.actorName || "-"} (${ms.actorRole || "-"}) • Dokumen: ${ms.documentOriginalName || file.fileName}`,
          });
        }
      }
    }

    const finalPdfBuffer = await appendInspectionEvidencePages(basePdf, evidence);

    return new NextResponse(new Uint8Array(finalPdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="SPARTA_Laporan_Final_${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/incidents/:id/export/final-pdf]", err);
    return NextResponse.json({ error: "Gagal membuat dokumen PDF laporan final." }, { status: 500 });
  }
}
