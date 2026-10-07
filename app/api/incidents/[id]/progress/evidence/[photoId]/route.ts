import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { getProgressPhotoFile } from "@/lib/progress-storage";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

/**
 * Protected endpoint untuk mengakses foto progress dari private storage.
 * 
 * Security:
 * 1. Authentication required (session)
 * 2. Report existence check
 * 3. Branch scope enforcement (cross-branch denied)
 * 4. Path traversal guard (delegated to getProgressPhotoFile)
 * 5. Secure response headers (nosniff, no-cache)
 * 
 * Supports both watermarked (wm_*) and original (orig_*) storage keys.
 */
export async function GET(_: Request, { params }: RouteContext) {
  try {
    // 1. Authentication
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized — Sesi login diperlukan untuk mengakses foto progress.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id, photoId } = await params;

    // 2. Parameter validation + anti-path traversal
    if (
      !id ||
      !photoId ||
      id.includes("..") ||
      photoId.includes("..") ||
      photoId.includes("/") ||
      photoId.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Parameter tidak valid (path traversal ditolak).", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // 3. Report existence check
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json(
        { error: "Laporan kejadian tidak ditemukan.", code: "REPORT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 4. Branch scope enforcement
    // System Admin (ADMIN): monitoring access allowed (audit/troubleshooting)
    // HO Scope: national monitoring access
    // Branch Scope: MUST match report branch
    if (sessionUser.systemRole !== "ADMIN") {
      const cleanBranch = (b?: string | null) => (b ? b.trim().toLowerCase() : "");
      const userBranch = cleanBranch(sessionUser.branch);
      const reportBranch = cleanBranch(incident.branch);

      if (sessionUser.scope !== "HO") {
        if (!reportBranch || userBranch !== reportBranch) {
          return NextResponse.json(
            {
              error: `Anda tidak memiliki izin untuk melihat foto progress laporan cabang lain (Cabang Anda: '${sessionUser.branch || "N/A"}', Cabang Laporan: '${incident.branch}').`,
              code: "FORBIDDEN",
            },
            { status: 403 }
          );
        }
      }
    }

    // 5. Cross-report isolation: verify storage key belongs to this report
    // Storage keys contain the reportId in their filename (e.g. wm_REPORT-ID_timestamp.jpg)
    const sanitizedReportId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!photoId.includes(sanitizedReportId)) {
      return NextResponse.json(
        {
          error: "Foto ini bukan milik laporan yang diminta (cross-report evidence swapping ditolak).",
          code: "CROSS_REPORT_EVIDENCE",
        },
        { status: 403 }
      );
    }

    // 6. Retrieve file from private storage
    const fileData = await getProgressPhotoFile(photoId);
    if (!fileData) {
      return NextResponse.json(
        {
          error: "Foto progress tidak ditemukan atau berkas tidak tersedia.",
          code: "EVIDENCE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 7. Stream with secure headers
    const sanitizedFileName = fileData.fileName.replace(/["\r\n]/g, "_");
    return new Response(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        "Content-Type": fileData.mimeType,
        "Content-Disposition": `inline; filename="${sanitizedFileName}"`,
        "Content-Length": fileData.fileSize.toString(),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/incidents/:id/progress/evidence/:photoId]", err);
    return NextResponse.json(
      { error: "Gagal memuat foto progress.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
