import { normalizeBranchCode } from "./branch-utils";
import type { IncidentRecord, IncidentStatus } from "../types/incident";
import type { UserContext } from "./report-permissions";
import type {
  InitialWorkflowStatus,
  InspectionSubmissionInput,
  InspectionValidationResult,
  ManagerDecisionType,
} from "../types/report-workflow";

const INSPECTION_STATUSES = new Set<IncidentStatus>([
  "draft",
  "preliminary_unverified",
  "field_inspection_required",
  "clarification_required",
]);

const TECHNICAL_STATUSES = new Set<IncidentStatus>([
  "confirmed_affected",
  "investigating",
  "in_estimation",
  "awaiting_spk",
  "spk_issued",
  "in_maintenance",
  "in_construction",
  "awaiting_st",
  "resolved",
]);

function normalizeStoreId(value?: string | null): string {
  return (value || "").trim().toUpperCase();
}

export function sameCanonicalBranch(left?: string | null, right?: string | null): boolean {
  const leftCode = normalizeBranchCode(left);
  const rightCode = normalizeBranchCode(right);
  return leftCode.length > 0 && leftCode === rightCode;
}

export function canSubmitInspection(user: UserContext, report: IncidentRecord): boolean {
  return user.systemRole !== "ADMIN"
    && user.scope === "BRANCH"
    && user.role === "tim_toko"
    && sameCanonicalBranch(user.branch, report.branch)
    && normalizeStoreId(user.storeId).length > 0
    && normalizeStoreId(user.storeId) === normalizeStoreId(report.storeId)
    && INSPECTION_STATUSES.has(report.status);
}

export function canConfirmInitialReport(user: UserContext, report: IncidentRecord): boolean {
  return user.systemRole !== "ADMIN"
    && user.scope === "BRANCH"
    && user.role === "bm"
    && sameCanonicalBranch(user.branch, report.branch)
    && report.status === "awaiting_manager_confirmation";
}

export function nextInitialStatus(
  current: IncidentStatus,
  decision: ManagerDecisionType,
): IncidentStatus {
  if (current !== "awaiting_manager_confirmation") {
    throw new Error(`Invalid initial confirmation transition from '${current}'.`);
  }

  if (decision === "DAMAGE_CONFIRMED") return "confirmed_affected";
  if (decision === "NO_DAMAGE_CONFIRMED") return "confirmed_safe";
  return "clarification_required";
}

export function validateInspectionSubmission(
  input: InspectionSubmissionInput,
): InspectionValidationResult {
  if (!input.conditionNotes.trim()) {
    return { valid: false, code: "CONDITION_NOTES_REQUIRED" };
  }

  const exceptionReason = input.emergencyExceptionReason?.trim() || "";
  if (input.evidenceCount < 1 && !exceptionReason) {
    return { valid: false, code: "EVIDENCE_OR_EXCEPTION_REQUIRED" };
  }

  if (input.emergencyExceptionReason !== undefined && !exceptionReason) {
    return { valid: false, code: "EMERGENCY_EXCEPTION_REASON_REQUIRED" };
  }

  return { valid: true };
}

export function isTechnicalWorkflowEligible(report: IncidentRecord): boolean {
  return TECHNICAL_STATUSES.has(report.status);
}

export function isInitialWorkflowStatus(status: IncidentStatus): status is InitialWorkflowStatus {
  return INSPECTION_STATUSES.has(status) || status === "awaiting_manager_confirmation";
}
