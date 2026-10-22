import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { canAccessReportAsync } from "@/lib/report-access-policy";

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

    // Server-side permission check
    if (!await canAccessReportAsync(sessionUser, report)) {
      return NextResponse.json({ error: "Akses dokumen laporan ditolak." }, { status: 403 });
    }

    // Determine the most complete report PDF available for this incident stage
    let targetEndpoint = `/api/incidents/${encodeURIComponent(id)}/export/initial-pdf`;

    if (report.status === "closed" || report.status === "resolved") {
      targetEndpoint = `/api/incidents/${encodeURIComponent(id)}/export/final-pdf`;
    } else if (
      report.verification?.confirmedAt ||
      report.status === "in_maintenance" ||
      report.status === "in_construction" ||
      report.status === "investigating" ||
      report.status === "verifying" ||
      (report.progress && report.progress > 0)
    ) {
      targetEndpoint = `/api/incidents/${encodeURIComponent(id)}/export/monitoring-pdf`;
    }

    return NextResponse.redirect(new URL(targetEndpoint, request.url), 307);
  } catch (err) {
    console.error("[GET /api/incidents/:id/export/pdf]", err);
    return NextResponse.json({ error: "Gagal mengalihkan ke dokumen PDF." }, { status: 500 });
  }
}
