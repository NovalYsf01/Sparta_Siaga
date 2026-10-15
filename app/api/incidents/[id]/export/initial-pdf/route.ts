import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
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

    // Branch authorization check
    const clean = (b?: string | null) => (b ? b.trim().toLowerCase() : "");
    if (sessionUser.scope !== "HO" && sessionUser.systemRole !== "ADMIN") {
      if (sessionUser.branch && clean(sessionUser.branch) !== clean(report.branch)) {
        return NextResponse.json(
          { error: "Forbidden: Anda tidak berwenang mengunduh dokumen laporan cabang lain." },
          { status: 403 }
        );
      }
    }

    // Include the actual private inspection photos as PDF appendix pages.
    // Never fetch arbitrary URLs: only the exact evidence endpoint of this report
    // is accepted, then the authenticated file is read from private storage.
    const photoCandidates = [
      ...(report.verification?.photos || []),
      ...(report.fieldPhotos || []),
    ];
    const evidencePrefix =
      "/api/incidents/" + encodeURIComponent(id) + "/inspection/evidence/";
    const photoIds = new Set<string>();
    const evidence: Array<{ buffer: Buffer }> = [];

    for (const url of photoCandidates) {
      if (evidence.length >= 6) break;
      if (typeof url !== "string" || !url.startsWith(evidencePrefix)) continue;
      let key: string;
      try {
        key = decodeURIComponent(url.slice(evidencePrefix.length));
      } catch {
        continue;
      }
      if (!/^wm_[a-zA-Z0-9_-]+_\d+_[a-z0-9]+\.(jpe?g|png|webp)$/i.test(key) ||
          photoIds.has(key) || !key.includes(id)) {
        continue;
      }
      const photo = await getInspectionPhotoFile(key);
      if (photo) {
        photoIds.add(key);
        evidence.push({ buffer: photo.buffer });
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
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("[GET /api/incidents/:id/export/initial-pdf]", err);
    return NextResponse.json({ error: "Gagal membuat dokumen PDF laporan awal." }, { status: 500 });
  }
}
