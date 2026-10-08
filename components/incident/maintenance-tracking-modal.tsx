"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Store,
  Calendar,
  Calculator,
  Lock,
  Layers,
  FileCheck,
  Camera,
  Eye,
  User,
  Bot,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { IncidentRecord, RoleType } from "@/types/incident";
import { EstimationModal } from "./estimation-modal";
import { EstimationStatusCard } from "./estimation-status-card";
import { EstimationRouteRecord } from "@/lib/estimation-service";
import { ProgressUpdateModal } from "./progress-update-modal";
import { ProgressTimeline } from "./progress-timeline";
import { CompletionApprovalCard } from "./completion-approval-card";
import {
  CompletionApprovalRecord,
  CompletionApprovalHistoryRecord,
  ApprovalRouteResolution,
} from "@/lib/completion-approval-service";
import { ProgressUpdateRecord, WorkStatus } from "@/lib/progress-service";
import { UserIdentity } from "@/lib/identity";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { WorkReadinessCard } from "./work-readiness-card";

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

type LifecycleStepKey =
  | "LAPORAN_MASUK"
  | "KONFIRMASI_TOKO"
  | "VERIFIKASI"
  | "ESTIMASI"
  | "PROGRESS"
  | "SERAH_TERIMA"
  | "SELESAI";

type StepState = "completed" | "current" | "future";

interface LifecycleStepView {
  key: LifecycleStepKey;
  number: number;
  title: string;
  state: StepState;
  stateLabel: string;
  primaryDetail: string;
  secondaryDetail?: string | null;
  actorDetail?: string | null;
  timestampDetail?: string | null;
  isActionable?: boolean;
}

