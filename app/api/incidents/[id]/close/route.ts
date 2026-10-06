import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { ProgressService } from "@/lib/progress-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Akun System Administrator tidak memiliki izin melakukan tindakan operasional." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || body.notes || "").toString().trim();

    const closedReport = await ProgressService.closeReport({
      reportId: id,
      actor: {
        id: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role,
        systemRole: sessionUser.systemRole,
        scope: sessionUser.scope,
        branch: sessionUser.branch,
      },
      reason,
    });

    return NextResponse.json({
      message: "Laporan berhasil diselesaikan dan ditutup.",
      data: closedReport,
    });
  } catch (err: any) {
    console.error("[POST /api/incidents/:id/close]", err);
    const statusCode = err.status || 500;
    return NextResponse.json(
      { error: err.message || "Gagal menutup laporan." },
      { status: statusCode }
    );
  }
}
