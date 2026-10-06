"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  AlertCircle,
  Lock,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { IncidentRecord } from "@/types/incident";
import { EstimationRouteRecord } from "@/lib/estimation-service";
import {
  WorkReadinessCategory,
  WorkReadinessRequirementItem,
  WorkReadinessRequirementKey,
  WORK_READINESS_REQUIREMENTS,
  resolveWorkReadinessCategory,
} from "@/lib/work-readiness";

interface WorkReadinessCardProps {
  incident: IncidentRecord;
  estimationRoute: EstimationRouteRecord | null;
  canUpdate?: boolean;
  updateReason?: string;
  onReadinessUpdated?: () => void;
}

export function WorkReadinessCard({
  incident,
  estimationRoute,
  canUpdate = false,
  updateReason,
  onReadinessUpdated,
}: WorkReadinessCardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [readinessData, setReadinessData] = useState<any>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const category = resolveWorkReadinessCategory(
    incident.tkpType,
    estimationRoute?.handlerType
  ) || "STORE_BMS";

  const requirements = WORK_READINESS_REQUIREMENTS[category] || [];

  const loadReadiness = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/incidents/${incident.id}/readiness`);
      if (res.ok) {
        const json = await res.json();
        setReadinessData(json.data);
      }
    } catch (err) {
      console.error("[WorkReadinessCard] Error loading readiness:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incident.id) {
      loadReadiness();
    }
  }, [incident.id, estimationRoute?.updatedAt]);

  const workStatus = readinessData?.workStatus || estimationRoute?.workStatus || "NOT_READY";
  const estimationStatus = readinessData?.estimationStatus || estimationRoute?.status || "WAITING_ESTIMATION";
  const isEstimationCompleted = estimationStatus === "ESTIMATION_COMPLETED";
  const isWorkReady = workStatus === "READY_FOR_WORK" || workStatus === "IN_PROGRESS" || workStatus === "COMPLETED";
  const isLocked = isWorkReady;

  const totalReqs = requirements.length;
  const currentDetails = readinessData?.details || {};
  const completedReqs = requirements.filter((r) => currentDetails[r.key]?.completed).length;
  const allCompleted = completedReqs === totalReqs && totalReqs > 0;

  // Handler toggle boolean
  const handleToggleBoolean = async (reqKey: WorkReadinessRequirementKey, currentValue: boolean) => {
    if (isLocked || !canUpdate) return;
    try {
      setSubmittingKey(reqKey);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/incidents/${incident.id}/readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement_key: reqKey,
          value: !currentValue,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui status checklist.");
      }

      setSuccessMsg(json.data?.message || "Checklist berhasil diperbarui.");
      await loadReadiness();
      if (onReadinessUpdated) onReadinessUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui checklist.");
    } finally {
      setSubmittingKey(null);
    }
  };

  // Handler file upload
  const handleFileUpload = async (reqKey: WorkReadinessRequirementKey, file: File) => {
    if (isLocked || !canUpdate) return;
    try {
      setSubmittingKey(reqKey);
      setErrorMsg(null);
      setSuccessMsg(null);

      const formData = new FormData();
      formData.append("requirement_key", reqKey);
      formData.append("file", file);

      const res = await fetch(`/api/incidents/${incident.id}/readiness`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengunggah berkas bukti.");
      }

      setSuccessMsg(json.data?.message || "Berkas bukti berhasil diunggah.");
      await loadReadiness();
      if (onReadinessUpdated) onReadinessUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengunggah berkas.");
    } finally {
      setSubmittingKey(null);
    }
  };

  // Handler explicit transition to READY_FOR_WORK
  const handleExplicitTransition = async () => {
    if (isLocked || !canUpdate) return;
    try {
      setSubmittingKey("TRANSITION");
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/incidents/${incident.id}/readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRANSITION_READY" }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengubah status kesiapan kerja.");
      }

      setSuccessMsg("Pekerjaan telah dinyatakan SIAP DIKERJAKAN (READY_FOR_WORK).");
      await loadReadiness();
      if (onReadinessUpdated) onReadinessUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengubah status kesiapan kerja.");
    } finally {
      setSubmittingKey(null);
    }
  };

  const getCategoryLabel = (cat: WorkReadinessCategory) => {
    switch (cat) {
      case "STORE_BMS":
        return "Toko — BMS (Building Maintenance Store)";
      case "DC_WH_BES":
        return "DC / Gudang — BES (Building Equipment Specialist)";
      case "BUILDING":
        return "Building Maintenance";
      case "REKANAN":
        return "Pihak Ketiga / Rekanan";
      default:
        return cat;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Kategori Readiness:
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {getCategoryLabel(category)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Persyaratan wajib sebelum pekerjaan fisik perbaikan dapat dimulai.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {workStatus === "NOT_READY" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5" />
              Belum Siap Dikerjakan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Siap Dikerjakan (Ready)
            </span>
          )}
        </div>
      </div>

      {/* Estimation Prerequisite Warning */}
      {!isEstimationCompleted && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-slate-800 dark:text-slate-200">
              Tahap Estimasi Belum Selesai
            </span>
            <span>
              Persyaratan kesiapan kerja dapat disiapkan, namun pekerjaan fisik baru dapat disetujui (READY_FOR_WORK) setelah status estimasi mencapai <strong>ESTIMATION_COMPLETED</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Progress Counter & Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            Kelengkapan Persyaratan:
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {completedReqs} dari {totalReqs} Terpenuhi
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              allCompleted ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dynamic Requirement List */}
      <div className="space-y-3 pt-1">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Memuat daftar persyaratan...
          </div>
        ) : (
          requirements.map((req: WorkReadinessRequirementItem, idx: number) => {
            const detail = currentDetails[req.key] || {};
            const isItemCompleted = Boolean(detail.completed);
            const rawVal = detail.value;
            const isSubmittingThis = submittingKey === req.key;

            return (
              <div
                key={req.key}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isItemCompleted
                    ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800/60"
                    : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                        {req.label}
                      </h5>
                      {req.isRequired && (
                        <span className="text-[10px] text-rose-500 font-bold">*Wajib</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                      {req.description}
                    </p>

                    {/* Metadata Upload / Approval Info */}
                    {isItemCompleted && rawVal && typeof rawVal === "object" && (
                      <div className="pl-6 pt-1 text-[10px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {rawVal.fileName && (
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            Berkas: {rawVal.fileName}
                          </span>
                        )}
                        {rawVal.updatedByName && (
                          <span>Oleh: {rawVal.updatedByName}</span>
                        )}
                        {rawVal.updatedAt && (
                          <span>
                            Tanggal: {new Date(rawVal.updatedAt).toLocaleDateString("id-ID")}
                          </span>
                        )}
                        {rawVal.fileUrl && (
                          <a
                            href={
                              rawVal.evidenceId
                                ? `/api/incidents/${incident.id}/readiness/evidence/${rawVal.evidenceId}`
                                : `/api/incidents/${incident.id}/readiness/evidence/${req.key}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-2.5 h-2.5" /> Buka Bukti
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions (Toggle Boolean vs File Upload) */}
                  <div className="flex items-center gap-2 shrink-0 sm:self-center pl-6 sm:pl-0">
                    {!canUpdate ? (
                      // Read-only presentation for users without WORK_READINESS_UPDATE capability
                      req.type === "BOOLEAN_APPROVAL" ? (
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${
                            isItemCompleted
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                          title={updateReason || "Mode baca saja (tidak memiliki izin update)"}
                        >
                          {isItemCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>{isItemCompleted ? "Disetujui" : "Menunggu Approval"}</span>
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${
                            isItemCompleted
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                          title={updateReason || "Mode baca saja (tidak memiliki izin update)"}
                        >
                          {isItemCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>{isItemCompleted ? "Terlampir" : "Belum Diunggah"}</span>
                        </span>
                      )
                    ) : req.type === "BOOLEAN_APPROVAL" ? (
                      <button
                        type="button"
                        disabled={isLocked || isSubmittingThis}
                        onClick={() => handleToggleBoolean(req.key, isItemCompleted)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs ${
                          isItemCompleted
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                        } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                        title={isLocked ? "Persyaratan kesiapan kerja telah tervalidasi dan dikunci" : undefined}
                      >
                        {isSubmittingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isItemCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="w-3.5 h-3.5 border-2 border-slate-400 rounded-sm inline-block" />
                        )}
                        <span>{isItemCompleted ? "Disetujui" : "Setujui"}</span>
                      </button>
                    ) : (
                      <div>
                        <input
                          type="file"
                          ref={(el) => {
                            fileInputRefs.current[req.key] = el;
                          }}
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files[0]) {
                              handleFileUpload(req.key, files[0]);
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={isLocked || isSubmittingThis}
                          onClick={() => {
                            if (fileInputRefs.current[req.key]) {
                              fileInputRefs.current[req.key]?.click();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs ${
                            isItemCompleted
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                          title={isLocked ? "Persyaratan kesiapan kerja telah tervalidasi dan dikunci" : undefined}
                        >
                          {isSubmittingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isItemCompleted ? "Ganti Berkas" : "Unggah Bukti"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Gating: Validasi & Mulai Kerja */}
      {!isWorkReady && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {allCompleted ? (
              isEstimationCompleted ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Seluruh persyaratan lengkap. Siap divalidasi.
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Persyaratan lengkap. Menunggu tahap estimasi selesai.
                </span>
              )
            ) : (
              <span>Lengkapi seluruh persyaratan di atas untuk membuka izin mulai kerja fisik.</span>
            )}
          </div>

          {canUpdate && allCompleted && isEstimationCompleted && (
            <button
              type="button"
              disabled={submittingKey === "TRANSITION"}
              onClick={handleExplicitTransition}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md inline-flex items-center justify-center gap-2 transition-colors"
            >
              {submittingKey === "TRANSITION" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Validasi & Siap Dikerjakan</span>
            </button>
          )}
        </div>
      )}

      {/* Lock Notice if Ready */}
      {isWorkReady && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Persyaratan kesiapan kerja telah tervalidasi dan dikunci. Pekerjaan dapat dilanjutkan ke tahap pengerjaan fisik (Update Progress).
          </span>
        </div>
      )}
    </div>
  );
}
