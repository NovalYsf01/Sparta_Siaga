import { NextResponse } from "next/server";
import { ReportDistributionService } from "@/lib/distribution-service";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const records = await ReportDistributionService.getDistributionsForReport(params.id);
    return NextResponse.json({ data: records });
  } catch (error) {
    console.error("[GET /api/incidents/[id]/distributions]", error);
    return NextResponse.json({ error: "Failed to fetch distributions" }, { status: 500 });
  }
}
