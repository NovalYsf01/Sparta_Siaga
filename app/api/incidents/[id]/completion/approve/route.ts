import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { CompletionApprovalService } from "@/lib/completion-approval-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Akun System Administrator tidak memiliki izin melakukan tindakan operasional." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const notes = (body.notes || body.reason || "").toString().trim();

    const actor = {
      id: sessionUser.id,
      name: sessionUser.name,
      role: sessionUser.role,
      systemRole: sessionUser.systemRole,
      scope: sessionUser.scope,
      branch: sessionUser.branch,
    };

    const role = (sessionUser.role || "").toLowerCase();

    if (role === "bm") {
      const result = await CompletionApprovalService.approveByManager({
        reportId: id,
        actor,
        notes,
      });

      return NextResponse.json({
        message: "Laporan berhasil disetujui final oleh Branch Manager dan resmi ditutup.",
        data: result,
      });
    }

    if (["bmc", "bec", "bbc"].includes(role)) {
      const result = await CompletionApprovalService.approveByCoordinator({
        reportId: id,
        actor,
        notes,
      });

      return NextResponse.json({
        message: "Laporan berhasil disetujui oleh Koordinator dan diteruskan ke Branch Manager.",
        data: result,
      });
    }

    return NextResponse.json(
      {
        error: `Role '${role.toUpperCase() || "N/A"}' tidak memiliki otoritas untuk menyetujui laporan pada tahap ini.`,
        code: "ROLE_MISMATCH",
      },
      { status: 403 }
    );
  } catch (err: any) {
    console.error("[POST /api/incidents/:id/completion/approve]", err);
    return NextResponse.json(
      { error: err.message || "Gagal menyetujui laporan.", code: err.code },
      { status: err.status || 500 }
    );
  }
}
