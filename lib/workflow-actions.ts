import type { UserContext } from "./report-permissions";
import type { IncidentRecord } from "@/types/incident";

export type WorkflowActionId =
  | "INSPECT"
  | "APPROVE_INITIAL"
  | "CREATE_ESTIMATION"
  | "UPDATE_READINESS"
  | "UPDATE_PROGRESS"
  | "SUBMIT_COMPLETION"
  | "APPROVE_COORDINATOR"
  | "FINAL_APPROVAL"
  | "CASE_CLOSE";

export interface WorkflowAction {
  id: WorkflowActionId;
  label: string;
  surface: "inspection" | "estimation" | "progress";
}

export interface WorkflowActionPermissions {
  canInspect?: boolean;
  canApproveInitial?: boolean;
  canCreateEstimation?: boolean;
  canUpdateReadiness?: boolean;
  canUpdateProgress?: boolean;
  canSubmitCompletion?: boolean;
  canApproveCoordinator?: boolean;
  canFinalApprove?: boolean;
  canClose?: boolean;
  completionStatus?: string | null;
}

export function deriveWorkflowActions(
  user: UserContext,
  report: IncidentRecord,
  permissions: WorkflowActionPermissions
): WorkflowAction[] {
  if (user.scope === "HO" || user.systemRole === "ADMIN") return [];

  const actions: WorkflowAction[] = [];
  const status = report.status;
  const completionStatus = permissions.completionStatus || report.completionApprovalStatus;

  if (permissions.canInspect && ["pending_confirmation", "verifying", "clarification_requested"].includes(status)) {
    actions.push({ id: "INSPECT", label: status === "clarification_requested" ? "Kirim Klarifikasi" : "Periksa Laporan", surface: "inspection" });
  }
  if (permissions.canApproveInitial && status === "pending_bm_approval") {
    actions.push({ id: "APPROVE_INITIAL", label: "Putuskan Pemeriksaan", surface: "inspection" });
  }
  if (permissions.canCreateEstimation && status === "confirmed_affected") {
    actions.push({ id: "CREATE_ESTIMATION", label: "Mulai Estimasi", surface: "estimation" });
  }
  if (permissions.canUpdateReadiness && ["in_estimation", "awaiting_spk", "spk_issued"].includes(status)) {
    actions.push({ id: "UPDATE_READINESS", label: "Lengkapi Kesiapan", surface: "progress" });
  }
  if (permissions.canUpdateProgress && ["in_maintenance", "in_construction", "revision_requested"].includes(status)) {
    actions.push({ id: "UPDATE_PROGRESS", label: "Perbarui Progres", surface: "progress" });
  }
  if (permissions.canSubmitCompletion && completionStatus === "WAITING_PIC_SUBMISSION" && report.progress >= 100) {
    actions.push({ id: "SUBMIT_COMPLETION", label: "Ajukan Serah Terima", surface: "progress" });
  }
  if (permissions.canApproveCoordinator && completionStatus === "WAITING_COORDINATOR_APPROVAL") {
    actions.push({ id: "APPROVE_COORDINATOR", label: "Review Serah Terima", surface: "progress" });
  }
  if (permissions.canFinalApprove && completionStatus === "WAITING_MANAGER_APPROVAL") {
    actions.push({ id: "FINAL_APPROVAL", label: "Final Approval", surface: "progress" });
  }
  if (permissions.canClose && completionStatus === "APPROVED_PENDING_CLOSE") {
    actions.push({ id: "CASE_CLOSE", label: "Case Close", surface: "progress" });
  }

  return actions;
}
