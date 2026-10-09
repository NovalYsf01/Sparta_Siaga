import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { checkUserPermission } from "@/lib/permission-service";
import { EstimationIntegrationService, HandlerType } from "@/lib/estimation-service";

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
      return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    // Cek permission ESTIMATION_VIEW
    const permCheck = await checkUserPermission({
      user: sessionUser,
      permission: "ESTIMATION_VIEW",
      report: incident,
    });

    if (!permCheck.authorized) {
      return NextResponse.json(
        { error: "Unauthorized: Anda tidak memiliki izin untuk melihat status estimasi laporan ini." },
        { status: 403 }
      );
    }

    const route = await EstimationIntegrationService.getRouteByReportId(id);
    return NextResponse.json({ data: route });
  } catch (err: any) {
    console.error("[GET /api/incidents/:id/estimation]", err);
    return NextResponse.json(
      { error: "Gagal memuat status estimasi laporan." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // 1. Authenticate session
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. System Admin tidak boleh operational action
    if (sessionUser.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Akun System Administrator tidak memiliki izin melakukan tindakan operasional." },
        { status: 403 }
      );
    }

    // 3. Load report dari DB
    const { id } = await params;
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json(
        { error: "Laporan tidak ditemukan.", code: "REPORT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 4. Validate report status eligibility (Must not be resolved/archived, and must not be pending_confirmation)
    if (incident.status === "pending_confirmation") {
      return NextResponse.json(
        {
          error: "Laporan masih menunggu konfirmasi kondisi toko. Estimasi hanya dapat dibuat setelah konfirmasi dampak selesai.",
          code: "REPORT_PENDING_CONFIRMATION",
        },
        { status: 422 }
      );
    }

    if (incident.status === "resolved" || incident.status === "archived") {
      return NextResponse.json(
        {
          error: "Laporan yang telah selesai (resolved) atau diarsipkan tidak dapat dibuatkan estimasi baru.",
          code: "REPORT_NOT_ELIGIBLE",
        },
        { status: 422 }
      );
    }

    // 5. Validate TKP = TOKO (Alur estimasi untuk lokasi DC belum tersedia)
    const tkp = (incident.tkpType || "").trim().toLowerCase();
    if (tkp !== "toko") {
      return NextResponse.json(
        {
          error: "Alur estimasi untuk lokasi DC belum tersedia.",
          code: "ESTIMATION_NOT_SUPPORTED",
        },
        { status: 422 }
      );
    }

    // 6. Cek server-side permission ESTIMATION_TRIGGER
    const permCheck = await checkUserPermission({
      user: sessionUser,
      permission: "ESTIMATION_TRIGGER",
      report: incident,
    });

    if (!permCheck.authorized) {
      return NextResponse.json(
        {
          error:
            permCheck.reason ||
            "Unauthorized: Anda tidak memiliki izin untuk membuat estimasi pada laporan ini.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // 7. Cek duplicate protection (1 active route per report)
    const existingRoute = await EstimationIntegrationService.getRouteByReportId(id);
    if (existingRoute) {
      return NextResponse.json(
        {
          error:
            "Conflict: Laporan ini sudah memiliki rute estimasi aktif. Duplikasi estimasi tidak diizinkan.",
          code: "DUPLICATE_ROUTE",
        },
        { status: 409 }
      );
    }

    // 8. Validate handler
    const body = await request.json().catch(() => ({}));
    const rawHandler = (body.handler || body.handlerType || "").toString().trim().toUpperCase();

    if (rawHandler !== "BMS" && rawHandler !== "REKANAN") {
      return NextResponse.json(
        {
          error: "Handler tidak valid. Pilihan yang tersedia: BMS atau REKANAN.",
          code: "INVALID_HANDLER",
        },
        { status: 400 }
      );
    }

    // 9. Create routing record (clean, no fake data, initial status WAITING_ESTIMATION)
    const created = await EstimationIntegrationService.createRoute({
      reportId: id,
      handlerType: rawHandler as HandlerType,
      actor: {
        id: sessionUser.id,
        name: sessionUser.name,
        nik: sessionUser.nik,
      },
      report: incident,
    });

    return NextResponse.json(
      {
        message: "Rute estimasi berhasil dibuat.",
        data: created,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/incidents/:id/estimation]", err);
    if (err.status) {
      return NextResponse.json(
        { error: err.message, code: err.code || "ESTIMATION_ERROR" },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: "Gagal memproses pembuatan rute estimasi.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
