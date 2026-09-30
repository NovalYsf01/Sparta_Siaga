/**
 * SPARTA SIAGA — Branch Field Confirmation API
 * POST /api/incidents/[id]/confirm
 *
 * Per flowchart: Cabang terdampak dapat mengonfirmasi kondisi lapangan.
 * Cabang tidak terdampak TIDAK boleh mengonfirmasi laporan ini.
 *
 * Authorization:
 * - Only the branch that matches report.branch may confirm.
 * - HO roles cannot confirm (operational action, not monitoring).
 *
 * NOTE: Full SSO session integration is pending.
 * For now, branch and role are supplied in request body with a structural auth check.
 * When SSO is integrated, extract these from session token.
 */

import { NextResponse } from "next/server";
import { dbGetIncidentById, dbUpdateIncident } from "@/lib/incident-db";
import { canConfirmAffectedStore } from "@/lib/report-permissions";
import { SpartaRole } from "@/types/incident";
import { getSessionUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const report = await dbGetIncidentById(id);
    if (!report) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized: Server identity missing or invalid" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      is_damaged,
      damage_notes,
      operational_status,
      kode_toko,  // optional: specific store being confirmed
    } = body as {
      is_damaged: boolean;
      damage_notes?: string;
      operational_status?: "Buka Normal" | "Tutup Sementara";
      kode_toko?: string;
    };

    if (is_damaged === undefined) {
      return NextResponse.json(
        { error: "is_damaged wajib diisi" },
        { status: 400 }
      );
    }

    // Server-side permission check from trusted identity: only affected branch may confirm
    if (!canConfirmAffectedStore(sessionUser.role, sessionUser.branch, report)) {
      return NextResponse.json(
        {
          error: "Unauthorized: Hanya cabang terdampak yang dapat mengonfirmasi kondisi toko. Cabang tidak terdampak hanya menerima informasi awareness.",
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const nowWib = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

    // Update affected stores confirmation status
    const updatedAffectedStores = (report.affectedStores ?? []).map((store) => {
      if (kode_toko && store.kode_toko !== kode_toko) return store;
      return {
        ...store,
        confirmation_status: is_damaged ? ("confirmed_damaged" as const) : ("confirmed_safe" as const),
        confirmed_by: sessionUser.name,
        confirmed_at: now,
        damage_notes: damage_notes ?? store.damage_notes,
      };
    });

    // Update overall report verification
    const verification = {
      confirmedBy: sessionUser.name,
      confirmedAt: nowWib,
      isDamaged: is_damaged,
      notes: damage_notes,
      operationalStatus: operational_status,
    };

    const newStatus = is_damaged ? "confirmed_affected" as const : "confirmed_safe" as const;

    const timelineEntry = {
      stage: "Konfirmasi Lapangan",
      label: is_damaged
        ? `Cabang ${sessionUser.branch} mengonfirmasi: terdapat dampak. Status operasional: ${operational_status ?? "Belum dilaporkan"}`
        : `Cabang ${sessionUser.branch} mengonfirmasi: aman, tidak ada dampak signifikan.`,
      timestamp: nowWib,
      actor: sessionUser.name,
      notes: damage_notes,
    };

    await dbUpdateIncident(id, {
      status: newStatus,
      affectedStores: updatedAffectedStores,
      verification,
      timeline: [...(report.timeline ?? []), timelineEntry],
    });

    return NextResponse.json({
      data: {
        report_id: id,
        confirmed_by: sessionUser.name,
        confirmed_at: now,
        is_damaged,
        new_status: newStatus,
      },
    });
  } catch (err) {
    console.error("[POST /api/incidents/:id/confirm]", err);
    return NextResponse.json({ error: "Gagal menyimpan konfirmasi" }, { status: 500 });
  }
}
