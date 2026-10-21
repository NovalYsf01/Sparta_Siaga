"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
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
  Download,
  FileText,
  Image as ImageIcon,
  Maximize2,
  ChevronRight,
  ClipboardList,
  Info,
  MapPin,
} from "lucide-react";
import {
  IncidentRecord,
  RoleType,
  DamageReport,
  IncidentPhotoDetail,
} from "@/types/incident";
import { EstimationStatusCard } from "./estimation-status-card";
import { EstimationRouteRecord } from "@/lib/estimation-service";
import { ProgressTimeline } from "./progress-timeline";
import { CompletionApprovalCard } from "./completion-approval-card";
import {
  CompletionApprovalRecord,
  CompletionApprovalHistoryRecord,
  ApprovalRouteResolution,
} from "@/lib/completion-approval-service";
import { ProgressUpdateRecord, WorkStatus } from "@/lib/progress-service";
import { UserIdentity } from "@/lib/identity";
import { AppDialog } from "@/components/shared/app-dialog";
import { WorkReadinessCard } from "./work-readiness-card";
import { MilestoneProgressionCard } from "./milestone-progression-card";

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
  onConfirmVerification?: (
    incidentId: string,
    isDamaged: boolean,
    report?: Partial<DamageReport>
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
  activeRole,
  isOpen,
  onClose,
  onConfirmVerification,
  isReadOnly = false,
}: MaintenanceTrackingModalProps) {
  // Lock background scroll when modal is open

  const [identity, setIdentity] = useState<UserIdentity | null>(null);

  // Estimation state
  const [estimationRoute, setEstimationRoute] = useState<EstimationRouteRecord | null>(null);

  // Progress state
  const [progressHistory, setProgressHistory] = useState<ProgressUpdateRecord[]>([]);
  const [latestProgress, setLatestProgress] = useState<number>(0);
  const [workStatus, setWorkStatus] = useState<WorkStatus>("NOT_STARTED");
  const [hasFinalEvidence, setHasFinalEvidence] = useState(false);

  // Permissions state (for informational indicators only)
  const [canConfirm, setCanConfirm] = useState(false);
  const [confirmReason, setConfirmReason] = useState("");
  const [canBmApprove, setCanBmApprove] = useState(false);
  const [bmApproveReason, setBmApproveReason] = useState("");
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

  // 5 Logical Sections Tab State
  const [activeTab, setActiveTab] = useState<"ringkasan" | "pemeriksaan" | "estimasi" | "progres" | "dokumen">("ringkasan");

  // Initial & Inspection Photo Preview Lightbox
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    title: string;
    source?: string;
    slotLabel?: string;
    galleryReason?: string | null;
    sourceProvider?: string | null;
    receiptContext?: string | null;
    capturedAt?: string | null;
  } | null>(null);

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
        setCanConfirm(Boolean(permRes.data.canConfirm));
        setConfirmReason(permRes.data.confirmReason || "");
        setCanBmApprove(Boolean(permRes.data.canBmApprove));
        setBmApproveReason(permRes.data.bmApproveReason || "");
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
          label: "Menunggu Approval BnM Manajer",
          badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-700",
          desc: "Koordinator cabang telah menyetujui hasil serah terima. Menunggu persetujuan BnM Manajer.",
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

    // 2. Pemeriksaan BMS/BES & Persetujuan BM
    const isStep2PendingInspection =
      incident.status === "pending_confirmation" ||
      incident.status === "clarification_requested";
    const isStep2PendingBm = incident.status === "pending_bm_approval";
    const isStep2Completed =
      incident.status !== "pending_confirmation" &&
      incident.status !== "clarification_requested" &&
      incident.status !== "pending_bm_approval";

    let step2PrimaryDetail = "Menunggu pemeriksaan kondisi fisik oleh tim BMS/BES cabang";
    let step2StateLabel = "Sedang Berlangsung";

    if (isStep2PendingBm) {
      step2PrimaryDetail =
        "Hasil pemeriksaan diajukan oleh BMS/BES. Menunggu peninjauan & keputusan BnM Manajer.";
      step2StateLabel = "Menunggu Approval BnM Manajer";
    } else if (incident.status === "clarification_requested") {
      step2PrimaryDetail =
        `BnM Manajer meminta klarifikasi/revisi: "${incident.verification?.bmApproval?.clarificationReason || "Mohon lengkapi data"}"`;
      step2StateLabel = "Klarifikasi Diminta";
    } else if (incident.status === "confirmed_safe") {
      step2PrimaryDetail = "Kondisi dinyatakan AMAN oleh BnM Manajer. Operasional normal.";
      step2StateLabel = "Selesai (Aman)";
    } else if (incident.status === "rejected_invalid") {
      step2PrimaryDetail = "Laporan DITOLAK oleh BnM Manajer (Data Tidak Valid).";
      step2StateLabel = "Ditolak BnM Manajer";
    } else if (isStep2Completed) {
      step2PrimaryDetail =
        incident.verification?.isDamaged
          ? "Pemeriksaan kerusakan disetujui BnM Manajer. Lanjut penanganan teknis."
          : "Pemeriksaan selesai dan disetujui BnM Manajer.";
      step2StateLabel = "Disetujui BnM Manajer";
    }

    const step2: LifecycleStepView = {
      key: "KONFIRMASI_TOKO",
      number: 2,
      title: "Pemeriksaan & Persetujuan BnM Manajer",
      state: isStep2Completed ? "completed" : "current",
      stateLabel: step2StateLabel,
      primaryDetail: step2PrimaryDetail,
      actorDetail:
        incident.verification?.bmApproval?.decidedBy ||
        incident.verification?.confirmedBy ||
        (isStep2Completed ? "Tim Cabang" : null),
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
      step7Detail = "Laporan resmi disetujui BnM Manajer & ditutup";
    } else if (isStep7Current) {
      if (completionApproval?.status === "WAITING_MANAGER_APPROVAL") {
        step7Detail = "Menunggu persetujuan akhir & penutupan laporan oleh BnM Manajer";
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
        ? `Disetujui BnM Manajer (${completionApproval.managerUserName || "BnM Manajer"}) pada ${safeFormatDate(completionApproval.managerApprovedAt)}`
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
    <AppDialog open={isOpen} onClose={onClose} title={"Detail Laporan"} className="sm:!max-w-4xl">
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
                    Detail Laporan
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
              {/* Navigasi Titik Lokasi di Peta */}
              {incident.storeId && (
                <a
                  href={`/map?storeId=${encodeURIComponent(incident.storeId)}`}
                  title="Lihat titik lokasi di peta"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors shadow-2xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#1D5AA6]" />
                  <span className="hidden sm:inline">Lihat di Peta</span>
                  <span className="sm:hidden">Peta</span>
                </a>
              )}

              <a
                href={`/api/incidents/${incident.id}/export/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                title="Unduh dokumen PDF laporan resmi"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D5AA6] hover:bg-[#123B6D] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unduh PDF Laporan</span>
                <span className="sm:hidden">PDF</span>
              </a>
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

        {/* 5 LOGICAL SECTIONS NAVIGATION BAR */}
        <div className="px-5 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("ringkasan")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "ringkasan"
                  ? "bg-[#1D5AA6] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>1. Ringkasan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pemeriksaan")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "pemeriksaan"
                  ? "bg-[#1D5AA6] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>2. Pemeriksaan & Bukti Awal</span>
              {incident.fieldPhotos && incident.fieldPhotos.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    activeTab === "pemeriksaan"
                      ? "bg-white/20 text-white"
                      : "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {incident.fieldPhotos.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("estimasi")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "estimasi"
                  ? "bg-[#1D5AA6] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>3. Estimasi & Approval</span>
              {estimationRoute?.status === "ESTIMATION_COMPLETED" && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                  ✓
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("progres")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "progres"
                  ? "bg-[#1D5AA6] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>4. Progres & Milestone</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  activeTab === "progres"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {latestProgress}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("dokumen")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "dokumen"
                  ? "bg-[#1D5AA6] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>5. Riwayat & Dokumen</span>
              {isReportClosed && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                  CLOSED
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SCROLLABLE MODAL CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-6">
          {/* TAB 1: RINGKASAN */}
          {activeTab === "ringkasan" && (
            <div className="space-y-4 animate-in fade-in">
              {/* OPERATIONAL PIC & TARGET BANNER (READ-ONLY) */}
              {(() => {
                const targetDateVal = incident.targetCompletionDate || incident.maintenanceTicket?.completedAt;
                const isOverdue = Boolean(
                  targetDateVal &&
                    new Date(targetDateVal) < new Date() &&
                    incident.status !== "closed" &&
                    incident.status !== "resolved" &&
                    incident.status !== "confirmed_safe"
                );

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50/80 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PIC Operasional</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                        {incident.primaryPicName || (incident.primaryPicUserId ? "Petugas Cabang" : "Belum Ditugaskan")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Waktu Mulai</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate block mt-0.5">
                        {incident.primaryPicClaimedAt ? safeFormatDate(incident.primaryPicClaimedAt) : "Belum Dimulai"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progres Terakhir</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                        {latestProgress}% • {workStatus.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Selesai</span>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {targetDateVal ? safeFormatDate(targetDateVal) : "Belum Ditentukan"}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800">
                            Melewati Target
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* RINCIAN IDENTITAS LOKASI & BENCANA */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-600" />
                  Identitas Laporan & Lokasi TKP
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Nomor Laporan</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{incident.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Jenis Bencana</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {getDisasterLabel(incident.disasterType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Tipe TKP</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isTkpToko ? "Gerai Toko" : "Distribution Center (DC)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Tanggal Laporan</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {safeFormatDate(incident.createdAt || incident.date)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Nama & Kode Unit</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {incident.storeName} ({incident.storeId || "-"})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Wilayah Cabang & Kota</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {incident.branch} {incident.locationCity ? `• ${incident.locationCity}` : ""}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      {isAutoReport ? "Sumber Laporan" : "Pelapor Lapangan"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {isAutoReport ? (
                        <>
                          <Bot className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Dibuat Otomatis oleh Sistem (InaTEWS / BMKG)</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                    <span className="text-[10px] text-slate-400 font-semibold block">Status Penanganan</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {currentStatusInfo.label}
                    </span>
                  </div>
                </div>

                {/* PARAMETER GEMPA / BENCANA JIKA ADA */}
                {incident.disasterMetadata && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Parameter Bencana Terdeteksi:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Magnitude</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {incident.disasterMetadata.magnitude ? `${incident.disasterMetadata.magnitude} SR` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kedalaman</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {incident.disasterMetadata.depth || "-"} km
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Jarak ke TKP</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {incident.disasterMetadata.distanceKm ? `${incident.disasterMetadata.distanceKm} km` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Pusat Gempa</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                          {incident.disasterMetadata.place || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PEMERIKSAAN & BUKTI AWAL */}
          {activeTab === "pemeriksaan" && (
            <div className="space-y-6 animate-in fade-in">
              {/* SUB-SECTION A: FOTO BUKTI AWAL (report.fieldPhotos) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      Foto Bukti Awal Lapangan (Pelapor)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Dokumentasi visual yang dilampirkan pada saat pembuatan laporan kejadian.
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {incident.fieldPhotos?.length || 0} Foto
                  </span>
                </div>

                {(!incident.fieldPhotos || incident.fieldPhotos.length === 0) ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/30 space-y-1.5">
                    <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {isAutoReport
                        ? "Laporan Otomatis: Belum ada foto bukti visual dari lapangan"
                        : "Tidak ada foto bukti awal yang dilampirkan"}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                      {isAutoReport
                        ? "Laporan gempa otomatis diterbitkan sistem. Bukti fisik awal akan diambil oleh petugas BMS/BES saat kunjungan inspeksi lapangan."
                        : "Pelapor tidak melampirkan foto pada saat penginputan manual."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {incident.fieldPhotos.map((photoItem, idx) => {
                      const isObj = typeof photoItem === "object" && photoItem !== null;
                      const photoUrl = isObj ? photoItem.url : photoItem;
                      const source = isObj ? photoItem.source : "camera";
                      const slotLabel = (isObj && photoItem.slotLabel) ? photoItem.slotLabel : `Foto ${idx + 1}`;
                      const galleryReason = isObj ? photoItem.galleryReason : null;
                      const sourceProvider = isObj ? photoItem.sourceProvider : null;
                      const receiptContext = isObj ? photoItem.receiptContext : null;
                      const capturedAt = isObj ? photoItem.capturedAt : null;

                      return (
                        <div
                          key={idx}
                          onClick={() =>
                            setPreviewPhoto({
                              url: photoUrl,
                              title: slotLabel,
                              source,
                              slotLabel,
                              galleryReason,
                              sourceProvider,
                              receiptContext,
                              capturedAt,
                            })
                          }
                          className="group relative bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 hover:border-blue-400 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                        >
                          <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 mb-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt={slotLabel}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-5 h-5 drop-shadow-md" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                {slotLabel}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                  source === "camera"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                }`}
                              >
                                {source === "camera" ? "Kamera" : "Galeri"}
                              </span>
                            </div>

                            {source === "gallery" && galleryReason && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                                Alasan: {galleryReason}
                              </p>
                            )}

                            {sourceProvider && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                Dari: {sourceProvider}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SUB-SECTION B: HASIL PEMERIKSAAN KONDISI LAPANGAN */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Hasil Pemeriksaan Fisik Cabang (BMS / BES)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Verifikasi langsung di TKP untuk menentukan kondisi aman atau rusak.
                    </p>
                  </div>
                </div>

                {incident.verification ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Kondisi Fisik</span>
                        <span
                          className={`font-bold block mt-0.5 ${
                            incident.verification.isDamaged
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {incident.verification.isDamaged ? "RUSAK / TERDAMPAK" : "AMAN / TIDAK RUSAK"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Metode Pemeriksaan</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                          {incident.verification.inspectionMethod === "informasi_petugas"
                            ? "Informasi Petugas"
                            : "Kunjungan Langsung"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Petugas Pemeriksa</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                          {incident.verification.confirmedBy || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Waktu Pemeriksaan</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium block mt-0.5">
                          {safeFormatDate(incident.verification.confirmedAt)}
                        </span>
                      </div>
                      {incident.verification.severity && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">Tingkat Kerusakan</span>
                          <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                            {incident.verification.severity}
                          </span>
                        </div>
                      )}
                      {incident.verification.operationalStatus && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">Status Operasional</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                            {incident.verification.operationalStatus}
                          </span>
                        </div>
                      )}
                    </div>

                    {incident.verification.categories && incident.verification.categories.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Kategori Area Kerusakan:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {incident.verification.categories.map((cat, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {incident.verification.notes && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Catatan Pemeriksaan Lapangan:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 leading-relaxed">
                          {incident.verification.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
                    Pemeriksaan kondisi lapangan belum diinput. Petugas BMS/BES cabang terkait akan melakukan inspeksi fisik.
                  </div>
                )}
              </div>

              {/* SUB-SECTION C: KEPUTUSAN AWAL BnM MANAJER */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-indigo-600" />
                      Persetujuan Awal BnM Manajer Cabang
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Persetujuan manajerial untuk menentukan apakah laporan masuk penanganan pekerjaan atau selesai.
                    </p>
                  </div>
                </div>

                {incident.verification?.bmApproval ? (
                  <div className="bg-slate-50/80 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Keputusan Manajer</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5 uppercase">
                          {incident.verification.bmApproval.decision}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Pemberi Persetujuan</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                          {incident.verification.bmApproval.decidedBy || `BnM Manajer (${incident.branch})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Waktu Keputusan</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium block mt-0.5">
                          {safeFormatDate(incident.verification.bmApproval.decidedAt)}
                        </span>
                      </div>
                    </div>

                    {(incident.verification.bmApproval.decisionNotes || incident.verification.bmApproval.rejectionReason) && (
                      <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Catatan BnM Manajer:</span>
                        <p className="text-slate-800 dark:text-slate-200 italic">
                          {incident.verification.bmApproval.decisionNotes || incident.verification.bmApproval.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
                    {incident.status === "pending_bm_approval"
                      ? "Hasil pemeriksaan telah diajukan dan sedang menunggu review & persetujuan awal BnM Manajer."
                      : "Persetujuan awal BnM Manajer akan aktif setelah petugas cabang menginput hasil pemeriksaan fisik."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ESTIMASI & APPROVAL */}
          {activeTab === "estimasi" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h6 className="font-bold text-xs">Ketentuan Estimasi Biaya SPARTA SIAGA</h6>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    Perhitungan dan pembuatan rincian estimasi biaya dikerjakan melalui aplikasi SPARTA terkait (di luar SIAGA). Petugas mengunggah dokumen hasil estimasi secara manual melalui menu <strong>Update Progress</strong> pada tahap <strong>Milestone Estimasi (25%)</strong>.
                  </p>
                </div>
              </div>

              {estimationRoute ? (
                <>
                  <EstimationStatusCard route={estimationRoute} loading={loading} />
                  <WorkReadinessCard
                    incident={incident}
                    estimationRoute={estimationRoute}
                    canUpdate={false}
                    updateReason="Kesiapan kerja dikelola melalui sistem SPARTA terkait."
                    onReadinessUpdated={loadData}
                  />
                </>
              ) : (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <Calculator className="w-10 h-10 text-slate-400 mx-auto" />
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      Dokumentasi Estimasi Biaya
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                      Data laporan dapat digunakan pada proses aplikasi SPARTA terkait. Setelah dokumen estimasi selesai, unggah dokumen PDF/berkas hasil estimasi pada menu Update Progress untuk mencatat Milestone 25%.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROGRES & MILESTONE (Task 6: RepairLinksCard REMOVED) */}
          {activeTab === "progres" && (
            <div className="space-y-6 animate-in fade-in">
              <MilestoneProgressionCard
                incident={incident}
                identity={identity}
                readOnly={true}
                onMilestoneUpdated={loadData}
              />

              {/* Progress History Timeline */}
              {progressHistory.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Log Pembaruan Fisik Tambahan ({progressHistory.length})
                    </h5>
                  </div>
                  <ProgressTimeline history={progressHistory} loading={loading} />
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RIWAYAT & DOKUMEN */}
          {activeTab === "dokumen" && (
            <div className="space-y-6 animate-in fade-in">
              {/* SECTION A: UNDUH DOKUMEN RESMI (PDF AWAL & PDF FINAL) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Dokumen Resmi SPARTA SIAGA
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Unduh berkas PDF terverifikasi sistem sesuai tahapan penanganan laporan.
                    </p>
                  </div>
                </div>

                {/* Unified PDF Download Banner */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Dokumen Laporan PDF Resmi
                    </span>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      Tautan resmi `/api/incidents/${incident.id}/export/pdf` untuk mencetak atau mengunduh ringkasan laporan terbaru.
                    </p>
                  </div>
                  <a
                    href={`/api/incidents/${incident.id}/export/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-4 rounded-lg text-xs font-bold bg-[#1D5AA6] hover:bg-[#123B6D] text-white flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF Laporan</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PDF Laporan Awal */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" />
                          Laporan Awal Pemeriksaan (PDF)
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          Tersedia
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Memuat identitas kejadian, parameter bencana, foto bukti visual awal, hasil inspeksi cabang, dan persetujuan awal BnM Manajer.
                      </p>
                    </div>

                    <a
                      href={`/api/incidents/${incident.id}/export/initial-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-[#1D5AA6] hover:bg-[#123B6D] text-white flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Laporan Awal (PDF)</span>
                    </a>
                  </div>

                  {/* PDF Laporan Final (CLOSED Only) */}
                  <div
                    className={`p-4 rounded-xl border space-y-2.5 flex flex-col justify-between ${
                      isReportClosed
                        ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 opacity-80"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <ShieldCheck className={`w-4 h-4 ${isReportClosed ? "text-emerald-600" : "text-slate-400"}`} />
                          Berita Acara Final Selesai (PDF)
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isReportClosed
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {isReportClosed ? "CLOSED" : "Terkunci"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Dokumen resmi penutupan penanganan fisik 100%, ringkasan 5 milestone, lampiran dokumen bukti, dan pengesahan final BnM Manajer.
                      </p>
                    </div>

                    {isReportClosed ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/incidents/${incident.id}/export/final-pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh PDF Final (CLOSED)</span>
                        </a>
                        <a
                          href={`/api/incidents/${incident.id}/export/final-bundle`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Unduh bundel semua dokumen bukti (ZIP)"
                          className="py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ZIP Bundel</span>
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Terkunci (Menunggu Status CLOSED)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION B: APPEND-ONLY TIMELINE AUDIT HISTORY */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Log Kronologi Audit Laporan (Append-Only)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Catatan jejak aktivitas resmi dari pembuatan laporan hingga selesai.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {incident.timeline?.length || 0} Peristiwa
                  </span>
                </div>

                <div className="space-y-3">
                  {(!incident.timeline || incident.timeline.length === 0) ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Belum ada catatan riwayat kronologi.</p>
                  ) : (
                    incident.timeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 text-xs"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.label || item.stage}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Aktor: <strong className="text-slate-800 dark:text-slate-200">{item.actor}</strong>
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LIGHTBOX PHOTO PREVIEW MODAL */}
        {previewPhoto && (
          <div
            id="initial-photo-preview-modal"
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setPreviewPhoto(null)}
          >
            <div
              className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview Header */}
              <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">
                    {previewPhoto.title || "Detail Foto Bukti"}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                      previewPhoto.source === "camera"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    {previewPhoto.source === "camera" ? "Foto Kamera Langsung" : "Unggahan Galeri HP"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Image */}
              <div className="flex-1 bg-black/50 p-3 flex items-center justify-center overflow-hidden min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewPhoto.url}
                  alt={previewPhoto.title}
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-lg"
                />
              </div>

              {/* Preview Metadata Footer */}
              <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                {previewPhoto.galleryReason && (
                  <p>
                    <strong className="text-slate-400">Alasan Menggunakan Galeri:</strong> {previewPhoto.galleryReason}
                  </p>
                )}
                {previewPhoto.sourceProvider && (
                  <p>
                    <strong className="text-slate-400">Pemberi / Sumber Foto:</strong> {previewPhoto.sourceProvider}
                  </p>
                )}
                {previewPhoto.receiptContext && (
                  <p>
                    <strong className="text-slate-400">Saluran Penerimaan:</strong> {previewPhoto.receiptContext}
                  </p>
                )}
                {previewPhoto.capturedAt && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    Waktu Pengambilan: {safeFormatDate(previewPhoto.capturedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
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
    </AppDialog>
  );
}
