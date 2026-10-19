import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewReport } from "@/lib/report-permissions";
import { dbGetIncidentById } from "@/lib/incident-db";
import { getInspectionPhotoFile } from "@/lib/inspection-storage";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized: Sesi login diperlukan untuk mengakses foto pemeriksaan." },
        { status: 401 }
      );
    }

    const { id, photoId } = await params;

    if (
      !id ||
      !photoId ||
      id.includes("..") ||
      photoId.includes("..") ||
      photoId.includes("/") ||
      photoId.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Parameter tidak valid (path traversal ditolak)." },
        { status: 400 }
      );
    }

    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json(
        { error: "Laporan kejadian tidak ditemukan." },
        { status: 404 }
      );
    }

    // Read access alone is not enough: the photo must belong to this incident.
    if ((sessionUser.systemRole !== "ADMIN" && sessionUser.scope !== "HO" && !sessionUser.branch?.trim()) ||
        !canViewReport(sessionUser, incident)) {
      return NextResponse.json({ error: "Akses foto laporan ditolak." }, { status: 403 });
    }

    const prefix = "/api/incidents/" + encodeURIComponent(id) + "/inspection/evidence/";
    const referencedPhotos = [
      ...(incident.verification?.photos || []),
      ...(incident.fieldPhotos || []),
      ...(incident.verification?.evidenceDetails?.map(e => e.photoUrl) || []),
    ];
    const belongsToReport = referencedPhotos.some(url => {
      if (typeof url !== "string" || !url.startsWith(prefix)) return false;
      try {
        return decodeURIComponent(url.slice(prefix.length)) === photoId;
      } catch {
        return false;
      }
    });
    if (!belongsToReport) {
      return NextResponse.json({ error: "Foto tidak terdaftar sebagai bukti laporan ini." }, { status: 404 });
    }

    const file = await getInspectionPhotoFile(photoId);
    if (!file) {
      return NextResponse.json(
        { error: "Berkas foto pemeriksaan tidak ditemukan." },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": file.fileSize.toString(),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[GET /api/incidents/:id/inspection/evidence/:photoId]", err);
    return NextResponse.json(
      { error: "Gagal memuat berkas foto pemeriksaan." },
      { status: 500 }
    );
  }
}
