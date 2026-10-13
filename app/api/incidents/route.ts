import { NextResponse } from "next/server";
import { dbGetAllIncidents, dbCreateIncident } from "@/lib/incident-db";
import { IncidentRecord } from "@/types/incident";
import { getSessionUser } from "@/lib/auth";
import { ReportDistributionService } from "@/lib/distribution-service";
import { canViewReport } from "@/lib/report-permissions";
import { checkUserPermission } from "@/lib/permission-service";

export async function GET(request?: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incidents = await dbGetAllIncidents();

    // Check if user has global read permission (HO, Admin, or active user override REPORT_VIEW_ALL)
    let hasGlobalView = sessionUser.systemRole === "ADMIN" || sessionUser.scope === "HO";
    if (!hasGlobalView && sessionUser.id) {
      const permCheck = await checkUserPermission({
        user: sessionUser,
        permission: "REPORT_VIEW_ALL",
      });
      hasGlobalView = permCheck.authorized;
    }

    const filteredIncidents = incidents.filter(
      (inc) => !inc.id.startsWith("INC-TEST-") && (hasGlobalView || canViewReport(sessionUser, inc))
    );

    return NextResponse.json({ data: filteredIncidents });
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
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Akun System Administrator tidak memiliki izin membuat laporan operasional." },
        { status: 403 }
      );
    }

    if (sessionUser.role === "tim_toko" || (sessionUser as any).businessRole === "tim_toko") {
      return NextResponse.json(
        {
          error: "Pelaporan mandiri oleh Tim Toko saat ini dinonaktifkan sementara. Laporan ditangani langsung melalui tim operasional cabang (BMS/BES).",
          code: "STORE_SELF_REPORT_DISABLED",
        },
        { status: 403 }
      );
    }

    const body: IncidentRecord = await request.json();
    if (!body.id || !body.disasterType || !body.storeId) {
      return NextResponse.json(
        { error: "Data laporan tidak lengkap (id, disasterType, storeId wajib diisi)" },
        { status: 400 }
      );
    }

    if (body.disasterType === "strong_wind") {
      return NextResponse.json(
        {
          error: "Kategori Angin Kencang dialihkan ke Hujan Lebat/Badai untuk pembuatan laporan baru.",
          code: "STRONG_WIND_MERGED",
        },
        { status: 400 }
      );
    }

    if (sessionUser.scope !== "HO") {
      if (body.branch.trim().toLowerCase() !== (sessionUser.branch || "").trim().toLowerCase()) {
        return NextResponse.json(
          { error: "Unauthorized: Tidak dapat membuat laporan untuk cabang lain" },
          { status: 403 }
        );
      }
    }

    const created = await dbCreateIncident(body);
    
    // Trigger distribution (Email/WA)
    await ReportDistributionService.distributeReport(created.id, created.branch, created);

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/incidents]", err);
    return NextResponse.json(
      { error: "Gagal membuat laporan baru" },
      { status: 500 }
    );
  }
}
