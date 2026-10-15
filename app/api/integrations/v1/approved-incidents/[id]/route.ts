import { NextResponse } from "next/server";
import {
  authenticateIntegrationRequest,
  logIntegrationSync,
} from "@/lib/integration-auth";
import { dbGetIncidentById } from "@/lib/incident-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await authenticateIntegrationRequest(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { client } = auth;
  const { id } = await params;

  try {
    const incident = await dbGetIncidentById(id);
    if (!incident) {
      return NextResponse.json(
        { error: `Insiden dengan ID '${id}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    // Must be confirmed_affected (disetujui BM)
    if (incident.status !== "confirmed_affected" && incident.status !== "in_maintenance" && incident.status !== "closed") {
      return NextResponse.json(
        {
          error: `Insiden '${id}' belum berstatus persetujuan BnM Manajer (Status saat ini: ${incident.status}).`,
        },
        { status: 400 }
      );
    }

    // Scope check: Toko vs DC
    const isToko = incident.tkpType === "toko" || !incident.tkpType;
    if (client.scope === "TOKO_ONLY" && !isToko) {
      return NextResponse.json(
        {
          error: `Akses Ditolak: Aplikasi '${client.appName}' hanya memiliki hak akses untuk fasilitas Toko/Gerai.`,
        },
        { status: 403 }
      );
    }

    if (client.scope === "DC_ONLY" && isToko) {
      return NextResponse.json(
        {
          error: `Akses Ditolak: Aplikasi '${client.appName}' hanya memiliki hak akses untuk fasilitas Warehouse/DC.`,
        },
        { status: 403 }
      );
    }

    // Branch restriction check
    if (
      client.branchRestriction &&
      client.branchRestriction.toUpperCase() !== incident.branch.toUpperCase()
    ) {
      return NextResponse.json(
        {
          error: `Akses Ditolak: API Key hanya mencakup cabang ${client.branchRestriction}. Insiden berada pada cabang ${incident.branch}.`,
        },
        { status: 403 }
      );
    }

    // Map evidence photos to secure API URLs
    const evidencePhotos = (incident.verification?.photos || []).map(
      (photoUrl, idx) => ({
        id: `photo_${idx + 1}`,
        photoUrl,
        downloadUrl: photoUrl,
      })
    );

    const detailData = {
      incidentId: incident.id,
      storeId: incident.storeId,
      storeName: incident.storeName,
      branch: incident.branch,
      locationCity: incident.locationCity,
      disasterType: incident.disasterType,
      reportOrigin: incident.reportOrigin,
      tkpType: incident.tkpType || "toko",
      status: incident.status,
      currentMilestoneProgress: incident.progress,
      verification: {
        confirmedBy: incident.verification?.confirmedBy,
        confirmedAt: incident.verification?.confirmedAt,
        inspectionMethod: incident.verification?.inspectionMethod,
        officerSource: incident.verification?.officerSource,
        severity: incident.verification?.severity,
        condition: incident.verification?.condition,
        operationalStatus: incident.verification?.operationalStatus,
        categories: incident.verification?.categories,
        notes: incident.verification?.notes,
        evidencePhotos,
      },
      branchManagerApproval: {
        decidedBy: incident.verification?.bmApproval?.decidedBy || "BnM Manajer",
        decidedAt: incident.verification?.bmApproval?.decidedAt || "-",
        decision: incident.verification?.bmApproval?.decision || "approved",
        notes:
          incident.verification?.bmApproval?.decisionNotes ||
          incident.verification?.bmApproval?.rejectionReason,
      },
      externalWork: {
        externalWorkId: incident.externalWorkId || null,
        externalSystem: incident.externalSystem || null,
        externalWorkStatus: incident.externalWorkStatus || null,
        externalSyncedAt: incident.externalSyncedAt || null,
      },
      timeline: incident.timeline,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
    };

    await logIntegrationSync({
      incidentId: incident.id,
      externalSystem: client.appName,
      action: "FETCH_INCIDENT_DETAIL",
      payload: { incidentId: incident.id },
      responseStatus: 200,
    });

    return NextResponse.json({
      success: true,
      data: detailData,
    });
  } catch (err: any) {
    console.error("[GET /api/integrations/v1/approved-incidents/:id] Error:", err);
    return NextResponse.json(
      { error: "Gagal memproses data rincian insiden." },
      { status: 500 }
    );
  }
}
