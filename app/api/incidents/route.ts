import { NextResponse } from "next/server";
import { dbGetAllIncidents, dbCreateIncident } from "@/lib/incident-db";
import { IncidentRecord } from "@/types/incident";

export async function GET() {
  try {
    const incidents = await dbGetAllIncidents();
    return NextResponse.json({ data: incidents });
  } catch (err) {
    console.error("[GET /api/incidents]", err);
    return NextResponse.json(
      { error: "Gagal memuat data laporan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: IncidentRecord = await request.json();
    if (!body.id || !body.disasterType || !body.storeId) {
      return NextResponse.json(
        { error: "Data laporan tidak lengkap (id, disasterType, storeId wajib diisi)" },
        { status: 400 }
      );
    }
    const created = await dbCreateIncident(body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/incidents]", err);
    return NextResponse.json(
      { error: "Gagal membuat laporan baru" },
      { status: 500 }
    );
  }
}
