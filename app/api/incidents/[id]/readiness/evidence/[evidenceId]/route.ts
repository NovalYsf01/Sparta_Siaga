import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { getReadinessEvidenceFile } from "@/lib/work-readiness-server";

type RouteContext = { params: Promise<{ id: string; evidenceId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    // 1. Authentication Check
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized — Sesi login diperlukan untuk mengakses berkas bukti.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id, evidenceId } = await params;

    // 2. Anti-Path Traversal & Parameter Validation
    if (
      !id ||
      !evidenceId ||
      id.includes("..") ||
      evidenceId.includes("..") ||
      evidenceId.includes("/") ||
      evidenceId.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Parameter tidak valid (path traversal ditolak).", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // 3. Report Exists Check
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json(
        { error: "Laporan kejadian tidak ditemukan.", code: "REPORT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 4. Scope & Permission Check
    // System Admin (ADMIN): memiliki hak pemantauan nasional (audit / troubleshooting)
    // HO Scope: memiliki hak pemantauan nasional
    // Branch Scope: WAJIB sama dengan cabang laporan (Branch A tidak boleh membuka bukti Branch B)
    if (sessionUser.systemRole !== "ADMIN") {
      const cleanBranch = (b?: string | null) => (b ? b.trim().toLowerCase() : "");
      const userBranch = cleanBranch(sessionUser.branch);
      const reportBranch = cleanBranch(incident.branch);

      if (sessionUser.scope !== "HO") {
        if (!reportBranch || userBranch !== reportBranch) {
          return NextResponse.json(
            {
              error: `Anda tidak memiliki izin untuk melihat berkas bukti laporan cabang lain (Cabang Anda: '${sessionUser.branch || "N/A"}', Cabang Laporan: '${incident.branch}').`,
              code: "FORBIDDEN",
            },
            { status: 403 }
          );
        }
      }
    }

    // 5. Lookup File dari Private Storage (Strictly scoped to this report)
    const fileData = await getReadinessEvidenceFile(id, evidenceId);
    if (!fileData) {
      return NextResponse.json(
        {
          error: "Berkas bukti tidak ditemukan atau bukan milik laporan ini.",
          code: "EVIDENCE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 6. Response Streaming dengan Secure Content Headers
    const inlineTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const isInline = inlineTypes.includes(fileData.mimeType);
    const sanitizedFileName = fileData.fileName.replace(/["\r\n]/g, "_");
    const disposition = isInline
      ? `inline; filename="${sanitizedFileName}"`
      : `attachment; filename="${sanitizedFileName}"`;

    return new Response(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        "Content-Type": fileData.mimeType,
        "Content-Disposition": disposition,
        "Content-Length": fileData.fileSize.toString(),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/incidents/:id/readiness/evidence/:evidenceId]", err);
    return NextResponse.json(
      { error: "Gagal memuat berkas bukti kesiapan kerja.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
