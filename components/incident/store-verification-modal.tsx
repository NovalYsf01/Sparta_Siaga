"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Upload,
  Camera,
  Store,
  Lock,
  ArrowRight,
  HelpCircle,
  Clock,
  User,
  Phone,
  MessageSquare,
  Building2,
  FileText,
  AlertCircle,
  RotateCcw,
  Loader2,
  ExternalLink,
  MapPin,
  Flame,
  CloudRain,
  ShieldCheck,
} from "lucide-react";
import {
  IncidentRecord,
  RoleType,
  DamageReport,
  InspectionCondition,
  InspectionMethod,
  BmDecision,
} from "@/types/incident";
import { checkClientPermission } from "@/lib/client-permissions";
import { UserIdentity } from "@/lib/identity";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { CameraCapture } from "./camera-capture";

interface StoreVerificationModalProps {
  incident: IncidentRecord | null;
  activeRole?: RoleType;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVerification: (
    incidentId: string,
    isDamaged: boolean,
    report?: Partial<DamageReport>
  ) => void;
}

export function StoreVerificationModal({
  incident,
  isOpen,
  onClose,
  onConfirmVerification,
}: StoreVerificationModalProps) {
  useBodyScrollLock(isOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [permissionData, setPermissionData] = useState<{
    canConfirm: boolean;
    confirmReason: string;
    canBmApprove?: boolean;
    bmApproveReason?: string;
    scopeReason: string;
  } | null>(null);

  // Simplified inspection form states
  const [inspectionMethod, setInspectionMethod] = useState<InspectionMethod>("kunjungan_langsung");
  const [officerName, setOfficerName] = useState("");
  const [officerRole, setOfficerRole] = useState("Kepala Toko");
  const [officerChannel, setOfficerChannel] = useState("WhatsApp");
  const [officerContact, setOfficerContact] = useState("");

  const [selectedCondition, setSelectedCondition] = useState<InspectionCondition>("damaged");
  const [notes, setNotes] = useState("");

  // Real file uploads
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ name: string; size: number; url: string }[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Branch Manager approval states
  const [bmDecision, setBmDecision] = useState<BmDecision>("approved");
  const [bmNotes, setBmNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && incident) {
      setSubmitError(null);
      setSelectedFiles([]);
      setFilePreviews([]);
      setNotes("");
      setBmNotes("");

      Promise.all([
        fetch("/api/auth/me").then((res) => (res.ok ? res.json() : null)),
        fetch(`/api/incidents/${incident.id}/permissions`).then((res) => (res.ok ? res.json() : null)),
      ])
        .then(([meData, permData]) => {
          if (meData) setIdentity(meData);
          if (permData?.data) {
            setPermissionData({
              canConfirm: Boolean(permData.data.canConfirm),
              confirmReason: permData.data.confirmReason || "",
              canBmApprove: Boolean(permData.data.canBmApprove),
              bmApproveReason: permData.data.bmApproveReason || "",
              scopeReason: permData.data.confirmReason || "Di luar cakupan akun Anda",
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, incident]);

  // Clean up object URLs when unmounting or files change
  useEffect(() => {
    return () => {
      filePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [filePreviews]);

  if (!isOpen || !incident) return null;

  const isAutoEarthquake =
    incident.reportOrigin === "automatic_earthquake" ||
    (incident.disasterType === "earthquake" && incident.reportOrigin !== "manual");

  const clientCheck = checkClientPermission({
    identity,
    permission: "REPORT_CONFIRM",
    report: incident,
  });

  const canConfirm = permissionData !== null ? permissionData.canConfirm : clientCheck.authorized;
  const canBmApprove =
    permissionData?.canBmApprove ??
    (identity?.role === "bm" && identity?.branch?.toLowerCase() === incident.branch?.toLowerCase());

  // Determine if this modal displays BM Approval mode or BMS/BES Inspection mode
  const isBmView = Boolean(
    canBmApprove &&
      (incident.status === "pending_bm_approval" || incident.verification?.confirmedBy)
  );

  const blockedScopeReason =
    permissionData?.scopeReason ||
    permissionData?.confirmReason ||
    clientCheck.scopeReason ||
    "Di luar cakupan akun Anda";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    const merged = [...selectedFiles, ...newFiles];
    setSelectedFiles(merged);

    const newPreviews = newFiles.map((file) => ({
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));
    setFilePreviews((prev) => [...prev, ...newPreviews]);
    setSubmitError(null);
  };

  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index].url);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // BMS / BES inspection submission
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm || isSubmitting) return;

    if (selectedFiles.length === 0) {
      setSubmitError("Minimal satu foto bukti pemeriksaan wajib dilampirkan.");
      return;
    }

    if (inspectionMethod === "informasi_petugas" && !officerName.trim()) {
      setSubmitError("Nama petugas pemberi informasi wajib diisi.");
      return;
    }

    if (!notes.trim()) {
      setSubmitError("Keterangan kondisi aktual wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("inspection_method", inspectionMethod);
      formData.append("condition", selectedCondition);
      formData.append("notes", notes.trim());

      if (inspectionMethod === "informasi_petugas") {
        formData.append("officer_name", officerName.trim());
        formData.append("officer_role", officerRole.trim());
        formData.append("officer_channel", officerChannel.trim());
        if (officerContact.trim()) {
          formData.append("officer_contact", officerContact.trim());
        }
      }

      selectedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const res = await fetch(`/api/incidents/${incident.id}/confirm`, {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Gagal mengajukan pemeriksaan.");
      }

      onConfirmVerification(incident.id, selectedCondition === "damaged", {
        confirmedBy: identity?.name
          ? `${identity.name} (${identity.role?.toUpperCase() || "BMS"})`
          : "Petugas Pemeriksa",
        confirmedAt: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
        isDamaged: selectedCondition === "damaged",
        notes,
      });

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Branch Manager approval decision submission
  const handleSubmitBmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBmApprove || isSubmitting) return;

    if (bmDecision === "rejected" && isAutoEarthquake) {
      setSubmitError(
        "Laporan gempa otomatis BMKG tidak dapat ditolak sebagai hoax. Pilih 'Nyatakan Aman' jika toko tidak mengalami kerusakan."
      );
      return;
    }

    if (
      (bmDecision === "rejected" || bmDecision === "clarification_requested") &&
      !bmNotes.trim()
    ) {
      setSubmitError(
        bmDecision === "rejected"
          ? "Alasan penolakan laporan tidak valid wajib diisi."
          : "Catatan permintaan klarifikasi kepada BMS/BES wajib diisi."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bm_approval",
          decision: bmDecision,
          reason: bmNotes.trim(),
          notes: bmNotes.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Gagal menyimpan keputusan BnM Manajer.");
      }

      onConfirmVerification(incident.id, bmDecision === "approved", {
        confirmedBy: `${identity?.name || "BnM Manajer"}`,
        confirmedAt: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
        isDamaged: bmDecision === "approved",
        notes: bmNotes,
      });

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan keputusan.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAccess = canConfirm || canBmApprove;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overscroll-none touch-none select-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92dvh] touch-auto select-text">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isBmView
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                  : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
              }`}
            >
              {isBmView ? <ShieldAlert className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {isBmView ? "Review & Keputusan BnM Manajer" : "Pemeriksaan Lapangan Kondisi Lokasi"}
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {incident.tkpType === "dc" ? "Warehouse / DC" : "Toko"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {incident.storeName} • Cabang {incident.branch}
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

        {/* Content */}
        {!hasAccess ? (
          <div className="p-6 text-center space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Akses Tidak Tersedia</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Anda tidak memiliki wewenang untuk memeriksa atau menyetujui laporan ini.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Pemeriksaan gerai toko hanya untuk BMS cabang terkait. Laporan DC untuk BES cabang terkait. Persetujuan untuk BnM Manajer atau Administrator.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status Akun:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {identity
                    ? `${identity.name} (${identity.role?.toUpperCase()} - ${identity.branch || "HO"})`
                    : "Tamu"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Alasan Blokir:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-right text-[11px]">
                  {blockedScopeReason}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        ) : isBmView ? (
          /* =========================================================================
             BnM MANAJER REVIEW & DECISION MODE
             ========================================================================= */
          <form
            onSubmit={handleSubmitBmDecision}
            className="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0"
          >
            {submitError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Inspection Submission Summary Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rangkuman Pemeriksaan Lapangan
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    incident.verification?.condition === "safe" || incident.verification?.isDamaged === false
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : incident.verification?.condition === "uncertain"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                  }`}
                >
                  {incident.verification?.condition === "safe" || incident.verification?.isDamaged === false
                    ? "Kondisi Aman"
                    : incident.verification?.condition === "uncertain"
                    ? "Belum Pasti"
                    : "Ada Kerusakan Fisik"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Pemeriksa:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {incident.verification?.confirmedBy || "Petugas Pemeriksa"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Waktu Pemeriksaan:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {incident.verification?.confirmedAt || "Baru saja"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Metode:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {incident.verification?.inspectionMethod === "informasi_petugas"
                      ? "Informasi Petugas Lokasi"
                      : "Kunjungan Langsung"}
                  </span>
                </div>
                {incident.verification?.officerSource && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Sumber Informasi:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {incident.verification.officerSource.name} ({incident.verification.officerSource.channel || "WhatsApp"})
                    </span>
                  </div>
                )}
              </div>

              {incident.verification?.notes && (
                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-2 text-xs">
                  <span className="text-slate-400 block text-[11px]">Keterangan Pemeriksa:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    {incident.verification.notes}
                  </p>
                </div>
              )}

              {/* Evidence Photos Gallery */}
              {incident.verification?.photos && incident.verification.photos.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-400 block text-[11px] mb-1.5">
                    Bukti Foto Pemeriksaan ({incident.verification.photos.length}):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {incident.verification.photos.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        <img src={url} alt={`Bukti ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 p-1 rounded-md bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BM Decision Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Pilihan Keputusan BnM Manajer:
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setBmDecision("approved")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    bmDecision === "approved"
                      ? "border-red-500 bg-red-50/70 dark:bg-red-950/40 ring-2 ring-red-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      bmDecision === "approved" ? "text-red-600 dark:text-red-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Setujui Penanganan</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Ada kerusakan fisik, mulai estimasi</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBmDecision("safe")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    bmDecision === "safe"
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <CheckCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      bmDecision === "safe" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Kondisi Aman</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Tidak ada kerusakan, tutup tiket</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBmDecision("clarification_requested")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    bmDecision === "clarification_requested"
                      ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <HelpCircle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      bmDecision === "clarification_requested"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Minta Klarifikasi</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">BMS/BES wajib revisi foto/catatan</div>
                  </div>
                </button>

                {/* Tolak Laporan: Restricted for Automatic Earthquake */}
                {!isAutoEarthquake ? (
                  <button
                    type="button"
                    onClick={() => setBmDecision("rejected")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      bmDecision === "rejected"
                        ? "border-slate-700 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-500/20"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <X
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        bmDecision === "rejected" ? "text-slate-800 dark:text-slate-200" : "text-slate-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Tolak Laporan</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Laporan manual tidak valid / hoax</div>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-75">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Tolak Laporan (Nonaktif)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                      Laporan gempa otomatis terverifikasi sensor BMKG. Pilih &quot;Kondisi Aman&quot; jika toko tidak mengalami kerusakan.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reason / Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {bmDecision === "rejected" || bmDecision === "clarification_requested" ? (
                    <span className="text-red-600 dark:text-red-400">
                      * Alasan {bmDecision === "rejected" ? "Penolakan" : "Permintaan Klarifikasi"} (Wajib):
                    </span>
                  ) : (
                    "Catatan / Arahan BnM Manajer (Opsional):"
                  )}
                </label>
              </div>
              <textarea
                value={bmNotes}
                onChange={(e) => setBmNotes(e.target.value)}
                rows={3}
                required={bmDecision === "rejected" || bmDecision === "clarification_requested"}
                placeholder={
                  bmDecision === "rejected"
                    ? "Jelaskan mengapa laporan ini tidak valid..."
                    : bmDecision === "clarification_requested"
                    ? "Tulis poin apa yang perlu diperjelas atau difoto ulang oleh tim pemeriksa..."
                    : "Tambahkan catatan arahan penanganan jika diperlukan..."
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all ${
                  bmDecision === "approved"
                    ? "bg-red-600 hover:bg-red-700"
                    : bmDecision === "safe"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : bmDecision === "clarification_requested"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-slate-800 hover:bg-slate-900"
                }`}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {bmDecision === "approved"
                    ? "Setujui Penanganan Kerusakan"
                    : bmDecision === "safe"
                    ? "Konfirmasi Kondisi Aman"
                    : bmDecision === "clarification_requested"
                    ? "Kirim Permintaan Klarifikasi"
                    : "Tolak Laporan Tidak Valid"}
                </span>
                {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </form>
        ) : (
          /* =========================================================================
             BMS / BES SIMPLIFIED INSPECTION SUBMISSION MODE
             ========================================================================= */
          <form
            onSubmit={handleSubmitInspection}
            className="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0"
          >
            {submitError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Clarification Notice if previous attempt needed clarification */}
            {incident.status === "clarification_requested" && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Permintaan Klarifikasi dari BnM Manajer</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                  Catatan BnM Manajer: &quot;
                  {incident.verification?.bmApproval?.clarificationReason ||
                    incident.verification?.notes ||
                    "Mohon lengkapi foto dan keterangan aktual."}
                  &quot;
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium pt-1">
                  Pengajuan ini akan dicatat sebagai revisi resmi dan dievaluasi kembali oleh BnM Manajer.
                </p>
              </div>
            )}

            {/* 1. Identitas Laporan & TKP (Otomatis Terisi) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">Identitas Laporan & TKP</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{incident.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Lokasi:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {incident.storeName} ({incident.storeId || "-"})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Jenis Bencana:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {incident.disasterType === "earthquake"
                      ? "Gempa Bumi"
                      : incident.disasterType === "flood"
                      ? "Banjir"
                      : incident.disasterType === "heavy_rain"
                      ? "Hujan Lebat / Badai"
                      : incident.disasterType === "fire"
                      ? "Kebakaran"
                      : incident.disasterType || "Insiden Lapangan"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cabang:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{incident.branch}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Asal Laporan:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {isAutoEarthquake ? "Otomatis BMKG (SPARTA SIAGA)" : "Laporan Manual"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Jalur Pemeriksaan (Terpisah Tegas) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Pilih Jalur Pemeriksaan:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInspectionMethod("kunjungan_langsung")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    inspectionMethod === "kunjungan_langsung"
                      ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Building2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      inspectionMethod === "kunjungan_langsung" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Kunjungan Langsung</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Verifikasi fisik di lokasi TKP</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectionMethod("informasi_petugas")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    inspectionMethod === "informasi_petugas"
                      ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <MessageSquare
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      inspectionMethod === "informasi_petugas" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Informasi Awal — Belum Terverifikasi</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Via WhatsApp / Telepon / Toko</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Identitas Petugas jika Informasi Awal Belum Terverifikasi */}
            {inspectionMethod === "informasi_petugas" && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block">
                  Identitas Sumber Informasi Lapangan:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nama Petugas Lokasi (Wajib):
                    </label>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Jabatan di Lokasi:
                    </label>
                    <input
                      type="text"
                      value={officerRole}
                      onChange={(e) => setOfficerRole(e.target.value)}
                      placeholder="Contoh: Kepala Toko / Crew"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Saluran Komunikasi:
                    </label>
                    <select
                      value={officerChannel}
                      onChange={(e) => setOfficerChannel(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telepon Langsung">Telepon Langsung</option>
                      <option value="Email Perusahaan">Email Perusahaan</option>
                      <option value="Portal Internal SPARTA">Portal Internal SPARTA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nomor Kontak / WA (Opsional):
                    </label>
                    <input
                      type="text"
                      value={officerContact}
                      onChange={(e) => setOfficerContact(e.target.value)}
                      placeholder="0812xxxxxxx"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Kondisi Kerusakan (Ada / Tidak Ada Kerusakan) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Kondisi Lapangan:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCondition("damaged")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCondition === "damaged"
                      ? "border-red-500 bg-red-50/70 dark:bg-red-950/40 ring-2 ring-red-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 mb-1 ${
                      selectedCondition === "damaged" ? "text-red-600 dark:text-red-400" : "text-slate-400"
                    }`}
                  />
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Ada Kerusakan</div>
                  <div className="text-[10px] text-slate-500">Perlu penanganan fisik</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCondition("safe")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCondition === "safe"
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <CheckCircle
                    className={`w-4 h-4 mb-1 ${
                      selectedCondition === "safe" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    }`}
                  />
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Tidak Ada Kerusakan</div>
                  <div className="text-[10px] text-slate-500">Kondisi aman</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCondition("uncertain")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCondition === "uncertain"
                      ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <HelpCircle
                    className={`w-4 h-4 mb-1 ${
                      selectedCondition === "uncertain" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                    }`}
                  />
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Belum Pasti</div>
                  <div className="text-[10px] text-slate-500">Perlu cek teknis</div>
                </button>
              </div>
            </div>

            {/* 4. Upload Foto Bukti Pemeriksaan (Minimal 1 Foto Wajib) */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-red-600 dark:text-red-400">*</span> Bukti Foto Pemeriksaan (Minimal 1 Foto Wajib):
                </label>
                <span className="text-[10px] text-slate-400">{selectedFiles.length} foto dipilih</span>
              </div>

              {/* Action buttons for File vs Camera */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-blue-50/40 text-left flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Pilih dari Galeri</div>
                    <div className="text-[10px] text-slate-400">JPG, PNG, WEBP</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-blue-50/40 text-left flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Ambil dari Kamera</div>
                    <div className="text-[10px] text-slate-400">Live Foto HP / Webcam</div>
                  </div>
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Previews */}
              {filePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {filePreviews.map((preview, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100 dark:bg-slate-800 group"
                    >
                      <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-slate-950/70 px-1 py-0.5 text-[9px] text-white truncate font-mono">
                        {(preview.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Deskripsi Singkat Catatan Pemeriksaan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="text-red-600 dark:text-red-400">*</span> Deskripsi Singkat Catatan Pemeriksaan:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                required
                placeholder={
                  selectedCondition === "safe"
                    ? "Contoh: Seluruh struktur bangunan aman, kaca dan rak barang utuh, operasional berjalan normal."
                    : selectedCondition === "uncertain"
                    ? "Contoh: Terdapat getaran terasa dan retakan kecil di dinding luar, butuh inspeksi struktural lanjutan."
                    : "Contoh: Kaca etalase retak dan plafon koridor tengah runtuh sebagian, butuh perbaikan teknisi Sparta..."
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Inspector Identity Footer */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Pemeriksa:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {identity?.name || "BMS"} ({identity?.role?.toUpperCase() || "BMS"})
                </strong>
              </span>
              <span className="text-[10px] text-slate-400">Cabang: {incident.branch}</span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Kirim Hasil Pemeriksaan</span>
                {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </form>
        )}
      </div>

      <CameraCapture
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(file, previewUrl) => {
          setSelectedFiles((prev) => [...prev, file]);
          setFilePreviews((prev) => [...prev, { name: file.name, size: file.size, url: previewUrl }]);
          setSubmitError(null);
          setIsCameraModalOpen(false);
        }}
        storeName={incident.storeName || incident.storeId || "Lokasi Toko"}
        reporterName={identity?.name || "Petugas SPARTA"}
      />
    </div>
  );
}
