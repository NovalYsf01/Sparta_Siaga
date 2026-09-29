import { NextResponse } from "next/server";
import {
  dbGetIncidentById,
  dbUpdateIncident,
  dbDeleteIncident,
} from "@/lib/incident-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: incident });
  } catch (err) {
    console.error("[GET /api/incidents/:id]", err);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const patch = await request.json();
    const updated = await dbUpdateIncident(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/incidents/:id]", err);
    return NextResponse.json({ error: "Gagal memperbarui laporan" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deleted = await dbDeleteIncident(id);
    if (!deleted) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ data: { success: true, id } });
  } catch (err) {
    console.error("[DELETE /api/incidents/:id]", err);
    return NextResponse.json({ error: "Gagal menghapus laporan" }, { status: 500 });
  }
}
