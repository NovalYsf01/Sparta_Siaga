/**
 * SPARTA SIAGA — Report Permission Helpers (Client-Safe)
 * 
 * Provides client-side synchronous authorization helpers for UI rendering and modals.
 * Pure logic — does NOT import database or server packages.
 */

import { SpartaRole, IncidentRecord, SystemRole, Scope, IncidentStatus } from "@/types/incident";

export interface UserContext {
  id: string;
  name: string;
  email?: string | null;
  nik?: string | null;
  avatarUrl?: string | null;
  role: SpartaRole | null; // Business Role
  systemRole: SystemRole;
  scope: Scope | null;
  branch: string | null;
}

// ============================================================
// SYNCHRONOUS CLIENT-SIDE HELPERS & HO VISIBILITY RULE
// ============================================================

/**
 * Aturan Visibilitas Laporan untuk Head Office (HO) — TASK T05B
 *
 * Prinsip:
 * 1. Pengecualian Laporan Otomatis Gempa:
 *    Laporan gempa yang benar-benar dibuat secara otomatis oleh sistem (reportOrigin === 'automatic_earthquake')
 *    langsung dapat dilihat oleh HO tanpa menunggu Approval Pemeriksaan Awal BnM Manajer.
 *    Laporan tetap menyajikan status verifikasi sebenarnya (misal: pending_confirmation, verifying).
 *
 * 2. Laporan Manual & Sumber Non-Otomatis Lainnya:
 *    Laporan manual yang dibuat cabang TIDAK boleh terlihat oleh HO sebelum menerima Approval Pemeriksaan Awal
 *    yang sah dari BnM Manajer.
 *    - Status belum disetujui (pending_confirmation, verifying, pending_bm_approval, clarification_requested,
 *      rejected_invalid, investigating) -> TIDAK terlihat HO.
 *    - Setelah disetujui BnM Manajer (bmApproval.decision === 'approved' | 'safe', atau status pasca-approval:
 *      confirmed_affected, confirmed_safe, in_estimation, in_maintenance, in_construction, awaiting_spk,
 *      spk_issued, awaiting_st, pending_final_approval, revision_requested, closed, resolved, archived)
 *      -> Terlihat HO (read-only).
 */
export function isReportVisibleToHo(report: IncidentRecord): boolean {
  if (!report) return false;

  // 1. Pengecualian Laporan Otomatis Gempa Sistem
  if (report.reportOrigin === "automatic_earthquake") {
    return true;
  }

  // 2. Laporan Manual (termasuk laporan gempa yang dibuat secara manual oleh user):
  // Blokir status-status yang belum/tidak menerima Approval Pemeriksaan Awal BnM
  const unapprovedStatuses: IncidentStatus[] = [
    "pending_confirmation",
    "verifying",
    "pending_bm_approval",
    "clarification_requested",
    "rejected_invalid",
    "investigating",
    "expired_unhandled",
  ];
  if (unapprovedStatuses.includes(report.status)) {
    return false;
  }

  // Cek keputusan BnM Manajer pada record verifikasi pemeriksaan awal
  const bmDecision = report.verification?.bmApproval?.decision;
  if (bmDecision === "approved" || bmDecision === "safe") {
    return true;
  }
  if (bmDecision === "rejected" || bmDecision === "clarification_requested") {
    return false;
  }

  // Status-status yang sudah melewati approval pemeriksaan awal
  const postApprovalStatuses: IncidentStatus[] = [
    "confirmed_affected",
    "confirmed_safe",
    "in_estimation",
    "awaiting_spk",
    "spk_issued",
    "in_maintenance",
    "in_construction",
    "awaiting_st",
    "pending_final_approval",
    "revision_requested",
    "resolved",
    "closed",
    "archived",
  ];
  if (postApprovalStatuses.includes(report.status)) {
    return true;
  }

  return false;
}

export function canViewReport(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.systemRole === "ADMIN") {
    return true; // Admin SPARTA SIAGA full access
  }
  if (user.scope === "HO") {
    return isReportVisibleToHo(report);
  }
  const userBranch = user.branch ? user.branch.trim().toLowerCase() : "";
  const reportBranch = report.branch ? report.branch.trim().toLowerCase() : "";
  return userBranch === reportBranch;
}

export function canActOnReport(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.scope === "HO") return false; // HO strictly read-only
  if (user.systemRole === "ADMIN") return true; // Admin SPARTA SIAGA full access

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

export function canInspectReport(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.systemRole === "ADMIN") return true; // Admin can inspect both Toko & DC across branches
  if (user.scope === "HO") return false;

  const userBranch = user.branch ? user.branch.trim().toLowerCase() : "";
  const reportBranch = report.branch ? report.branch.trim().toLowerCase() : "";
  if (userBranch !== reportBranch) return false;

  const tkp = report.tkpType || "toko";
  if (tkp === "dc") return user.role === "bes";
  if (tkp === "building") return user.role === "bbs";
  return user.role === "bms";
}

export function canApproveAsBm(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.systemRole === "ADMIN") return true; // Admin can approve across branches
  if (user.scope === "HO") return false;
  if (user.role !== "bm") return false;

  const userBranch = user.branch ? user.branch.trim().toLowerCase() : "";
  const reportBranch = report.branch ? report.branch.trim().toLowerCase() : "";
  return userBranch === reportBranch;
}

export function canCreateManagementInstruction(
  user: UserContext
): boolean {
  if (user.systemRole === "ADMIN") return true; // Admin has full access
  return user.role === "gm_ho" || user.role === "sm_ho";
}

export function canCreateEstimation(
  user: UserContext,
  report: IncidentRecord
): boolean {
  if (user.systemRole === "ADMIN") return true;
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
