"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Check,
  XCircle,
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Building,
  UserCheck,
} from "lucide-react";
import { IncidentRecord } from "@/types/incident";
import {
  CompletionApprovalRecord,
  CompletionApprovalHistoryRecord,
  ApprovalRouteResolution,
} from "@/lib/completion-approval-service";

interface CompletionApprovalCardProps {
  incident: IncidentRecord;
  approval: CompletionApprovalRecord | null;
  route: ApprovalRouteResolution | null;
  history: CompletionApprovalHistoryRecord[];
  latestProgress: number;
  hasFinalEvidence: boolean;
  userRole?: string | null;
  userBranch?: string | null;
  userSystemRole?: string;
  canSubmitCompletion: boolean;
  submitCompletionReason?: string;
  canApproveCoordinator: boolean;
  approveCoordinatorReason?: string;
  canClose: boolean;
  closeReason?: string;
  onRefresh: () => void;
}

export function CompletionApprovalCard({
  incident,
  approval,
  route,
  history,
  latestProgress,
  hasFinalEvidence,
  userRole,
  userBranch,
  userSystemRole,
  canSubmitCompletion,
  submitCompletionReason,
  canApproveCoordinator,
  approveCoordinatorReason,
  canClose,
  closeReason,
  onRefresh,
}: CompletionApprovalCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog State
  const [activeModal, setActiveModal] = useState<"submit" | "approve" | "reject" | null>(null);
  const [notesInput, setNotesInput] = useState("");

  const isCompleted = latestProgress === 100 && hasFinalEvidence;
  const isResolved = incident.status === "resolved" || approval?.status === "CLOSED";
  const status = approval?.status || "WAITING_PIC_SUBMISSION";

  const cleanUserBranch = (userBranch || "").trim().toLowerCase();
  const cleanReportBranch = (incident.branch || "").trim().toLowerCase();
  const isSameBranch = cleanUserBranch === cleanReportBranch;
  const isSysAdmin = userSystemRole === "ADMIN";

  const handleAction = async (actionType: "submit" | "approve" | "reject") => {
    setActionLoading(true);
    setErrorMessage(null);

    try {
      let endpoint = `/api/incidents/${incident.id}/completion/${actionType}`;
      let body: any = {};

      if (actionType === "submit") {
        body = { notes: notesInput.trim() };
      } else if (actionType === "approve") {
        body = { notes: notesInput.trim() };
      } else if (actionType === "reject") {
        if (!notesInput.trim()) {
          setErrorMessage("Alasan penolakan / revisi wajib diisi.");
          setActionLoading(false);
          return;
        }
        body = { reason: notesInput.trim() };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(json.error || "Gagal memproses aksi persetujuan.");
      } else {
        setActiveModal(null);
        setNotesInput("");
        onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan jaringan atau sistem.");
    } finally {
      setActionLoading(false);
    }
  };

  // Determine current step index for stepped visual
  // 0: Physical Work, 1: PIC Submission, 2: Coordinator Approval, 3: BM Approval & Close
  let currentStep = 0;
  if (isCompleted) {
    if (status === "WAITING_PIC_SUBMISSION") currentStep = 1;
    else if (status === "REVISION_REQUIRED") currentStep = 1;
    else if (status === "WAITING_COORDINATOR_APPROVAL") currentStep = 2;
    else if (status === "WAITING_MANAGER_APPROVAL") currentStep = 3;
    else if (status === "CLOSED" || isResolved) currentStep = 4;
  }

  const picLabel = route ? route.picRole.toUpperCase() : "PIC LAPANGAN";
  const coordLabel = route ? route.coordinatorRole.toUpperCase() : "KOORDINATOR";

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            8. Alur Persetujuan Penyelesaian & Case Close
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Jalur: {route?.flowType || "BMS"} • {picLabel} → {coordLabel} → Branch Manager (BM {incident.branch})
          </p>
        </div>

        {/* Current State Badge */}
        <div>
          {isResolved ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Case Closed
            </span>
          ) : status === "REVISION_REQUIRED" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Revisi Diminta
            </span>
          ) : status === "WAITING_COORDINATOR_APPROVAL" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Menunggu Review {coordLabel}
            </span>
          ) : status === "WAITING_MANAGER_APPROVAL" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Menunggu Approval BM
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Menunggu Pengajuan {picLabel}
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stepped Visual Chain */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
          {/* Step 1: Fisik Selesai */}
          <div
            className={`p-2 rounded-lg border ${
              isCompleted
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
              <span>1. Fisik 100%</span>
            </div>
            <span className="text-[9px] font-normal block opacity-80">
              {isCompleted ? "Handover Ada" : "Belum Siap"}
            </span>
          </div>

          {/* Step 2: PIC Submit */}
          <div
            className={`p-2 rounded-lg border ${
              currentStep >= 2
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                : currentStep === 1
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {currentStep >= 2 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : currentStep === 1 ? (
                <Send className="w-3 h-3 text-blue-600" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>2. PIC ({picLabel})</span>
            </div>
            <span className="text-[9px] font-normal block opacity-80">
              {approval?.picUserName ? `Diajukan` : "Menunggu"}
            </span>
          </div>

          {/* Step 3: Coordinator Approval */}
          <div
            className={`p-2 rounded-lg border ${
              currentStep >= 3
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                : currentStep === 2
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {currentStep >= 3 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : currentStep === 2 ? (
                <Clock className="w-3 h-3 text-amber-600" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>3. Koord ({coordLabel})</span>
            </div>
            <span className="text-[9px] font-normal block opacity-80">
              {approval?.coordinatorUserName ? "Disetujui" : "Menunggu"}
            </span>
          </div>

          {/* Step 4: Branch Manager Close */}
          <div
            className={`p-2 rounded-lg border ${
              currentStep >= 4
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                : currentStep === 3
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {currentStep >= 4 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : (
                <ShieldCheck className="w-3 h-3" />
              )}
              <span>4. Final BM</span>
            </div>
            <span className="text-[9px] font-normal block opacity-80">
              {isResolved ? "Case Closed" : "Menunggu"}
            </span>
          </div>
        </div>
      </div>

      {/* Revision Banner if status is REVISION_REQUIRED */}
      {status === "REVISION_REQUIRED" && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Revisi Diminta oleh {approval?.rejectedByRole?.toUpperCase()} ({approval?.rejectedByUserName || "Approver"}):</span>
          </div>
          <p className="text-[11px] pl-5.5 italic bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900">
            &ldquo;{approval?.rejectionReason || "Harap lengkapi bukti dan verifikasi kembali."}&rdquo;
          </p>
          <p className="text-[10px] text-rose-600 dark:text-rose-400 pl-5.5">
            PIC lapangan ({picLabel}) dapat memperbaiki pekerjaan/bukti lalu mengajukan penyelesaian ulang.
          </p>
        </div>
      )}

      {/* Action Area based on Role and Stage */}
      {!isResolved && (
        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          {/* STAGE 1: WAITING_PIC_SUBMISSION or REVISION_REQUIRED */}
          {(status === "WAITING_PIC_SUBMISSION" || status === "REVISION_REQUIRED") && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tahap 1: Pengajuan Penyelesaian Lapangan
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  PIC resmi: <span className="font-semibold text-blue-600 dark:text-blue-400">{picLabel}</span> cabang {incident.branch}.
                </p>
              </div>

              {!isCompleted ? (
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Prasyarat belum lengkap (100% + Bukti Handover)
                </span>
              ) : isSysAdmin ? (
                <span className="text-xs text-slate-400 flex items-center gap-1" title="Zero Operational Bypass">
                  <Lock className="w-3.5 h-3.5" /> Read-Only (System Administrator)
                </span>
              ) : canSubmitCompletion ? (
                <button
                  type="button"
                  onClick={() => {
                    setNotesInput("");
                    setActiveModal("submit");
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Ajukan Penyelesaian
                </button>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1" title={submitCompletionReason}>
                  <Lock className="w-3.5 h-3.5" /> Menunggu Pengajuan {picLabel} ({incident.branch})
                </span>
              )}
            </div>
          )}

          {/* STAGE 2: WAITING_COORDINATOR_APPROVAL */}
          {status === "WAITING_COORDINATOR_APPROVAL" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tahap 2: Verifikasi & Persetujuan Koordinator
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Menunggu verifikasi dari <span className="font-semibold text-amber-600 dark:text-amber-400">{coordLabel}</span> cabang {incident.branch}.
                </p>
              </div>

              {isSysAdmin ? (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Read-Only (System Administrator)
                </span>
              ) : canApproveCoordinator ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotesInput("");
                      setActiveModal("reject");
                    }}
                    className="px-3.5 py-2 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Minta Revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesInput("");
                      setActiveModal("approve");
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Setujui Penyelesaian
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1" title={approveCoordinatorReason}>
                  <Lock className="w-3.5 h-3.5" /> Menunggu Review {coordLabel} ({incident.branch})
                </span>
              )}
            </div>
          )}

          {/* STAGE 3: WAITING_MANAGER_APPROVAL */}
          {status === "WAITING_MANAGER_APPROVAL" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tahap 3: Persetujuan Final Branch Manager & Case Close
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Koordinator ({coordLabel}) telah menyetujui. Menunggu persetujuan <span className="font-semibold text-emerald-600 dark:text-emerald-400">Branch Manager</span> cabang {incident.branch}.
                </p>
              </div>

              {isSysAdmin ? (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Read-Only (System Administrator)
                </span>
              ) : canClose && isSameBranch && userRole?.toLowerCase() === "bm" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotesInput("");
                      setActiveModal("reject");
                    }}
                    className="px-3.5 py-2 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Minta Revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesInput("");
                      setActiveModal("approve");
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Final Approve & Case Close
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400 flex items-center gap-1" title={closeReason}>
                  <Lock className="w-3.5 h-3.5" /> Menunggu Approval BM ({incident.branch})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Collapsible Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
        >
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>Riwayat Persetujuan & Audit ({history.length} catatan)</span>
        </button>

        {showHistory && (
          <div className="mt-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 text-xs">
            {history.length === 0 ? (
              <p className="text-slate-400 text-[11px] italic">Belum ada riwayat persetujuan untuk laporan ini.</p>
            ) : (
              <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h) => (
                  <div key={h.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {h.action}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono uppercase">
                          {h.actorRole}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Oleh: {h.actorName} • Cabang: {h.branch || "-"}
                      </p>
                      {h.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900/60 p-1.5 rounded border border-slate-100 dark:border-slate-800 mt-1">
                          &ldquo;{h.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation / Notes Dialog */}
      {activeModal && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              {activeModal === "submit" && <Send className="w-4 h-4 text-blue-600" />}
              {activeModal === "approve" && <Check className="w-4 h-4 text-emerald-600" />}
              {activeModal === "reject" && <XCircle className="w-4 h-4 text-rose-600" />}
              <span>
                {activeModal === "submit"
                  ? "Ajukan Penyelesaian Pekerjaan"
                  : activeModal === "approve"
                  ? userRole?.toLowerCase() === "bm"
                    ? "Konfirmasi Final Approval & Case Close"
                    : "Persetujuan Koordinator"
                  : "Minta Revisi Pekerjaan"}
              </span>
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeModal === "submit"
                ? "Pastikan pekerjaan fisik 100% selesai dan foto serah terima (HANDOVER) telah terlampir."
                : activeModal === "approve"
                ? userRole?.toLowerCase() === "bm"
                  ? "Persetujuan Branch Manager akan mengubah status laporan menjadi RESOLVED dan menutup laporan secara resmi."
                  : "Persetujuan Koordinator akan meneruskan laporan ke tahap akhir (Branch Manager Approval)."
                : "Tuliskan alasan atau bagian yang perlu direvisi secara jelas agar PIC dapat memperbaikinya."}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {activeModal === "reject" ? "Alasan Revisi (Wajib):" : "Catatan (Opsional):"}
              </label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={3}
                placeholder={
                  activeModal === "reject"
                    ? "Contoh: Foto serah terima bagian atap belum jelas, mohon foto ulang."
                    : "Tuliskan catatan tambahan jika ada..."
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction(activeModal)}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 ${
                  activeModal === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : activeModal === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {actionLoading ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
