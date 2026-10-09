import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { reportWorkflowService, ReportWorkflowError } from "@/lib/report-workflow-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await reportWorkflowService.submitInspection({
      reportId: id,
      verificationLevel: body.verificationLevel,
      conditionNotes: String(body.conditionNotes || ""),
      emergencyExceptionReason: body.emergencyExceptionReason ?? null,
    }, actor);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ReportWorkflowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[POST /api/incidents/:id/inspection]", error);
    return NextResponse.json({ error: "Gagal mengajukan pemeriksaan." }, { status: 500 });
  }
}
