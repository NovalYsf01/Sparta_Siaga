/**
 * SPARTA SIAGA — Branch Manager Decision API
 * POST /api/incidents/[id]/approval
 */

import { NextResponse } from "next/server";
import { dbGetIncidentById, dbUpdateIncident } from "@/lib/incident-db";
import { canApproveAsBmAsync } from "@/lib/permission-service";
import { getSessionUser } from "@/lib/auth";
import { BmDecision, DamageReport } from "@/types/incident";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const report = await dbGetIncidentById(id);
    if (!report) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized: Sesi login diperlukan." }, { status: 401 });
    }

    const bmAuth = await canApproveAsBmAsync(sessionUser, report);
    if (!bmAuth.authorized) {
      return NextResponse.json(
        { error: bmAuth.reason || "Unauthorized: Hanya Branch Manager yang dapat memberikan persetujuan." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawDecision = (body.decision as string) || "";
    const validDecisions: BmDecision[] = ["approved", "safe", "rejected", "clarification_requested"];
    if (!validDecisions.includes(rawDecision as BmDecision)) {
      return NextResponse.json(
        { error: "Keputusan Branch Manager tidak valid. Pilihan: approved, safe, rejected, clarification_requested." },
        { status: 400 }
      );
    }

    const decision = rawDecision as BmDecision;
    const notes = (body.notes as string)?.trim() || "";
    const reason = (body.reason as string)?.trim() || notes;

    if ((decision === "rejected" || decision === "clarification_requested") && !reason) {
      return NextResponse.json(
        {
          error: decision === "rejected"
            ? "Alasan penolakan laporan wajib diisi."
            : "Catatan klarifikasi kepada petugas pemeriksa wajib diisi.",
        },
        { status: 400 }
      );
    }

    const nowWib = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
    let newStatus: typeof report.status;
    let timelineLabel: string;

    const actorRoleTitle = sessionUser.systemRole === "ADMIN" ? "Admin SPARTA SIAGA" : "Building & Maintenance Manager";
    const actorRoleTag = sessionUser.systemRole === "ADMIN" ? "ADMIN" : "BMM";

    switch (decision) {
      case "approved":
        newStatus = "confirmed_affected";
        timelineLabel = `Pemeriksaan Disetujui ${actorRoleTitle}: Laporan dinyatakan terkena dampak dan siap ditindaklanjuti. Catatan: ${notes || "Disetujui untuk perbaikan."}`;
        break;
      case "safe":
        newStatus = "confirmed_safe";
        timelineLabel = `Kondisi Dinyatakan Aman oleh ${actorRoleTitle}: Tidak ditemukan kerusakan operasional yang memerlukan tindakan. Catatan: ${notes || "Aman."}`;
        break;
      case "rejected":
        newStatus = "rejected_invalid";
        timelineLabel = `Laporan Ditolak oleh ${actorRoleTitle} (Tidak Valid / Hoax): ${reason}`;
        break;
      case "clarification_requested":
        newStatus = "clarification_requested";
        timelineLabel = `${actorRoleTitle} Meminta Klarifikasi Hasil Pemeriksaan: ${reason}`;
        break;
    }

    const existingVerification = report.verification;
    const updatedVerification: DamageReport = {
      ...(existingVerification || {
        confirmedBy: "Petugas Lapangan",
        confirmedAt: nowWib,
        isDamaged: decision === "approved",
      }),
      isDamaged: decision === "approved",
      bmApproval: {
        decision,
        decidedBy: `${sessionUser.name} (${actorRoleTag})`,
        decidedAt: nowWib,
        decisionNotes: notes,
        rejectionReason: decision === "rejected" ? reason : undefined,
        clarificationReason: decision === "clarification_requested" ? reason : undefined,
      },
    };

    const timelineEntry = {
      stage: `Keputusan ${actorRoleTitle}`,
      label: timelineLabel,
      timestamp: nowWib,
      actor: `${sessionUser.name} (${actorRoleTag})`,
      notes: reason || notes,
    };

    await dbUpdateIncident(id, {
      status: newStatus,
      verification: updatedVerification,
      timeline: [...(report.timeline || []), timelineEntry],
    });

    return NextResponse.json({
      data: {
        report_id: id,
        status: newStatus,
        decision,
        decided_by: sessionUser.name,
        decided_at: nowWib,
      },
    });
  } catch (err) {
    console.error("[POST /api/incidents/:id/approval]", err);
    return NextResponse.json({ error: "Gagal menyimpan keputusan Branch Manager." }, { status: 500 });
  }
}
