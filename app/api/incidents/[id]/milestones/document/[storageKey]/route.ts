import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { canAccessReportAsync } from "@/lib/report-access-policy";
import { getMilestoneDocumentFile } from "@/lib/milestone-storage";

type RouteContext = { params: Promise<{ id: string; storageKey: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, storageKey } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    const canView = await canAccessReportAsync(sessionUser, incident);
    if (!canView) {
      return NextResponse.json(
        { error: "Unauthorized: Anda tidak memiliki izin untuk mengakses dokumen laporan ini." },
        { status: 403 }
      );
    }

    const file = await getMilestoneDocumentFile(storageKey);
    if (!file) {
      return NextResponse.json(
        { error: "Berkas dokumen tidak ditemukan." },
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
  } catch (err: unknown) {
    console.error("[GET /api/incidents/:id/milestones/document/:storageKey]", err);
    return NextResponse.json(
      { error: "Gagal memuat berkas dokumen milestone." },
      { status: 500 }
    );
  }
}
