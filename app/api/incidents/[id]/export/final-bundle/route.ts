import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewReport } from "@/lib/report-permissions";
import { dbGetIncidentById } from "@/lib/incident-db";
import { getMilestones } from "@/lib/milestone-service";
import { generateFinalReportPdf, generateInitialReportPdf } from "@/lib/pdf-generator";
import { getMilestoneDocumentFile } from "@/lib/milestone-storage";
import { getInspectionPhotoFile } from "@/lib/inspection-storage";
import { appendInspectionEvidencePages, PdfEvidencePhoto } from "@/lib/pdf-evidence-appendix";
import { createZipArchive, ZipFileInput } from "@/lib/zip-bundle";

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
    if (
      (sessionUser.scope !== "HO" && sessionUser.systemRole !== "ADMIN" && !sessionUser.branch?.trim()) ||
      !canViewReport(sessionUser, report)
    ) {
      return NextResponse.json({ error: "Akses dokumen laporan ditolak." }, { status: 403 });
    }

    // Validation: Attachment bundle requires CLOSED / resolved status (enforce HTTP 422)
    const isClosed = report.status === "closed" || report.status === "resolved";
    if (!isClosed) {
      return NextResponse.json(
        {
          error: "Bundel dokumen bukti fisik hanya dapat diunduh setelah laporan resmi berstatus CLOSED (disetujui BnM Manajer / Selesai).",
          code: "REPORT_NOT_CLOSED",
        },
        { status: 422 }
      );
    }

    const milestones = await getMilestones(id);
    const filesToZip: ZipFileInput[] = [];

    // 1. Generate & Add Final PDF (with embedded evidence appendix)
    const baseFinalPdf = generateFinalReportPdf(report, milestones);
    const evidencePhotos: PdfEvidencePhoto[] = [];
    const photoIds = new Set<string>();

    // Initial photos
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
                evidencePhotos.push({
                  buffer: p.buffer,
                  label: `BUKTI AWAL: ${slotLabel.toUpperCase()}`,
                  subtitle: `Sumber: ${srcText}`,
                });
                // Also add raw file into zip bundle
                filesToZip.push({
                  filename: `01_bukti_awal/${slotLabel.replace(/[^a-zA-Z0-9_-]/g, "_")}_${p.fileName}`,
                  buffer: p.buffer,
                });
              }
            }
          }
        } else if (photoUrl.startsWith("data:image/")) {
          const parts = photoUrl.split(",");
          if (parts[1]) {
            try {
              const buf = Buffer.from(parts[1], "base64");
              evidencePhotos.push({
                buffer: buf,
                label: `BUKTI AWAL: ${slotLabel.toUpperCase()}`,
                subtitle: `Sumber: ${srcText}`,
              });
              filesToZip.push({
                filename: `01_bukti_awal/${slotLabel.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`,
                buffer: buf,
              });
            } catch {}
          }
        }
      }
    }

    // Inspection photos
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
              evidencePhotos.push({
                buffer: p.buffer,
                label: `BUKTI INSPEKSI: ${(ev.caption || "Pemeriksaan Lapangan").toUpperCase()}`,
                subtitle: `Petugas: ${report.verification.confirmedBy || "BMS/BES"}`,
              });
              filesToZip.push({
                filename: `02_inspeksi_cabang/${(ev.caption || "inspeksi").replace(/[^a-zA-Z0-9_-]/g, "_")}_${p.fileName}`,
                buffer: p.buffer,
              });
            }
          }
        }
      }
    }

    // Milestone documents
    for (const ms of milestones) {
      if (ms.documentStorageKey) {
        const file = await getMilestoneDocumentFile(ms.documentStorageKey);
        if (file) {
          if (file.mimeType.startsWith("image/") || file.fileName.match(/\.(jpe?g|png|webp)$/i)) {
            evidencePhotos.push({
              buffer: file.buffer,
              label: `BUKTI MILESTONE ${ms.targetProgress}% - ${ms.stageName.toUpperCase()}`,
              subtitle: `Pengunggah: ${ms.actorName || "-"} (${ms.actorRole || "-"}) • Dokumen: ${ms.documentOriginalName || file.fileName}`,
            });
          }
          filesToZip.push({
            filename: `03_milestones/milestone_${ms.targetProgress}pct_${ms.stageKey}_${ms.documentOriginalName || file.fileName}`,
            buffer: file.buffer,
          });
        }
      }
    }

    const finalPdf = await appendInspectionEvidencePages(baseFinalPdf, evidencePhotos);
    filesToZip.unshift({
      filename: `SPARTA_Laporan_Final_${id}.pdf`,
      buffer: finalPdf,
    });

    // 2. Add Initial Report PDF
    const initialPdf = generateInitialReportPdf(report);
    filesToZip.push({
      filename: `SPARTA_Laporan_Awal_${id}.pdf`,
      buffer: initialPdf,
    });

    // 3. Add Manifest Information JSON
    const manifest = {
      reportId: report.id,
      storeId: report.storeId,
      storeName: report.storeName,
      branch: report.branch,
      disasterType: report.disasterType,
      status: report.status,
      closedAt: report.closedAt || report.updatedAt,
      closedBy: report.timeline?.slice().reverse().find(t => t.stage === "Laporan Ditutup" || t.label?.includes("CLOSED"))?.actor || "BnM Manajer",
      milestonesCount: milestones.length,
      milestonesSummary: milestones.map(m => ({
        stage: m.stageName,
        progress: m.targetProgress,
        status: m.status,
        submittedAt: m.submittedAt,
        document: m.documentOriginalName || m.documentStorageKey,
      })),
      timeline: report.timeline,
      exportedAt: new Date().toISOString(),
    };

    filesToZip.push({
      filename: `manifest_dokumen_resmi.json`,
      buffer: Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"),
    });

    const zipBuffer = createZipArchive(filesToZip);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="SPARTA_Bundel_Bukti_${id}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/incidents/:id/export/final-bundle]", err);
    return NextResponse.json({ error: "Gagal membuat bundel dokumen lampiran." }, { status: 500 });
  }
}
