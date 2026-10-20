import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewReport } from "@/lib/report-permissions";
import { dbGetIncidentById } from "@/lib/incident-db";
import { generateInitialReportPdf } from "@/lib/pdf-generator";
import { appendInspectionEvidencePages } from "@/lib/pdf-evidence-appendix";
import { getInspectionPhotoFile } from "@/lib/inspection-storage";

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
    if ((sessionUser.scope !== "HO" && sessionUser.systemRole !== "ADMIN" && !sessionUser.branch?.trim()) ||
        !canViewReport(sessionUser, report)) {
      return NextResponse.json({ error: "Akses dokumen laporan ditolak." }, { status: 403 });
    }

    // Collect all valid initial evidence photos from fieldPhotos and verification
    // Do NOT mix subsequent work/milestone photos into initial evidence
    interface PhotoItem {
      url: string;
      label?: string;
      subtitle?: string;
    }

    const photoItems: PhotoItem[] = [];

    // 1. Initial field photos (from reporter)
    if (report.fieldPhotos && Array.isArray(report.fieldPhotos)) {
      report.fieldPhotos.forEach((item, idx) => {
        if (!item) return;
        if (typeof item === "string") {
          photoItems.push({
            url: item,
            label: `Bukti Visual Awal Lapangan #${idx + 1}`,
            subtitle: `Lampiran foto yang diunggah pada saat pelaporan kejadian`,
          });
        } else if (typeof item === "object" && item.url) {
          const srcText = item.source === "gallery" ? "Unggahan Galeri HP" : "Foto Kamera Langsung";
          const reasonText = item.galleryReason ? ` • Alasan: ${item.galleryReason}` : "";
          const provText = item.sourceProvider ? ` • Dari: ${item.sourceProvider}` : "";
          const timeText = item.capturedAt ? ` • Waktu: ${item.capturedAt}` : "";
          photoItems.push({
            url: item.url,
            label: item.slotLabel || `Bukti Awal Pelapor #${idx + 1}`,
            subtitle: `Sumber: ${srcText}${reasonText}${provText}${timeText}`,
          });
        }
      });
    }

    // 2. Inspection verification photos (from BMS/BES inspection)
    if (report.verification?.evidenceDetails && Array.isArray(report.verification.evidenceDetails)) {
      report.verification.evidenceDetails.forEach((ev, idx) => {
        if (ev?.photoUrl) {
          photoItems.push({
            url: ev.photoUrl,
            label: ev.caption || `Pemeriksaan Fisik Cabang #${idx + 1}`,
            subtitle: `Petugas: ${report.verification?.confirmedBy || "BMS/BES"} • Kondisi: ${report.verification?.isDamaged ? "Rusak / Terdampak" : "Aman"}`,
          });
        }
      });
    } else if (report.verification?.photos && Array.isArray(report.verification.photos)) {
      report.verification.photos.forEach((url, idx) => {
        if (url) {
          photoItems.push({
            url,
            label: `Pemeriksaan Fisik Cabang #${idx + 1}`,
            subtitle: `Petugas: ${report.verification?.confirmedBy || "BMS/BES"}`,
          });
        }
      });
    }

    const evidencePrefix =
      "/api/incidents/" + encodeURIComponent(id) + "/inspection/evidence/";
    const sanitizedReportId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const photoIds = new Set<string>();
    const evidence: Array<{ buffer: Buffer; label?: string; subtitle?: string }> = [];

    for (const item of photoItems) {
      if (evidence.length >= 15) break;
      const url = item.url;
      if (typeof url !== "string") continue;

      if (url.startsWith(evidencePrefix)) {
        let key: string;
        try {
          key = decodeURIComponent(url.slice(evidencePrefix.length));
        } catch {
          continue;
        }
        if (!/^wm_[a-zA-Z0-9_-]+_\d+_[a-z0-9]+\.(jpe?g|png|webp)$/i.test(key) ||
            photoIds.has(key) || (!key.includes(id) && !key.includes(sanitizedReportId))) {
          continue;
        }
        const photo = await getInspectionPhotoFile(key);
        if (photo) {
          photoIds.add(key);
          evidence.push({ buffer: photo.buffer, label: item.label, subtitle: item.subtitle });
        }
      } else if (url.startsWith("data:image/")) {
        const parts = url.split(",");
        if (parts[1]) {
          try {
            const buf = Buffer.from(parts[1], "base64");
            evidence.push({ buffer: buf, label: item.label, subtitle: item.subtitle });
          } catch {
            // ignore malformed base64
          }
        }
      }
    }

    const pdfBuffer = await appendInspectionEvidencePages(
      generateInitialReportPdf(report),
      evidence
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="SPARTA_Laporan_Awal_${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/incidents/:id/export/initial-pdf]", err);
    return NextResponse.json({ error: "Gagal membuat dokumen PDF laporan awal." }, { status: 500 });
  }
}
