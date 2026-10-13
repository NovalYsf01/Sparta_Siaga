import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { generateInitialReportPdf } from "@/lib/pdf-generator";

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

    const pdfBuffer = generateInitialReportPdf(report);

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
