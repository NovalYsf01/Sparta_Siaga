import { NextResponse } from "next/server";
import {
  dbGetIncidentById,
  dbUpdateIncident,
  dbDeleteIncident,
} from "@/lib/incident-db";
import { getSessionUser } from "@/lib/auth";
import { checkMutationAuthorization } from "@/lib/report-permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    // Role-based visibility
    const isHoAdmin = ["ho_admin", "gm_ho", "sm_ho"].includes(sessionUser.role);
    if (!isHoAdmin) {
      if (incident.branch.trim().toLowerCase() !== sessionUser.branch.trim().toLowerCase()) {
        return NextResponse.json({ error: "Unauthorized: Cabang tidak berhak mengakses laporan ini" }, { status: 403 });
      }
    }

    return NextResponse.json({ data: incident });
  } catch (err) {
    console.error("[GET /api/incidents/:id]", err);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    // Usually PATCH is an operational action
    const authResult = checkMutationAuthorization("act", sessionUser, incident);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    const patch = await request.json();
    const updated = await dbUpdateIncident(id, patch);
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/incidents/:id]", err);
    return NextResponse.json({ error: "Gagal memperbarui laporan" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    // Only HO Admin or GM should probably delete, but we'll use act for now or a custom check.
    // The instruction says "Close: TBD / deny for now. Do not invent Close permission."
    // Let's just fail closed for DELETE unless it's ho_admin for safety.
    if (sessionUser.role !== "ho_admin") {
      return NextResponse.json({ error: "Hanya Administrator yang dapat menghapus laporan" }, { status: 403 });
    }

    const deleted = await dbDeleteIncident(id);
    return NextResponse.json({ data: { success: true, id } });
  } catch (err) {
    console.error("[DELETE /api/incidents/:id]", err);
    return NextResponse.json({ error: "Gagal menghapus laporan" }, { status: 500 });
  }
}
