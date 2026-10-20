import { IncidentRecord } from "@/types/incident";

export interface OperationalStatusBadge {
  label: string;
  color: string;
  cls: string;
  key: string;
}

/**
 * SPARTA SIAGA — Standardized Operational Handling Status Mapping
 * 
 * One consistent Indonesian display-label mapping across all interfaces:
 * - Menunggu Pengajuan Serah Terima (awaiting_st / WAITING_PIC_SUBMISSION)
 * - Menunggu Persetujuan Koordinator (WAITING_COORDINATOR_APPROVAL)
 * - Menunggu Persetujuan Akhir (WAITING_MANAGER_APPROVAL / pending_final_approval)
 * - Case Close (closed / resolved / CLOSED)
 * - Menunggu Persetujuan BnM (pending_bm_approval)
 * - Menunggu Verifikasi (verifying)
 * - Perlu Konfirmasi (pending_confirmation)
 * - Dalam Estimasi (in_estimation)
 * - SPK Diterbitkan / Menunggu SPK (awaiting_spk / spk_issued)
 * - Dalam Penanganan (in_maintenance / in_construction / investigating)
 * - Dinyatakan Aman (confirmed_safe)
 * - Belum Ditangani (unhandled initial state, 0% progress)
 */
export function getStandardizedOperationalStatus(inc: IncidentRecord): OperationalStatusBadge {
  const s = (inc.status as string)?.toLowerCase() || "";
  const approvalStatus =
    (inc as any).completionApprovalStatus ||
    (inc as any).completion_approval_status ||
    "";
  const progress = Number(inc.progress ?? 0);

  // 1. Terminal / Closed status
  if (s === "closed" || s === "resolved" || approvalStatus === "CLOSED") {
    return {
      label: "Case Close",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      key: "CLOSED",
    };
  }

  if (s === "confirmed_safe") {
    return {
      label: "Dinyatakan Aman",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
      key: "SAFE",
    };
  }

  if (s === "rejected_invalid") {
    return {
      label: "Ditolak",
      color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      key: "REJECTED",
    };
  }

  // 2. Completion & Handover Lifecycle (Distinct stages)
  if (approvalStatus === "WAITING_MANAGER_APPROVAL" || s === "pending_final_approval") {
    return {
      label: "Menunggu Persetujuan Akhir",
      color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
      cls: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
      key: "WAITING_MANAGER_APPROVAL",
    };
  }

  if (approvalStatus === "WAITING_COORDINATOR_APPROVAL") {
    return {
      label: "Menunggu Persetujuan Koordinator",
      color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
      cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
      key: "WAITING_COORDINATOR_APPROVAL",
    };
  }

  if (
    s === "awaiting_st" ||
    (progress >= 100 && s !== "closed" && s !== "resolved") ||
    (approvalStatus === "WAITING_PIC_SUBMISSION" && (s === "work_completed" || progress >= 100))
  ) {
    return {
      label: "Menunggu Pengajuan Serah Terima",
      color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
      cls: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
      key: "WAITING_PIC_SUBMISSION",
    };
  }

  if (
    approvalStatus === "REVISION_REQUIRED" ||
    s === "clarification_requested" ||
    s === "revision_requested"
  ) {
    return {
      label: "Perlu Klarifikasi / Revisi",
      color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      key: "REVISION",
    };
  }

  // 3. Upstream Decisions & Field Inspection
  if (s === "pending_bm_approval") {
    return {
      label: "Menunggu Persetujuan BnM",
      color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
      key: "PENDING_BM_APPROVAL",
    };
  }

  if (s === "verifying" || s === "waiting_approval") {
    return {
      label: "Menunggu Verifikasi",
      color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
      cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
      key: "VERIFYING",
    };
  }

  if (s === "pending_confirmation") {
    return {
      label: "Perlu Konfirmasi",
      color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
      key: "NEED_CONFIRMATION",
    };
  }

  // 4. Estimation & Preparation
  if (s === "in_estimation") {
    return {
      label: "Dalam Estimasi",
      color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      key: "IN_ESTIMATION",
    };
  }

  if (s === "awaiting_spk" || s === "spk_issued") {
    return {
      label: s === "spk_issued" ? "SPK Diterbitkan" : "Menunggu SPK",
      color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
      cls: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
      key: "SPK",
    };
  }

  // 5. Active physical execution
  if (
    s === "in_maintenance" ||
    s === "in_construction" ||
    s === "investigating" ||
    (progress > 0 && progress < 100)
  ) {
    return {
      label: "Dalam Penanganan",
      color: "bg-blue-50 text-[#1D5AA6] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      key: "IN_PROGRESS",
    };
  }

  // 6. Initial / Unhandled state
  return {
    label: "Belum Ditangani",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    key: "NOT_HANDLED",
  };
}
