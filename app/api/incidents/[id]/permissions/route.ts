import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { checkUserPermission } from "@/lib/permission-service";

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

    const [
      confirmResult,
      followUpResult,
      updateProgressResult,
      closeResult,
      instructionResult,
      triggerEstimationResult,
      viewEstimationResult,
      readinessResult,
    ] = await Promise.all([
      checkUserPermission({ user: sessionUser, permission: "REPORT_CONFIRM", report: incident }),
      checkUserPermission({ user: sessionUser, permission: "REPORT_FOLLOW_UP", report: incident }),
      checkUserPermission({ user: sessionUser, permission: "REPORT_UPDATE_PROGRESS", report: incident }),
      checkUserPermission({ user: sessionUser, permission: "REPORT_CLOSE", report: incident }),
      checkUserPermission({ user: sessionUser, permission: "MANAGEMENT_INSTRUCTION_CREATE", report: incident }),
      checkUserPermission({ user: sessionUser, permission: "ESTIMATION_TRIGGER", report: incident }),
      checkUserPermission({ user: sessionUser, permission: "ESTIMATION_VIEW", report: incident }),
      checkUserPermission({ user: sessionUser, permission: "WORK_READINESS_UPDATE", report: incident }),
    ]);

    return NextResponse.json({
      data: {
        incidentId: incident.id,
        branch: incident.branch,
        canConfirm: confirmResult.authorized,
        confirmReason: confirmResult.reason || "",
        canFollowUp: followUpResult.authorized,
        followUpReason: followUpResult.reason || "",
        canUpdateProgress: updateProgressResult.authorized,
        updateProgressReason: updateProgressResult.reason || "",
        canClose: closeResult.authorized,
        closeReason: closeResult.reason || "",
        canCreateInstruction: instructionResult.authorized,
        canTriggerEstimation: triggerEstimationResult.authorized,
        triggerEstimationReason: triggerEstimationResult.reason || "",
        canViewEstimation: viewEstimationResult.authorized,
        canUpdateReadiness: readinessResult.authorized,
        updateReadinessReason: readinessResult.reason || "",
      },
    });
  } catch (err) {
    console.error("[GET /api/incidents/:id/permissions]", err);
    return NextResponse.json(
      { error: "Gagal memverifikasi permission laporan" },
      { status: 500 }
    );
  }
}
