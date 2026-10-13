import { NextResponse } from "next/server";
import {
  authenticateIntegrationRequest,
  logIntegrationSync,
} from "@/lib/integration-auth";
import { dbGetIncidentById, dbUpdateIncident } from "@/lib/incident-db";
import { getDbPool } from "@/lib/db";

export async function POST(request: Request) {
  const auth = await authenticateIntegrationRequest(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { client } = auth;

  try {
    const body = await request.json();
    const {
      incidentId,
      externalSystem,
      externalWorkId,
      workStatus,
      notes,
      updatedBy,
    } = body;

    if (!incidentId || !externalWorkId || !workStatus) {
      return NextResponse.json(
        {
          error:
            "Validasi Gagal: Field 'incidentId', 'externalWorkId', dan 'workStatus' wajib diisi.",
        },
        { status: 400 }
      );
    }

    const incident = await dbGetIncidentById(incidentId);
    if (!incident) {
      return NextResponse.json(
        { error: `Insiden '${incidentId}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    // Scope check: Toko vs DC
    const isToko = incident.tkpType === "toko" || !incident.tkpType;
    if (client.scope === "TOKO_ONLY" && !isToko) {
      return NextResponse.json(
        {
          error: `Akses Ditolak: Aplikasi '${client.appName}' hanya berwenang untuk fasilitas Toko/Gerai.`,
        },
        { status: 403 }
      );
    }

    if (client.scope === "DC_ONLY" && isToko) {
      return NextResponse.json(
        {
          error: `Akses Ditolak: Aplikasi '${client.appName}' hanya berwenang untuk fasilitas Warehouse/DC.`,
        },
        { status: 403 }
      );
    }

    const now = new Date();
    const timestampStr = now.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const systemLabel =
      client.appName === "sparta_maintenance"
        ? "SPARTA Maintenance"
        : client.appName === "engineering_support"
        ? "Engineering Support"
        : client.appName;

    // Append to timeline preserving all prior history
    const newTimelineItem = {
      stage: `Sinkronisasi ${systemLabel}`,
      label: `Pembaruan Pekerjaan: ${workStatus}`,
      timestamp: timestampStr,
      actor: updatedBy || `${systemLabel} Sync`,
      notes: notes || `Update pekerjaan dari ${systemLabel} (Nomor WO: ${externalWorkId})`,
    };

    // Update in Database (Additive external fields, zero milestone override)
    const pool = getDbPool();
    await pool.query(
      `UPDATE incidents 
       SET external_work_id = $1,
           external_system = $2,
           external_work_status = $3,
           external_synced_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [externalWorkId, client.appName, workStatus, incidentId]
    );

    // Update incident in store & db
    await dbUpdateIncident(incidentId, {
      externalWorkId,
      externalSystem: client.appName,
      externalWorkStatus: workStatus,
      externalSyncedAt: now.toISOString(),
      timeline: [...incident.timeline, newTimelineItem],
    });

    await logIntegrationSync({
      incidentId,
      externalSystem: client.appName,
      externalWorkId,
      action: "WORK_UPDATE",
      payload: { externalWorkId, workStatus, notes, updatedBy },
      responseStatus: 200,
    });

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi pekerjaan '${externalWorkId}' berhasil dicatat di SPARTA SIAGA.`,
      data: {
        incidentId,
        externalWorkId,
        externalSystem: client.appName,
        workStatus,
        syncedAt: now.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[POST /api/integrations/v1/work-updates] Error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pembaruan pekerjaan eksternal." },
      { status: 500 }
    );
  }
}
