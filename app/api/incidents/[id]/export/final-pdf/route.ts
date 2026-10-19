import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewReport } from "@/lib/report-permissions";
import { dbGetIncidentById } from "@/lib/incident-db";
import { getMilestones } from "@/lib/milestone-service";
import { generateFinalReportPdf } from "@/lib/pdf-generator";

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

    // Validation: Final PDF requires CLOSED / resolved status
    const isClosed = report.status === "closed" || report.status === "resolved";
    if (!isClosed) {
      return NextResponse.json(
        {
          error: "Dokumen final hanya dapat diunduh setelah laporan resmi disetujui BnM Manajer / Administrator (CLOSED).",
          code: "REPORT_NOT_CLOSED",
        },
        { status: 422 }
      );
    }

    const milestones = await getMilestones(id);
    const pdfBuffer = generateFinalReportPdf(report, milestones);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="SPARTA_Laporan_Final_${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/incidents/:id/export/final-pdf]", err);
    return NextResponse.json({ error: "Gagal membuat dokumen PDF laporan final." }, { status: 500 });
  }
}
