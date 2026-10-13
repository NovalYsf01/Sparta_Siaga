import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
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

    // Branch authorization check
    if (sessionUser.systemRole !== "ADMIN" && sessionUser.scope !== "HO") {
      const clean = (b?: string | null) => (b ? b.trim().toLowerCase() : "");
      if (clean(sessionUser.branch) !== clean(incident.branch)) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda tidak memiliki akses ke laporan cabang ini." },
          { status: 403 }
        );
      }
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
        "Cache-Control": "private, max-age=3600",
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
