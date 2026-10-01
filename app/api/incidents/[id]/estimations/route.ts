import { NextResponse } from "next/server";
import { dbGetEstimationsForReport, dbCreateEstimation } from "@/lib/estimation-db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const records = await dbGetEstimationsForReport(params.id);
    return NextResponse.json({ data: records });
  } catch (err) {
    console.error("[GET /api/incidents/[id]/estimations]", err);
    return NextResponse.json({ error: "Failed to fetch estimations" }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const created = await dbCreateEstimation({
      reportId: params.id,
      reporterNik: body.reporterNik || (session as any).nik || "000000000",
      reporterName: body.reporterName || session.name || "Unknown",
      tkpType: body.tkpType || "toko",
      estimationType: body.estimationType,
      status: "submitted",
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/incidents/[id]/estimations]", err);
    return NextResponse.json({ error: "Failed to create estimation" }, { status: 500 });
  }
}
