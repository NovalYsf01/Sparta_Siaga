/**
 * SPARTA SIAGA — Report Permission Helpers
 * 
 * Implements VISIBLE vs ACTIONABLE separation per flowchart business rules.
 * 
 * Core principles:
 * - NOTIFIED != AUTHORIZED TO ACT
 * - HO monitors; GM/SM HO can give management instructions
 * - Only affected branches confirm and follow up
 * - Unaffected branches receive awareness only
 */

import { SpartaRole, IncidentRecord } from "@/types/incident";

// ============================================================
// VIEW PERMISSION
// ============================================================

/**
 * Any logged-in SPARTA user can view any report for awareness/monitoring.
 * HO staff see all. Branch staff see all but can only act on their own branch.
 */
export function canViewReport(
  userRole: SpartaRole,
  _report: IncidentRecord
): boolean {
  // All authenticated roles can view for awareness
  const viewableRoles: SpartaRole[] = [
    "ho_admin", "gm_ho", "sm_ho",
    "bm", "bnm", "bbc", "bmc", "bec", "bes", "bms",
    "tim_toko", "tim_maintenance", "tim_office", "tim_warehouse",
  ];
  return viewableRoles.includes(userRole);
}

// ============================================================
// ACTION PERMISSION — Branch Operational Actions
// ============================================================

/**
 * Determines if a user can perform branch operational actions on this report.
 * 
 * Rules:
 * - HO (all types) cannot perform branch operational follow-up
 * - GM/SM HO can only create management instructions (separate function)
 * - Only the affected branch (matching report.branch) can act
 */
export function canActOnReport(
  userRole: SpartaRole,
  userBranch: string,
  report: IncidentRecord
): boolean {
  // HO roles: no operational branch action
  const hoRoles: SpartaRole[] = ["ho_admin", "gm_ho", "sm_ho"];
  if (hoRoles.includes(userRole)) return false;

  // Branch staff: only their own branch
  const normalizedUserBranch = userBranch.trim().toLowerCase();
  const normalizedReportBranch = report.branch.trim().toLowerCase();
  return normalizedUserBranch === normalizedReportBranch;
}

/**
 * Determines if a user can confirm affected store status (field confirmation).
 * 
 * Only the branch that has stores in the affected list can confirm.
 */
export function canConfirmAffectedStore(
  userRole: SpartaRole,
  userBranch: string,
  report: IncidentRecord
): boolean {
  const hoRoles: SpartaRole[] = ["ho_admin", "gm_ho", "sm_ho"];
  if (hoRoles.includes(userRole)) return false;
  return canActOnReport(userRole, userBranch, report);
}

// ============================================================
// GM / SM HO MANAGEMENT INSTRUCTION
// ============================================================

/**
 * Only GM and SM HO can create management instructions on reports.
 * Per flowchart: instruction then distributed via WA to BnM, BBC, BMC, BES.
 */
export function canCreateManagementInstruction(
  userRole: SpartaRole
): boolean {
  return userRole === "gm_ho" || userRole === "sm_ho";
}

// ============================================================
// ESTIMATION
// ============================================================

/**
 * Menu MTC/ES → Buat Estimasi / Update Progres.
 * Per flowchart entry point: Input NIK & Nama → TKP Toko/DC → Pilih Nomor Laporan.
 * Roles: tim_maintenance and similar operational roles.
 * 
 * NOTE: Routing to MTC/ES vs BLD is MANUAL selection per flowchart — not automatic.
 */
export function canCreateEstimation(
  userRole: SpartaRole,
  userBranch: string,
  report: IncidentRecord
): boolean {
  const hoRoles: SpartaRole[] = ["ho_admin", "gm_ho", "sm_ho"];
  if (hoRoles.includes(userRole)) return false;
  return canActOnReport(userRole, userBranch, report);
}

export function canUpdateProgress(
  userRole: SpartaRole,
  userBranch: string,
  report: IncidentRecord
): boolean {
  return canActOnReport(userRole, userBranch, report);
}

// ============================================================
// CLOSE / RESOLVE
// ============================================================

export function canCloseReport(
  _userRole: SpartaRole,
  _userBranch: string,
  _report: IncidentRecord
): boolean {
  // BUSINESS REQUIREMENT: "CLOSE LAPORAN" actor is NOT yet confirmed by flowchart.
  // DO NOT assume affected branch can close.
  // DO NOT invent rules.
  // For now: TBD, fail-closed until business rule is clear.
  return false;
}

// ============================================================
// UTILITY — Check if branch is "affected" by a report
// ============================================================

/**
 * A branch is considered "affected" if the report belongs to that branch
 * (i.e., report.branch matches the user's branch).
 * 
 * Unaffected branches can view (awareness) but cannot act.
 */
export function isBranchAffected(
  userBranch: string,
  report: IncidentRecord
): boolean {
  return (
    report.branch.trim().toLowerCase() === userBranch.trim().toLowerCase()
  );
}

// ============================================================
// SERVER-SIDE GUARD — for use in API route handlers
// ============================================================

export interface UserContext {
  id: string;
  name: string;
  role: SpartaRole;
  branch: string;
}

/**
 * Server-side authorization guard for mutation operations.
 * Call this at the beginning of any API route that performs mutations.
 * 
 * Returns:
 * - { authorized: true } if allowed
 * - { authorized: false, reason: string } if denied
 * 
 * NOTE: Currently a structural stub — full auth integration requires SSO session.
 * Callers should integrate with session/token validation.
 */
export function checkMutationAuthorization(
  action: "confirm" | "act" | "create_instruction" | "create_estimation" | "update_progress" | "close",
  user: UserContext,
  report: IncidentRecord
): { authorized: boolean; reason?: string } {
  switch (action) {
    case "create_instruction":
      if (!canCreateManagementInstruction(user.role)) {
        return { authorized: false, reason: "Hanya GM/SM HO yang dapat membuat instruksi manajemen" };
      }
      return { authorized: true };

    case "confirm":
      if (!canConfirmAffectedStore(user.role, user.branch, report)) {
        return {
          authorized: false,
          reason: "Hanya cabang yang terdampak yang dapat mengonfirmasi kondisi toko",
        };
      }
      return { authorized: true };

    case "act":
    case "create_estimation":
    case "update_progress":
      if (!canActOnReport(user.role, user.branch, report)) {
        return {
          authorized: false,
          reason: "Aksi operasional hanya dapat dilakukan oleh cabang terdampak",
        };
      }
      return { authorized: true };

    case "close":
      if (!canCloseReport(user.role, user.branch, report)) {
        return {
          authorized: false,
          reason: "Penutupan laporan hanya dapat dilakukan oleh cabang terdampak",
        };
      }
      return { authorized: true };

    default:
      return { authorized: false, reason: "Unknown action" };
  }
}