function safeFormatDate(raw?: string | null): string {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

function formatCurrency(val?: number | string | null): string {
  if (val === null || val === undefined || val === "") return "-";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function getDisasterLabel(type?: string): string {
  switch (type) {
    case "earthquake":
      return "Gempa Bumi";
    case "flood":
      return "Banjir";
    case "fire":
      return "Kebakaran";
    case "heavy_rain":
      return "Hujan Lebat";
    case "strong_wind":
      return "Angin Kencang";
    case "theft":
      return "Pencurian";
    case "severe_building_damage":
      return "Kerusakan Bangunan";
    default:
      return type ? type.toUpperCase() : "Bencana Fisik";
  }
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

  // Permissions state
  const [canUpdateProgress, setCanUpdateProgress] = useState(false);
  const [updateProgressReason, setUpdateProgressReason] = useState("");
  const [canClose, setCanClose] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [canTriggerEstimation, setCanTriggerEstimation] = useState(false);
  const [triggerEstimationReason, setTriggerEstimationReason] = useState("");
  const [canUpdateReadiness, setCanUpdateReadiness] = useState(false);
  const [updateReadinessReason, setUpdateReadinessReason] = useState("");

  const [completionApproval, setCompletionApproval] = useState<CompletionApprovalRecord | null>(null);
  const [completionRoute, setCompletionRoute] = useState<ApprovalRouteResolution | null>(null);
  const [completionHistory, setCompletionHistory] = useState<CompletionApprovalHistoryRecord[]>([]);
  const [canSubmitCompletion, setCanSubmitCompletion] = useState(false);
  const [submitCompletionReason, setSubmitCompletionReason] = useState("");
  const [canApproveCoordinator, setCanApproveCoordinator] = useState(false);
  const [approveCoordinatorReason, setApproveCoordinatorReason] = useState("");

  // Supporting details active tab
  const [activeTab, setActiveTab] = useState<"none" | "estimation" | "progress" | "approval" | "info">("none");

  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!incident) return;
    setLoading(true);

    try {
      const [meRes, permRes, estRes, progRes, compRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/incidents/${incident.id}/permissions`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/incidents/${incident.id}/estimation`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/incidents/${incident.id}/progress`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/incidents/${incident.id}/completion`).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (meRes) setIdentity(meRes.user || meRes);

      if (permRes?.data) {
        setCanUpdateProgress(permRes.data.canUpdateProgress);
        setUpdateProgressReason(permRes.data.updateProgressReason || "");
        setCanClose(permRes.data.canClose);
        setCloseReason(permRes.data.closeReason || "");
        setCanTriggerEstimation(permRes.data.canTriggerEstimation);
        setTriggerEstimationReason(permRes.data.triggerEstimationReason || "");
        setCanUpdateReadiness(Boolean(permRes.data.canUpdateReadiness));
        setUpdateReadinessReason(permRes.data.updateReadinessReason || "");
        setCanSubmitCompletion(Boolean(permRes.data.canSubmitCompletion));
        setSubmitCompletionReason(permRes.data.submitCompletionReason || "");
        setCanApproveCoordinator(Boolean(permRes.data.canApproveCoordinator));
        setApproveCoordinatorReason(permRes.data.approveCoordinatorReason || "");
      }

      if (estRes?.data) {
        setEstimationRoute(estRes.data);
      } else {
        setEstimationRoute(null);
      }

      if (compRes?.data) {
        setCompletionApproval(compRes.data.approval || null);
        setCompletionRoute(compRes.data.route || null);
        setCompletionHistory(compRes.data.history || []);
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

  const isAutoReport =
    incident.reportOrigin === "automatic_earthquake" ||
    Boolean(incident.earthquakeEventId);

  const isTkpToko = (incident.tkpType || "toko").toLowerCase() === "toko";
  const isReportClosed = incident.status === "resolved" || completionApproval?.status === "CLOSED";
  const isWorkReadyForProgress =
    estimationRoute !== null &&
    (estimationRoute.workStatus === "READY_FOR_WORK" ||
      estimationRoute.workStatus === "IN_PROGRESS" ||
      estimationRoute.workStatus === "COMPLETED");

  // Derive business-friendly display status
  const getDisplayStatus = (): { label: string; badgeClass: string; desc: string } => {
    if (isReportClosed) {
      return {
        label: "Laporan Selesai & Ditutup",
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
        desc: "Seluruh tahapan verifikasi, pekerjaan fisik, dan persetujuan serah terima telah selesai.",
      };
    }

    if (latestProgress === 100) {
      if (completionApproval?.status === "WAITING_MANAGER_APPROVAL") {
        return {
          label: "Menunggu Approval Branch Manager",
          badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-700",
          desc: "Koordinator cabang telah menyetujui hasil serah terima. Menunggu persetujuan Branch Manager.",
        };
      }
      if (completionApproval?.status === "WAITING_COORDINATOR_APPROVAL") {
        return {
          label: "Menunggu Approval Koordinator",
          badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
          desc: "Serah terima telah diajukan oleh PIC. Menunggu verifikasi dan persetujuan Koordinator Cabang.",
        };
      }
      if (!hasFinalEvidence) {
        return {
          label: "Pekerjaan 100% (Menunggu Foto Akhir)",
          badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700",
          desc: "Pekerjaan fisik telah 100%, foto bukti akhir (FINAL / HANDOVER) wajib diunggah sebelum serah terima.",
        };
      }
      return {
        label: "Siap Pengajuan Serah Terima",
        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700",
        desc: "Bukti foto fisik lengkap. PIC siap mengajukan serah terima pekerjaan.",
      };
    }

    if (incident.status === "pending_confirmation") {
      return {
        label: "Menunggu Konfirmasi Toko",
        badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700",
        desc: "Laporan terdeteksi otomatis oleh sistem. Menunggu konfirmasi dampak fisik dari tim toko / cabang.",
      };
    }

    if (incident.status === "verifying") {
      return {
        label: "Verifikasi Lapangan",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700",
        desc: "Laporan sedang diverifikasi oleh petugas cabang mengenai kondisi fisik dan tingkat kerusakan.",
      };
    }

    if (incident.status === "in_estimation") {
      return {
        label: "Proses Estimasi Perbaikan",
        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700",
        desc: "Sedang dilakukan penentuan alur penanganan dan estimasi biaya perbaikan.",
      };
    }

    if (estimationRoute) {
      if (estimationRoute.workStatus === "READY_FOR_WORK") {
        return {
          label: "Siap Dikerjakan (SPK Terbit)",
          badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-700",
          desc: "Kesiapan kerja telah lengkap. Pekerjaan siap dilakukan dan progress dapat di-update.",
        };
      }
      if (estimationRoute.workStatus === "IN_PROGRESS" || latestProgress > 0) {
        return {
          label: `Perbaikan Berjalan (${latestProgress}%)`,
          badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700",
          desc: "Penanganan perbaikan fisik sedang berlangsung di lapangan.",
        };
      }
      if (estimationRoute.status === "ESTIMATION_COMPLETED" && estimationRoute.workStatus === "NOT_READY") {
        return {
          label: "Menunggu Kesiapan Kerja (SPK)",
          badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700",
          desc: "Estimasi selesai tercatat, menunggu pemenuhan syarat kesiapan kerja sebelum mulai pengerjaan.",
        };
      }
    }

    if (incident.status === "in_maintenance" || incident.status === "in_construction") {
      return {
        label: latestProgress > 0 ? `Perbaikan Berjalan (${latestProgress}%)` : "Dalam Penanganan Perbaikan",
        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700",
        desc: "Pekerjaan penanganan dan pemulihan fisik sedang berlangsung.",
      };
    }

    return {
      label: incident.status.replace(/_/g, " ").toUpperCase(),
      badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      desc: "Status laporan operasional.",
    };
  };

  const currentStatusInfo = getDisplayStatus();

  // Compute 7 Lifecycle Steps
  const computeSteps = (): LifecycleStepView[] => {
    // 1. Laporan Masuk
    const step1: LifecycleStepView = {
      key: "LAPORAN_MASUK",
      number: 1,
      title: "Laporan Masuk",
      state: "completed",
      stateLabel: "Selesai",
      primaryDetail: isAutoReport
        ? "Dibuat Otomatis oleh Sistem (InaTEWS / BMKG)"
        : `Laporan dibuat oleh ${incident.reporter?.name || incident.timeline?.[0]?.actor || "Pelapor Lapangan"}${
            incident.reporter?.nik ? ` (NIK: ${incident.reporter.nik})` : ""
          }`,
      timestampDetail: safeFormatDate(incident.createdAt || incident.date),
      actorDetail: isAutoReport ? "Sistem Otomasi SPARTA" : (incident.reporter?.name || "Pelapor"),
    };

    // 2. Konfirmasi Toko
    const isStep2Pending = incident.status === "pending_confirmation";
    const isStep2Completed = !isStep2Pending;
    const confirmationResult = incident.verification
      ? incident.verification.isDamaged
        ? "Toko Dikonfirmasi Terdampak Kerusakan"
        : incident.verification.isDamaged === false
        ? "Toko Dikonfirmasi Aman (Tidak Ada Kerusakan)"
        : "Konfirmasi diterima"
      : isStep2Completed
      ? "Kondisi toko telah dikonfirmasi"
      : null;

    const step2: LifecycleStepView = {
      key: "KONFIRMASI_TOKO",
      number: 2,
      title: "Konfirmasi Toko",
      state: isStep2Completed ? "completed" : "current",
      stateLabel: isStep2Completed ? "Selesai" : "Sedang Berlangsung",
      primaryDetail: isStep2Completed
        ? (confirmationResult || "Toko telah memberikan konfirmasi")
        : "Menunggu konfirmasi kondisi fisik dari cabang atau gerai toko",
      actorDetail: incident.verification?.confirmedBy || (isStep2Completed ? "Tim Cabang / Toko" : null),
      timestampDetail: incident.verification?.confirmedAt ? safeFormatDate(incident.verification.confirmedAt) : null,
    };

    // 3. Verifikasi
    const isStep3Current = isStep2Completed && incident.status === "verifying";
    const isStep3Completed =
      isStep2Completed &&
      incident.status !== "pending_confirmation" &&
      incident.status !== "verifying";

    const step3: LifecycleStepView = {
      key: "VERIFIKASI",
      number: 3,
      title: "Verifikasi Lapangan",
      state: isStep3Completed ? "completed" : isStep3Current ? "current" : "future",
      stateLabel: isStep3Completed ? "Selesai" : isStep3Current ? "Sedang Berlangsung" : "Belum dilakukan",
      primaryDetail: isStep3Completed
        ? "Kondisi fisik dan tingkat kerusakan telah diverifikasi teknis"
        : isStep3Current
        ? "Menunggu penyelesaian verifikasi teknis kerusakan di lapangan"
        : "Belum dilakukan",
      actorDetail: incident.verification?.confirmedBy || null,
      timestampDetail: incident.verification?.confirmedAt ? safeFormatDate(incident.verification.confirmedAt) : null,
    };

    // 4. Penanganan / Estimasi
    const isEstimationCreated = Boolean(estimationRoute);
    const isEstimationDone = estimationRoute?.status === "ESTIMATION_COMPLETED";
    const isReadinessReady = estimationRoute?.workStatus === "READY_FOR_WORK";
    const isBeyondEstimation =
      isReportClosed ||
      latestProgress > 0 ||
      isReadinessReady ||
      estimationRoute?.workStatus === "IN_PROGRESS" ||
      estimationRoute?.workStatus === "COMPLETED";

    const isStep4Completed = isStep3Completed && (isBeyondEstimation || isReadinessReady);
    const isStep4Current = isStep3Completed && !isStep4Completed;
    const isStep4Future = !isStep3Completed;

    let step4Primary = "Belum dilakukan";
    let step4Secondary: string | null = null;
    if (isEstimationCreated && estimationRoute) {
      const handlerText =
        estimationRoute.handlerType === "BMS"
          ? "SPARTA Maintenance (Internal BMS)"
          : estimationRoute.handlerType === "BES"
          ? "Branch Engineering Support (BES)"
          : estimationRoute.handlerType === "BUILDING"
          ? "Branch Building Support (BBS)"
          : "Rekanan BnM (Vendor)";
      step4Primary = `Handler: ${handlerText} • ${
        isEstimationDone ? "Estimasi Disetujui" : estimationRoute.status || "Diproses"
      }`;
      const noEst = estimationRoute.estimationNumber || "Menunggu Penerbitan";
      const valEst = formatCurrency(estimationRoute.estimatedValue);
      step4Secondary = `No. Estimasi: ${noEst} | Nilai: ${valEst}`;
    } else if (isStep4Current) {
      step4Primary = isTkpToko ? "Estimasi belum dibuat" : "Alur estimasi untuk lokasi DC belum tersedia";
    }

    const step4: LifecycleStepView = {
      key: "ESTIMASI",
      number: 4,
      title: "Penanganan / Estimasi",
      state: isStep4Completed ? "completed" : isStep4Current ? "current" : "future",
      stateLabel: isStep4Completed ? "Selesai" : isStep4Current ? "Sedang Berlangsung" : "Belum dilakukan",
      primaryDetail: isStep4Future ? "Belum dilakukan" : step4Primary,
      secondaryDetail: isStep4Future ? null : step4Secondary,
      actorDetail: estimationRoute?.createdByName || null,
      timestampDetail: estimationRoute?.createdAt ? safeFormatDate(estimationRoute.createdAt) : null,
      isActionable: isStep4Current && isTkpToko && !isEstimationCreated && canTriggerEstimation,
    };

    // 5. Update Progress
    const isStep5Completed = isStep4Completed && (latestProgress === 100 || isReportClosed);
    const isStep5Current = isStep4Completed && !isStep5Completed;
    const isStep5Future = !isStep4Completed;

    const lastProgressUpdate = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1] : null;

    const step5: LifecycleStepView = {
      key: "PROGRESS",
      number: 5,
      title: "Update Progress",
      state: isStep5Completed ? "completed" : isStep5Current ? "current" : "future",
      stateLabel: isStep5Completed ? "Selesai" : isStep5Current ? "Sedang Berlangsung" : "Belum dilakukan",
      primaryDetail: isStep5Future
        ? "Belum dilakukan"
        : isStep5Completed
        ? "Pekerjaan fisik telah mencapai 100%"
        : `Pekerjaan fisik berjalan (${latestProgress}%) • Status: ${workStatus}`,
      secondaryDetail: isStep5Future
        ? null
        : lastProgressUpdate
        ? `Catatan terakhir: "${lastProgressUpdate.description}"`
        : isStep5Current && !isWorkReadyForProgress
        ? "Pekerjaan belum siap di-update (menunggu status READY_FOR_WORK / SPK)"
        : null,
      actorDetail: lastProgressUpdate?.createdByName || null,
      timestampDetail: lastProgressUpdate?.createdAt ? safeFormatDate(lastProgressUpdate.createdAt) : null,
      isActionable: isStep5Current && isWorkReadyForProgress && canUpdateProgress && !isReadOnly && !isReportClosed,
    };

    // 6. Serah Terima
    const isStep6Completed =
      isStep5Completed &&
      (isReportClosed ||
        completionApproval?.status === "WAITING_MANAGER_APPROVAL" ||
        completionApproval?.status === "CLOSED");
    const isStep6Current = isStep5Completed && !isStep6Completed;

    let step6Detail = "Belum dilakukan";
    let step6Sec: string | null = null;
    if (isStep6Completed) {
      step6Detail = "Serah terima telah disetujui koordinator & dokumen lengkap";
      step6Sec = hasFinalEvidence ? "Bukti foto serah terima (FINAL/HANDOVER) terverifikasi" : null;
    } else if (isStep6Current) {
      if (!hasFinalEvidence) {
        step6Detail = "Menunggu upload bukti foto akhir (FINAL/HANDOVER)";
      } else if (!completionApproval || completionApproval.status === "WAITING_PIC_SUBMISSION") {
        step6Detail = "Foto bukti lengkap. Menunggu pengajuan serah terima oleh PIC";
      } else if (completionApproval.status === "WAITING_COORDINATOR_APPROVAL") {
        step6Detail = "Serah terima telah diajukan. Menunggu review & persetujuan Koordinator";
      } else {
        step6Detail = `Status serah terima: ${completionApproval.status}`;
      }
    }

    const step6: LifecycleStepView = {
      key: "SERAH_TERIMA",
      number: 6,
      title: "Serah Terima",
      state: isStep6Completed ? "completed" : isStep6Current ? "current" : "future",
      stateLabel: isStep6Completed ? "Selesai" : isStep6Current ? "Sedang Berlangsung" : "Belum dilakukan",
      primaryDetail: step6Detail,
      secondaryDetail: step6Sec,
      actorDetail: completionApproval?.picUserName || (completionApproval ? "PIC Pekerjaan" : null),
      timestampDetail: completionApproval?.submittedAt ? safeFormatDate(completionApproval.submittedAt) : null,
      isActionable:
        isStep6Current &&
        !isReadOnly &&
        !isReportClosed &&
        ((!hasFinalEvidence && canUpdateProgress) ||
          (hasFinalEvidence && canSubmitCompletion && (!completionApproval || completionApproval.status === "WAITING_PIC_SUBMISSION"))),
    };

    // 7. Selesai
    const isStep7Completed = isReportClosed;
    const isStep7Current = isStep6Completed && !isStep7Completed;

    let step7Detail = "Belum dilakukan";
    if (isStep7Completed) {
      step7Detail = "Laporan resmi disetujui Branch Manager & ditutup";
    } else if (isStep7Current) {
      if (completionApproval?.status === "WAITING_MANAGER_APPROVAL") {
        step7Detail = "Menunggu persetujuan akhir & penutupan laporan oleh Branch Manager";
      } else if (completionApproval?.status === "WAITING_COORDINATOR_APPROVAL") {
        step7Detail = `Menunggu persetujuan Koordinator (${completionRoute?.coordinatorRole?.toUpperCase() || "Cabang"})`;
      } else {
        step7Detail = "Menunggu kelengkapan alur persetujuan";
      }
    }

    const step7: LifecycleStepView = {
      key: "SELESAI",
      number: 7,
      title: "Selesai & Penutupan",
      state: isStep7Completed ? "completed" : isStep7Current ? "current" : "future",
      stateLabel: isStep7Completed ? "Selesai" : isStep7Current ? "Sedang Berlangsung" : "Belum dilakukan",
      primaryDetail: step7Detail,
      secondaryDetail: isStep7Completed && completionApproval?.managerApprovedAt
        ? `Disetujui Branch Manager (${completionApproval.managerUserName || "BM"}) pada ${safeFormatDate(completionApproval.managerApprovedAt)}`
        : null,
      actorDetail: completionApproval?.managerUserName || null,
      timestampDetail: completionApproval?.managerApprovedAt
        ? safeFormatDate(completionApproval.managerApprovedAt)
        : incident.closedAt
        ? safeFormatDate(incident.closedAt)
        : null,
      isActionable:
        isStep7Current &&
        !isReadOnly &&
        !isReportClosed &&
        ((completionApproval?.status === "WAITING_COORDINATOR_APPROVAL" && canApproveCoordinator) ||
          (completionApproval?.status === "WAITING_MANAGER_APPROVAL" && canClose)),
    };

    return [step1, step2, step3, step4, step5, step6, step7];
  };

  const steps = computeSteps();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overscroll-none touch-none select-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92dvh] sm:max-h-[88dvh] min-h-0 overflow-hidden touch-auto select-text">
        {/* COMPACT SUMMARY HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1D5AA6] dark:text-blue-400 shrink-0">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight truncate">
                    Detail Tracking Laporan
                  </h3>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {incident.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${currentStatusInfo.badgeClass}`}
                  >
                    {isReportClosed && <CheckCircle2 className="w-3 h-3" />}
                    {currentStatusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {incident.storeName} ({incident.storeId || "-"})
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{incident.branch}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {getDisasterLabel(incident.disasterType)}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-500">{safeFormatDate(incident.createdAt || incident.date)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                title="Segarkan data"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* SCROLLABLE MODAL CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-6">
          {/* PRIMARY SECTION: LIFECYCLE TRACKER (STEPPER) */}
          <div className="bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Alur Lifecycle Laporan
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Posisi saat ini: <strong className="text-slate-800 dark:text-slate-200">{currentStatusInfo.label}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Fisik: {latestProgress}%
                </span>
                <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      latestProgress >= 100
                        ? "bg-emerald-500"
                        : latestProgress >= 50
                        ? "bg-blue-600"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${latestProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Vertical Stepper Stream */}
            <div className="relative pl-3 sm:pl-4 space-y-3 sm:space-y-4">
              {steps.map((st, index) => {
                const isLast = index === steps.length - 1;
                const isCompleted = st.state === "completed";
                const isCurrent = st.state === "current";

                return (
                  <div key={st.key} className="relative flex items-start gap-3 sm:gap-4 group">
                    {/* Continuous vertical connecting line */}
                    {!isLast && (
                      <div
                        className={`absolute left-[13px] sm:left-[15px] top-[28px] bottom-[-16px] w-[2px] transition-colors ${
                          isCompleted
                            ? "bg-emerald-500 dark:bg-emerald-600"
                            : isCurrent
                            ? "bg-blue-500/50 dark:bg-blue-600/50"
                            : "bg-slate-200 dark:bg-slate-800"
                        }`}
                      />
                    )}

                    {/* Step Icon Badge */}
                    <div
                      className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all shadow-2xs ${
                        isCompleted
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-50 dark:ring-emerald-950/40"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950/60 animate-pulse"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      ) : isCurrent ? (
                        <span className="font-extrabold">{st.number}</span>
                      ) : (
                        <span>{st.number}</span>
                      )}
                    </div>

                    {/* Step Content Card */}
                    <div
                      className={`flex-1 rounded-xl p-3 sm:p-3.5 transition-all border ${
                        isCurrent
                          ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800 shadow-xs"
                          : isCompleted
                          ? "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800"
                          : "bg-slate-50/40 dark:bg-slate-900/20 border-slate-200/40 dark:border-slate-800/40 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                        <div className="flex items-center gap-2">
                          <h5
                            className={`text-xs sm:text-sm font-bold ${
                              isCurrent
                                ? "text-blue-900 dark:text-blue-200"
                                : isCompleted
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {st.title}
                          </h5>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : isCurrent
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 font-extrabold"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {st.stateLabel}
                          </span>
                        </div>

                        {/* Actor & Timestamp */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          {st.actorDetail && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {st.actorDetail}
                            </span>
                          )}
                          {st.timestampDetail && (
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {st.timestampDetail}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail Text */}
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isCurrent
                            ? "text-blue-950 dark:text-blue-200 font-medium"
                            : isCompleted
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-400 dark:text-slate-500 italic"
                        }`}
                      >
                        {st.primaryDetail}
                      </p>

                      {st.secondaryDetail && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                          {st.secondaryDetail}
                        </p>
                      )}

                      {/* CONTEXTUAL ACTIONS IN ACTIVE STAGE ONLY */}
                      {st.key === "ESTIMASI" && isCurrent && (
                        <div className="mt-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/60 flex items-center gap-2 flex-wrap">
                          {!estimationRoute ? (
                            isTkpToko ? (
                              canTriggerEstimation ? (
                                <button
                                  type="button"
                                  onClick={() => setIsEstimationModalOpen(true)}
                                  className="px-3 py-1.5 rounded-lg bg-[#1D5AA6] hover:bg-[#123B6D] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                  Buat Estimasi
                                </button>
                              ) : (
                                <span
                                  className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md"
                                  title={triggerEstimationReason || "REPORT_TRIGGER_ESTIMATION"}
                                >
                                  <Lock className="w-3 h-3" /> Pembuatan estimasi khusus petugas BMS
                                </span>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Alur DC Belum Tersedia</span>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveTab(activeTab === "estimation" ? "none" : "estimation")}
                              className="text-xs font-bold text-[#1D5AA6] dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {activeTab === "estimation" ? "Tutup Rincian Estimasi" : "Lihat Rincian Estimasi & Kesiapan"}
                            </button>
                          )}
                        </div>
                      )}

                      {st.key === "PROGRESS" && isCurrent && (
                        <div className="mt-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/60 flex items-center gap-2 flex-wrap">
                          {isWorkReadyForProgress ? (
                            canUpdateProgress && !isReadOnly && !isReportClosed ? (
                              <button
                                type="button"
                                onClick={() => setIsProgressModalOpen(true)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                Update Progress Pekerjaan
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                                <Lock className="w-3 h-3" /> Update Terkunci ({updateProgressReason || "REPORT_UPDATE_PROGRESS"})
                              </span>
                            )
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Pekerjaan fisik baru dapat di-update setelah berstatus Siap Dikerjakan (READY_FOR_WORK).</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === "progress" ? "none" : "progress")}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 ml-auto"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {activeTab === "progress" ? "Tutup Riwayat" : "Lihat Log Riwayat & Foto"}
                          </button>
                        </div>
                      )}

                      {st.key === "SERAH_TERIMA" && isCurrent && (
                        <div className="mt-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/60 flex items-center gap-2 flex-wrap">
                          {!hasFinalEvidence && canUpdateProgress && !isReadOnly && !isReportClosed && (
                            <button
                              type="button"
                              onClick={() => setIsProgressModalOpen(true)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Upload Bukti Akhir (Watermarked)
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === "approval" ? "none" : "approval")}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            {activeTab === "approval" ? "Tutup Panel Approval" : "Buka Panel Serah Terima & Approval"}
                          </button>
                        </div>
                      )}

                      {st.key === "SELESAI" && isCurrent && (
                        <div className="mt-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/60 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setActiveTab(activeTab === "approval" ? "none" : "approval")}
                            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Buka Tindakan Persetujuan & Penutupan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECONDARY SUPPORTING DETAILS SECTION */}
          <div className="space-y-3 pt-2">
            {/* Segmented Control / Navigation Pills */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Rincian Data Pendukung:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "info" ? "none" : "info")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "info"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Info TKP & Toko
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "estimation" ? "none" : "estimation")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "estimation"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Detail Estimasi {estimationRoute ? "✓" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "progress" ? "none" : "progress")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "progress"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Log Riwayat & Foto ({progressHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "approval" ? "none" : "approval")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "approval"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Approval & Penutupan
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: INFORMASI TKP & TOKO */}
            {activeTab === "info" && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-600" />
                  Rincian Lokasi TKP & Gerai Terdampak
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">ID Laporan</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{incident.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Jenis Bencana</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {getDisasterLabel(incident.disasterType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">TKP</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isTkpToko ? "Toko / Gerai" : "Distribution Center (DC)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Tanggal Laporan</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {safeFormatDate(incident.createdAt || incident.date)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Nama & Kode Toko</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident.storeName} ({incident.storeId || "-"})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Wilayah Cabang</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident.branch} • {incident.locationCity}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      {isAutoReport ? "Sumber Laporan" : "Pelapor Lapangan"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {isAutoReport ? (
                        <>
                          <Bot className="w-3.5 h-3.5 text-blue-600" />
                          <span>Dibuat Otomatis oleh Sistem (InaTEWS / BMKG)</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {incident.reporter?.name || incident.timeline?.[0]?.actor || "Pelapor Lapangan"}
                          </span>
                          {incident.reporter?.nik && (
                            <span className="font-mono text-slate-400 text-[10px]">
                              • NIK: {incident.reporter.nik}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Gerai Terdampak</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident.affectedStoreCount || 1} gerai dalam radius dampak
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: DETAIL ESTIMASI & KESIAPAN */}
            {activeTab === "estimation" && (
              <div className="space-y-4 animate-in fade-in">
                {estimationRoute && (
                  <>
                    <EstimationStatusCard route={estimationRoute} loading={loading} />
                    {/* 4. Persyaratan Mulai Pekerjaan */}
                    <WorkReadinessCard
                      incident={incident}
                      estimationRoute={estimationRoute}
                      canUpdate={canUpdateReadiness}
                      updateReason={updateReadinessReason}
                      onReadinessUpdated={loadData}
                    />
                  </>
                )}
                {!estimationRoute && (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
                    Estimasi belum dibuat untuk laporan ini. Petugas BMS dapat membuat estimasi melalui alur Penanganan.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: RIWAYAT PROGRESS & FOTO FISIK */}
            {activeTab === "progress" && (
              <div className="space-y-4 animate-in fade-in bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Kronologi Pembaruan Fisik & Dokumentasi Watermark
                  </h5>
                  {isWorkReadyForProgress && canUpdateProgress && !isReadOnly && !isReportClosed && (
                    <button
                      type="button"
                      onClick={() => setIsProgressModalOpen(true)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-colors"
                    >
                      + Tambah Update
                    </button>
                  )}
                </div>
                <ProgressTimeline history={progressHistory} loading={loading} />
              </div>
            )}

            {/* TAB CONTENT 4: APPROVAL & PENUTUPAN */}
            {activeTab === "approval" && (
              <div className="animate-in fade-in">
                <CompletionApprovalCard
                  incident={incident}
                  approval={completionApproval}
                  route={completionRoute}
                  history={completionHistory}
                  latestProgress={latestProgress}
                  hasFinalEvidence={hasFinalEvidence}
                  userRole={identity?.role}
                  userBranch={identity?.branch}
                  userSystemRole={identity?.systemRole}
                  canSubmitCompletion={canSubmitCompletion}
                  submitCompletionReason={submitCompletionReason}
                  canApproveCoordinator={canApproveCoordinator}
                  approveCoordinatorReason={approveCoordinatorReason}
                  canClose={canClose}
                  closeReason={closeReason}
                  onRefresh={loadData}
                />
              </div>
            )}
          </div>
        </div>

        {/* MINIMAL FOOTER */}
        <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Sistem Monitoring Terpadu SPARTA SIAGA</span>
          </div>
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
    </div>
  );
}
