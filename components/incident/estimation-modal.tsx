"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calculator,
  Building,
  FileText,
  CheckCircle2,
  User,
  Lock,
  AlertTriangle,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  ExternalLink,
} from "lucide-react";
import { IncidentRecord } from "@/types/incident";
import { UserIdentity } from "@/lib/identity";
import { checkClientPermission } from "@/lib/client-permissions";
import { EstimationRouteRecord, HandlerType } from "@/lib/estimation-service";
import { EstimationStatusCard } from "./estimation-status-card";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { getExternalSystemConfig } from "@/lib/external-systems-config";

interface EstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentRecord | null;
  onRouteCreated?: (route: EstimationRouteRecord) => void;
}

export function EstimationModal({
  isOpen,
  onClose,
  incident,
  onRouteCreated,
}: EstimationModalProps) {
  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [permissionData, setPermissionData] = useState<{
    canTriggerEstimation: boolean;
    triggerEstimationReason: string;
    canViewEstimation: boolean;
  } | null>(null);

  const [activeRoute, setActiveRoute] = useState<EstimationRouteRecord | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const [handlerType, setHandlerType] = useState<HandlerType>("BMS");
  const [loading, setLoading] = useState(false);
  const [successRoute, setSuccessRoute] = useState<EstimationRouteRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && incident) {
      setLoadingRoute(true);
      setSuccessRoute(null);
      setErrorMessage(null);

      Promise.all([
        fetch("/api/auth/me").then((res) => (res.ok ? res.json() : null)),
        fetch(`/api/incidents/${incident.id}/permissions`).then((res) =>
          res.ok ? res.json() : null
        ),
        fetch(`/api/incidents/${incident.id}/estimation`).then((res) =>
          res.ok ? res.json() : null
        ),
      ])
        .then(([meData, permData, estData]) => {
          if (meData) setIdentity(meData.user || meData);
          if (permData?.data) {
            setPermissionData({
              canTriggerEstimation: permData.data.canTriggerEstimation,
              triggerEstimationReason: permData.data.triggerEstimationReason || "",
              canViewEstimation: permData.data.canViewEstimation,
            });
          }
          if (estData?.data) {
            setActiveRoute(estData.data);
          } else {
            setActiveRoute(null);
          }
        })
        .catch((err) => {
          console.error("Failed loading estimation modal data:", err);
        })
        .finally(() => {
          setLoadingRoute(false);
        });
    }
  }, [isOpen, incident]);

  if (!isOpen || !incident) return null;

  const isTkpToko = (incident.tkpType || "toko").toLowerCase() === "toko";

  const clientCheck = checkClientPermission({
    identity,
    permission: "ESTIMATION_TRIGGER",
    report: incident,
  });

  const canTrigger =
    permissionData !== null
      ? permissionData.canTriggerEstimation
      : clientCheck.authorized;
  const blockedScopeReason =
    permissionData?.triggerEstimationReason ||
    clientCheck.scopeReason ||
    "Di luar cakupan akun Anda";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canTrigger) return;

    const resolvedHandler: HandlerType = isTkpToko ? "BMS" : "BES";

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/estimation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handler: resolvedHandler,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccessRoute(json.data);
        setActiveRoute(json.data);
        if (onRouteCreated) onRouteCreated(json.data);
      } else {
        setErrorMessage(json.error || "Gagal membuat rute estimasi.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan sistem saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overscroll-none touch-none select-none">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[85dvh] touch-auto select-text">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#123B6D] text-white shrink-0">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-sm">
                {activeRoute ? "Status Estimasi Laporan" : "Buat Estimasi"}
              </h3>
              <p className="text-[11px] text-blue-200">
                {incident.storeName} ({incident.branch})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto overscroll-contain space-y-5 flex-1 min-h-0">
          {/* JIKA ROUTE SUDAH ADA (DUPLICATE PROTECTION & VIEW STATUS) */}
          {activeRoute ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-200">
                <Info className="w-4 h-4 shrink-0 text-[#1D5AA6]" />
                <span>
                  Laporan ini telah memiliki rute estimasi aktif. Duplikasi atau perubahan handler tidak diizinkan pada Phase 1.
                </span>
              </div>

              <EstimationStatusCard route={activeRoute} />

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : !canTrigger ? (
            /* JIKA TIDAK MEMILIKI ESTIMATION_TRIGGER (BM, Sparta Mtc, HO, Admin) */
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Akses Pembuatan Estimasi Tidak Tersedia
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Anda tidak memiliki izin untuk membuat estimasi pada laporan ini.
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Akses ditentukan berdasarkan permission dan cakupan laporan yang dimiliki akun Anda.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Permission:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Buat / Trigger Estimasi (ESTIMATION_TRIGGER)
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">
                    Cakupan (Scope):
                  </span>
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
          ) : successRoute ? (
            /* SUKSES SUBMIT BARU */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rute Estimasi Berhasil Dibuat!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  {successRoute.handlerType === "BMS"
                    ? "Alur estimasi telah diarahkan ke SPARTA Maintenance."
                    : "Silakan melanjutkan pembuatan agenda pekerjaan rekanan melalui BnM."}
                </p>
              </div>

              <EstimationStatusCard route={successRoute} />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-[#1D5AA6] hover:bg-[#123B6D] text-white font-bold text-xs transition-colors shadow-sm"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            /* FORM BUAT ESTIMASI */
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. INFORMASI LAPORAN (Section I) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-[#123B6D] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Informasi Laporan
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Nomor Laporan
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {incident.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Jenis Bencana
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {incident.disasterType}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      TKP
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isTkpToko ? "Toko / Gerai" : "DC / Gudang"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Status Laporan
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">
                      {incident.status}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Nama Toko / Lokasi
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={incident.storeName}>
                      {incident.storeName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Kode Toko
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {incident.storeId || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Cabang / Kota
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident.branch} {incident.locationCity ? `• ${incident.locationCity}` : ""}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Tanggal Kejadian
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident.date || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Pelapor Lapangan
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {incident.reporter?.name || incident.verification?.confirmedBy || incident.timeline?.[0]?.actor || "Pelapor Lapangan"}
                    </span>
                  </div>

                  {Boolean(incident.reporter?.nik || identity?.nik) && (
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                        NIK Pelapor
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {incident.reporter?.nik || (incident.reporter ? "-" : identity?.nik)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. HANDLER OTOMATIS & TAUTAN SISTEM KERJA */}
              {(() => {
                const extSystem = getExternalSystemConfig(isTkpToko ? "toko" : "dc");
                const autoHandler = isTkpToko ? "BMS" : "BES";
                const autoHandlerTitle = isTkpToko
                  ? "BMS — SPARTA Maintenance (Gerai Toko)"
                  : "BES — Engineering Warehouse (DC/Warehouse)";
                const autoDesc = isTkpToko
                  ? "Estimasi pekerjaan gerai toko ditangani langsung oleh tim BMS cabang terkait."
                  : "Estimasi pekerjaan fasilitas DC/Warehouse ditangani langsung oleh tim BES cabang terkait.";

                return (
                  <div className="space-y-4">
                    {/* Handler Assigned Card */}
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300">
                          Handler Operasional (Otomatis)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1D5AA6] text-white">
                          {autoHandler}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {autoHandlerTitle}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {autoDesc}
                      </p>
                    </div>

                    {/* Direct External System Link Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Sistem Kerja Operasional
                        </span>
                        {extSystem.isConfigured ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Tersedia
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Belum Dikonfigurasi
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {extSystem.name}
                      </p>

                      {extSystem.isConfigured && extSystem.url ? (
                        <div>
                          <a
                            href={extSystem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[#1D5AA6] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                          >
                            <span>Buka Sistem Kerja</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{extSystem.statusLabel}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                        Catatan: Tautan mengarah ke portal kerja eksternal. SPARTA SIAGA tidak melakukan Single Sign-On (SSO) atau sinkronisasi data otomatis dengan sistem kerja tersebut.
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1D5AA6] hover:bg-[#123B6D] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Memproses...</span>
                  ) : (
                    <>
                      <span>Buat Rute Estimasi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
