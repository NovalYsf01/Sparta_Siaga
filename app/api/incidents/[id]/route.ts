import { NextResponse } from "next/server";
import {
  dbGetIncidentById,
  dbUpdateIncident,
  dbDeleteIncident,
} from "@/lib/incident-db";
import { getSessionUser } from "@/lib/auth";
import { checkMutationAuthorization, canViewReportAsync } from "@/lib/permission-service";

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
    const canView = await canViewReportAsync(sessionUser, incident);
    if (!canView) {
      return NextResponse.json({ error: "Unauthorized: Cabang tidak berhak mengakses laporan ini" }, { status: 403 });
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

    const patch = await request.json();
    const isConfirmation = Boolean(
      patch.verification && (!incident.verification || incident.status === "pending_confirmation" || incident.status === "verifying")
    );
    const isWorkClose = patch.status === "resolved" && (!isConfirmation || patch.verification?.isDamaged === true);
    const action = isConfirmation ? "confirm" : isWorkClose ? "close" : "act";

    const authResult = await checkMutationAuthorization(action, sessionUser, incident);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.reason }, { status: 403 });
    }

    if (isWorkClose) {
      const { ProgressService } = await import("@/lib/progress-service");
      const latest = await ProgressService.getLatestProgress(id);
      if (latest.latestPercentage < 100) {
        return NextResponse.json(
          { error: `Laporan hanya dapat diselesaikan jika progress pekerjaan telah mencapai 100% (saat ini ${latest.latestPercentage}%).` },
          { status: 400 }
        );
      }
      const hasFinal = await ProgressService.hasFinalOrHandoverEvidence(id);
      if (!hasFinal) {
        return NextResponse.json(
          { error: "Penutupan laporan wajib menyertakan foto bukti akhir pekerjaan (FINAL atau HANDOVER)." },
          { status: 400 }
        );
      }
    }

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
    if (sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Hanya Administrator yang dapat menghapus laporan" }, { status: 403 });
    }

    const deleted = await dbDeleteIncident(id);
    return NextResponse.json({ data: { success: true, id } });
  } catch (err) {
    console.error("[DELETE /api/incidents/:id]", err);
    return NextResponse.json({ error: "Gagal menghapus laporan" }, { status: 500 });
  }
}
