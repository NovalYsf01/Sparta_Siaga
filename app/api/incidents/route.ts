import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import { dbCreateIncident, dbGetAllIncidents } from "@/lib/incident-db";
import { canViewReport } from "@/lib/report-permissions";
import { checkUserPermission } from "@/lib/permission-service";
import type { DisasterType, IncidentRecord } from "@/types/incident";

export async function GET() {
  try {
    const actor = await getSessionUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const incidents = await dbGetAllIncidents();
    let globalView = actor.systemRole === "ADMIN" || actor.scope === "HO";
    if (!globalView) globalView = (await checkUserPermission({ user: actor, permission: "REPORT_VIEW_ALL" })).authorized;
    return NextResponse.json({ data: incidents.filter((item) => !item.id.startsWith("INC-TEST-") && (globalView || canViewReport(actor, item))) });
  } catch (error) {
    console.error("[GET /api/incidents]", error);
    return NextResponse.json({ error: "Gagal memuat data laporan" }, { status: 500 });
  }
}

interface CreateManualReportBody {
  disasterType: DisasterType;
  storeId: string;
  locationCity: string;
  description: string;
  preliminaryUnverified?: boolean;
  preliminaryReason?: string;
  earthquakeEventId?: string;
}

export async function POST(request: Request) {
  try {
    const actor = await getSessionUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (actor.systemRole === "ADMIN" || actor.role !== "tim_toko") {
      return NextResponse.json({ error: "Hanya Tim Toko yang dapat membuat laporan lapangan." }, { status: 403 });
    }
    const body = await request.json() as CreateManualReportBody;
    if (!body.disasterType || !body.storeId || !body.description?.trim()) {
      return NextResponse.json({ error: "Jenis kejadian, toko, dan deskripsi wajib diisi." }, { status: 400 });
    }
    if (!actor.storeId || actor.storeId.trim().toUpperCase() !== body.storeId.trim().toUpperCase()) {
      return NextResponse.json({ error: "Tim Toko hanya dapat membuat laporan untuk toko yang ditugaskan." }, { status: 403 });
    }
    if (body.preliminaryUnverified && !body.preliminaryReason?.trim()) {
      return NextResponse.json({ error: "Alasan informasi belum terverifikasi wajib diisi." }, { status: 400 });
    }

    const pool = getDbPool();
    const { rows } = await pool.query(
      `SELECT kode_toko, nama_toko, cabang, alamat FROM stores
       WHERE UPPER(kode_toko) = UPPER($1) OR UPPER(id) = UPPER($1) LIMIT 1`,
      [body.storeId],
    );
    const store = rows[0];
    if (!store) return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });
    if (store.cabang.trim().toUpperCase() !== (actor.branch || "").trim().toUpperCase()) {
      return NextResponse.json({ error: "Toko berada di luar cabang pengguna." }, { status: 403 });
    }

    const timestamp = new Date().toISOString();
    const incident: IncidentRecord = {
      id: `LAP-MAN-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      date: new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      disasterType: body.disasterType,
      reportOrigin: "manual",
      reporter: { id: actor.id, userId: actor.id, name: actor.name, nik: actor.nik, role: actor.role, branch: actor.branch, storeId: actor.storeId },
      earthquakeEventId: body.earthquakeEventId?.trim() || undefined,
      tkpType: "toko",
      storeId: store.kode_toko,
      storeName: store.nama_toko,
      branch: store.cabang,
      locationCity: body.locationCity?.trim() || store.alamat || store.cabang,
      status: body.preliminaryUnverified ? "preliminary_unverified" : "draft",
      progress: 0,
      latestInspectionVersion: 0,
      fieldPhotos: [],
      timeline: [{
        stage: body.preliminaryUnverified ? "Informasi Awal" : "Draft Laporan",
        label: body.preliminaryUnverified ? "Informasi Awal — Belum Terverifikasi" : "Draft laporan dibuat",
        timestamp,
        actor: actor.name,
        notes: body.preliminaryUnverified ? `${body.description.trim()} — ${body.preliminaryReason!.trim()}` : body.description.trim(),
      }],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const created = await dbCreateIncident(incident);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/incidents]", error);
    return NextResponse.json({ error: "Gagal membuat laporan baru" }, { status: 500 });
  }
}
