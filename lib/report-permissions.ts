/**
 * SPARTA SIAGA — Report Permission Helpers (Client-Safe)
 * 
 * Provides client-side synchronous authorization helpers for UI rendering and modals.
 * Pure logic — does NOT import database or server packages.
 */

import { SpartaRole, IncidentRecord, SystemRole, Scope } from "@/types/incident";

export interface UserContext {
  id: string;
  name: string;
  nik?: string | null;
  avatarUrl?: string | null;
  role: SpartaRole | null; // Business Role
  systemRole: SystemRole;
  scope: Scope | null;
  branch: string | null;
  storeId?: string | null;
}

// ============================================================
// SYNCHRONOUS CLIENT-SIDE HELPERS
// ============================================================

export function canViewReport(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.systemRole === "ADMIN" || user.scope === "HO") {
    return true; // HO and Admin see all
  }
  const userBranch = user.branch ? user.branch.trim().toLowerCase() : "";
  const reportBranch = report.branch ? report.branch.trim().toLowerCase() : "";
  return userBranch === reportBranch;
}

export function canActOnReport(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.systemRole === "ADMIN") return false; // System Admin has no operational action
  if (user.scope === "HO") return false;

  const userBranch = user.branch ? user.branch.trim().toLowerCase() : "";
  const reportBranch = report.branch ? report.branch.trim().toLowerCase() : "";
  return userBranch === reportBranch;
}

export function canConfirmAffectedStore(
  user: UserContext,
  report: IncidentRecord
): boolean {
  return canActOnReport(user, report);
}

export function canCreateManagementInstruction(
  user: UserContext
): boolean {
  if (user.systemRole === "ADMIN") return false; // System Admin has no operational action
  return user.role === "gm_ho" || user.role === "sm_ho";
}

export function canCreateEstimation(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.systemRole === "ADMIN") return false;
  if (user.role === "bms") {
    const userBranch = user.branch ? user.branch.trim().toLowerCase() : "";
    const reportBranch = report.branch ? report.branch.trim().toLowerCase() : "";
    return userBranch === reportBranch;
  }
  return false;
}

export function canUpdateProgress(
  user: UserContext,
  report: IncidentRecord
): boolean {
  return canActOnReport(user, report);
}

export function canCloseReport(
  user: UserContext,
  report: IncidentRecord
): boolean {
  return canActOnReport(user, report);
}

export function isBranchAffected(
  userBranch: string,
  report: IncidentRecord
): boolean {
  return (
    report.branch.trim().toLowerCase() === userBranch.trim().toLowerCase()
  );
}
