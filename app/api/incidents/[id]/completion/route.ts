import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { EstimationIntegrationService } from "@/lib/estimation-service";
import {
  CompletionApprovalService,
  resolveApprovalRoute,
} from "@/lib/completion-approval-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const report = await dbGetIncidentById(id);
    if (!report) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    const route = await EstimationIntegrationService.getRouteByReportId(id);
    const resolvedRoute = resolveApprovalRoute(report, route);
    const approval = await CompletionApprovalService.getOrCreateApproval(id);
    const history = await CompletionApprovalService.getApprovalHistory(id);

    return NextResponse.json({
      data: {
        approval,
        route: resolvedRoute,
        history,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/incidents/:id/completion]", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat status approval" },
      { status: err.status || 500 }
    );
  }
}
