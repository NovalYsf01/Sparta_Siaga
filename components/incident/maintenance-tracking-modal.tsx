"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Wrench,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  Calculator,
  Lock,
  Layers,
  FileText,
  FileCheck,
  Camera,
  Eye,
} from "lucide-react";
import { IncidentRecord, RoleType } from "@/types/incident";
import { EstimationModal } from "./estimation-modal";
import { EstimationStatusCard } from "./estimation-status-card";
import { EstimationRouteRecord } from "@/lib/estimation-service";
import { ProgressUpdateModal } from "./progress-update-modal";
import { ProgressTimeline } from "./progress-timeline";
import { CloseReportModal } from "./close-report-modal";
import { ProgressUpdateRecord, WorkStatus } from "@/lib/progress-service";
import { UserIdentity } from "@/lib/identity";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface MaintenanceTrackingModalProps {
  incident: IncidentRecord | null;
  activeRole: RoleType;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProgress?: (
    incidentId: string,
    newProgress: number,
    notes?: string,
    technician?: string
  ) => void;
  isReadOnly?: boolean;
}

export function MaintenanceTrackingModal({
  incident,
  isOpen,
  onClose,
  isReadOnly = false,
}: MaintenanceTrackingModalProps) {
  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  const [identity, setIdentity] = useState<UserIdentity | null>(null);

  // Estimation state
  const [estimationRoute, setEstimationRoute] = useState<EstimationRouteRecord | null>(null);
  const [isEstimationModalOpen, setIsEstimationModalOpen] = useState(false);

  // Progress state
  const [progressHistory, setProgressHistory] = useState<ProgressUpdateRecord[]>([]);
  const [latestProgress, setLatestProgress] = useState<number>(0);
  const [workStatus, setWorkStatus] = useState<WorkStatus>("NOT_STARTED");
  const [hasFinalEvidence, setHasFinalEvidence] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  // Close report state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Permissions state
  const [canUpdateProgress, setCanUpdateProgress] = useState(false);
  const [updateProgressReason, setUpdateProgressReason] = useState("");
  const [canClose, setCanClose] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [canTriggerEstimation, setCanTriggerEstimation] = useState(false);
  const [triggerEstimationReason, setTriggerEstimationReason] = useState("");

  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!incident) return;
    setLoading(true);

    try {
      const [meRes, permRes, estRes, progRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/incidents/${incident.id}/permissions`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/incidents/${incident.id}/estimation`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/incidents/${incident.id}/progress`).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (meRes) setIdentity(meRes.user || meRes);

      if (permRes?.data) {
        setCanUpdateProgress(permRes.data.canUpdateProgress);
        setUpdateProgressReason(permRes.data.updateProgressReason || "");
        setCanClose(permRes.data.canClose);
        setCloseReason(permRes.data.closeReason || "");
        setCanTriggerEstimation(permRes.data.canTriggerEstimation);
        setTriggerEstimationReason(permRes.data.triggerEstimationReason || "");
      }

      if (estRes?.data) {
        setEstimationRoute(estRes.data);
      } else {
        setEstimationRoute(null);
      }

      if (progRes?.data) {
        setProgressHistory(progRes.data.history || []);
        setLatestProgress(progRes.data.latestProgress ?? incident.progress ?? 0);
        setWorkStatus(progRes.data.workStatus || "NOT_STARTED");
        setHasFinalEvidence(progRes.data.hasFinalEvidence || false);
        if (progRes.data.canUpdateProgress !== undefined) {
          setCanUpdateProgress(progRes.data.canUpdateProgress);
        }
        if (progRes.data.canClose !== undefined) {
          setCanClose(progRes.data.canClose);
        }
      } else {
        setLatestProgress(incident.progress ?? 0);
      }
    } catch (err) {
      console.error("[MaintenanceTrackingModal] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && incident) {
      loadData();
    }
  }, [isOpen, incident]);

  if (!isOpen || !incident) return null;

  const isTkpToko = (incident.tkpType || "toko").toLowerCase() === "toko";
  const isWorkReadyForProgress =
    estimationRoute !== null &&
    (estimationRoute.workStatus === "READY_FOR_WORK" ||
      estimationRoute.workStatus === "IN_PROGRESS" ||
      estimationRoute.workStatus === "COMPLETED");

  const isProgress100 = latestProgress === 100;
  const isReportClosed = incident.status === "resolved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overscroll-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[85dvh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1D5AA6] dark:text-blue-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Detail Laporan & Tracking
                </h3>
                <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {incident.id}
                </span>
                {isReportClosed && (
                  <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Laporan Selesai
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {incident.storeName} ({incident.branch}) • {incident.disasterType?.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: 7 Structured Sections (Section AI) */}
        <div className="p-6 space-y-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {/* SECTION 1: INFORMASI LAPORAN (READ-ONLY) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                1. Informasi Laporan
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                Status: {incident.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Nomor Laporan</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {incident.id}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Jenis Bencana</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">
                  {incident.disasterType}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">TKP</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {isTkpToko ? "Toko / Gerai" : "DC (Distribution Center)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Tanggal Kejadian</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {incident.date || "-"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 font-semibold block">Nama & Kode Toko</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {incident.storeName} ({incident.storeId || "-"})
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 font-semibold block">Cabang</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {incident.branch} • {incident.locationCity}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: KONFIRMASI LAPANGAN */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              2. Konfirmasi Lapangan
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-semibold block">
                  {incident.verification?.isDamaged
                    ? "Toko Dikonfirmasi Terdampak Kerusakan"
                    : incident.verification?.isDamaged === false
                    ? "Toko Dikonfirmasi Aman / Tidak Ada Kerusakan"
                    : "Menunggu / Sudah Terverifikasi di Lapangan"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {incident.verification?.confirmedBy
                    ? `Oleh ${incident.verification.confirmedBy} (${incident.verification.confirmedAt})`
                    : "Informasi awal dari pelapor lapangan"}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Terverifikasi
              </span>
            </div>
          </div>

          {/* SECTION 3: ESTIMASI (Section L, Section D, Section M) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-600" />
                3. Estimasi Perbaikan
              </h4>

              {/* Action Button: Buat Estimasi vs Status Estimasi */}
              {estimationRoute ? (
                <button
                  type="button"
                  onClick={() => setIsEstimationModalOpen(true)}
                  className="text-xs font-bold text-[#1D5AA6] dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Lihat Rute Estimasi
                </button>
              ) : isTkpToko ? (
                canTriggerEstimation ? (
                  <button
                    type="button"
                    onClick={() => setIsEstimationModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    Buat Estimasi
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Buat Estimasi (Khusus BMS)
                  </span>
                )
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Alur DC Belum Tersedia
                </span>
              )}
            </div>

            {/* Display Estimation Status Card if created */}
            {estimationRoute ? (
              <EstimationStatusCard route={estimationRoute} />
            ) : !isTkpToko ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                Alur estimasi untuk lokasi DC belum tersedia.
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Estimasi belum dibuat untuk laporan ini.
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Petugas BMS dapat memilih alur estimasi melalui Handler BMS (SPARTA Maintenance) atau Handler Rekanan (BnM).
                </p>
                {canTriggerEstimation && (
                  <button
                    type="button"
                    onClick={() => setIsEstimationModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#1D5AA6] hover:bg-[#123B6D] text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition-colors mt-1"
                  >
                    <Calculator className="w-4 h-4" />
                    Mulai Buat Estimasi
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: PROGRESS PEKERJAAN (Section N, O, P, Q, T) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                4. Progress Pekerjaan
              </h4>

              {/* Tombol Update Progress */}
              {!isReadOnly && !isReportClosed && (
                isWorkReadyForProgress ? (
                  canUpdateProgress ? (
                    <button
                      type="button"
                      onClick={() => setIsProgressModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Update Progress
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1" title={updateProgressReason}>
                      <Lock className="w-3 h-3" /> Update Terkunci (REPORT_UPDATE_PROGRESS)
                    </span>
                  )
                ) : (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {!estimationRoute
                      ? "Menunggu Proses Estimasi"
                      : estimationRoute.status !== "ESTIMATION_COMPLETED"
                      ? "Menunggu Hasil Estimasi"
                      : "Pekerjaan Belum Siap Dikerjakan"}
                  </span>
                )
              )}
            </div>

            {/* Visual Progress Bar Card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Tingkat Penyelesaian Fisik:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                    {latestProgress}% Selesai
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    workStatus === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : workStatus === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {workStatus === "COMPLETED"
                      ? "COMPLETED"
                      : workStatus === "IN_PROGRESS"
                      ? "IN_PROGRESS"
                      : "NOT_STARTED"}
                  </span>
                </div>
              </div>

              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    latestProgress >= 100
                      ? "bg-emerald-500"
                      : latestProgress >= 50
                      ? "bg-blue-600"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${latestProgress}%` }}
                />
              </div>

              {/* Informational Guidance on Progress Eligibility (Section P) */}
              {!isWorkReadyForProgress && !isReportClosed && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-[11px] leading-relaxed">
                    Progress pekerjaan belum dapat diperbarui. Status pekerjaan saat ini:{" "}
                    <strong>{estimationRoute ? (estimationRoute.workStatus || "NOT_READY") : "Belum dibuat"}</strong>{" "}
                    (pekerjaan baru dapat di-update setelah berstatus Siap Dikerjakan / READY_FOR_WORK).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: RIWAYAT PROGRESS & TIMELINE (Section AB, AC, AH) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              5. Riwayat Progress Pekerjaan (Multi-Day Timeline)
            </h4>

            <ProgressTimeline history={progressHistory} loading={loading} />
          </div>

          {/* SECTION 6: BUKTI AKHIR (Section AD, AE) */}
          {latestProgress === 100 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                6. Bukti Akhir Pekerjaan / Serah Terima
              </h4>

              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Pekerjaan telah mencapai 100%
                    </p>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                      {hasFinalEvidence
                        ? "Foto bukti akhir (FINAL / HANDOVER) dengan watermark resmi telah tersedia."
                        : "Harap upload foto bukti akhir (FINAL / HANDOVER) sebelum laporan dapat ditutup."}
                    </p>
                  </div>

                  {!hasFinalEvidence && !isReportClosed && canUpdateProgress && (
                    <button
                      type="button"
                      onClick={() => setIsProgressModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                    >
                      + Upload Bukti Akhir
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: CLOSE LAPORAN (Section AF) */}
          {!isReportClosed && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    7. Penyelesaian & Penutupan Laporan
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Syarat: Progress 100% + Foto Bukti Akhir + Izin REPORT_CLOSE.
                  </p>
                </div>

                {latestProgress === 100 && hasFinalEvidence ? (
                  canClose ? (
                    <button
                      type="button"
                      onClick={() => setIsCloseModalOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Close Laporan
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1" title={closeReason}>
                      <Lock className="w-3.5 h-3.5" /> Close Terkunci (REPORT_CLOSE)
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-xs rounded-xl cursor-not-allowed opacity-60"
                  >
                    Syarat Close Belum Lengkap
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Sub-Modal: Buat / Status Estimasi */}
      <EstimationModal
        isOpen={isEstimationModalOpen}
        onClose={() => {
          setIsEstimationModalOpen(false);
          loadData();
        }}
        incident={incident}
        onRouteCreated={() => {
          loadData();
        }}
      />

      {/* Sub-Modal: Update Progress */}
      <ProgressUpdateModal
        isOpen={isProgressModalOpen}
        onClose={() => {
          setIsProgressModalOpen(false);
          loadData();
        }}
        incident={incident}
        latestProgress={latestProgress}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Sub-Modal: Close Report */}
      <CloseReportModal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          loadData();
        }}
        incident={incident}
        latestProgress={latestProgress}
        hasFinalEvidence={hasFinalEvidence}
        canClose={canClose}
        closeReason={closeReason}
        onSuccess={() => {
          loadData();
          onClose();
        }}
      />
    </div>
  );
}
