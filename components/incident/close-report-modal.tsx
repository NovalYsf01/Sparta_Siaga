"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { IncidentRecord } from "@/types/incident";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface CloseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentRecord | null;
  latestProgress: number;
  hasFinalEvidence: boolean;
  canClose: boolean;
  closeReason?: string;
  onSuccess?: () => void;
}

export function CloseReportModal({
  isOpen,
  onClose,
  incident,
  latestProgress,
  hasFinalEvidence,
  canClose,
  closeReason,
  onSuccess,
}: CloseReportModalProps) {
  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  const [closingNotes, setClosingNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const isEligible = latestProgress === 100 && hasFinalEvidence && canClose;

  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/incidents/${incident.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: closingNotes.trim() }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(json.error || "Gagal menutup laporan.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan sistem saat menutup laporan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6500] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overscroll-none touch-none select-none">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[85dvh] touch-auto select-text">
        {/* Header (Fixed) */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-sm">Penyelesaian & Tutup Laporan</h3>
              <p className="text-[11px] text-emerald-200">
                {incident.storeName} ({incident.branch}) • #{incident.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Internal Scroll Only) */}
        <div className="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Checklist Prasyarat Close Report (Section AF) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Verifikasi Syarat Penutupan Laporan:
            </h4>

            <div className="space-y-2 text-xs">
              {/* Syarat 1: Progress 100% */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  1. Progress Fisik 100%:
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    latestProgress === 100
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {latestProgress === 100 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terpenuhi (100%)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Belum 100% ({latestProgress}%)
                    </>
                  )}
                </span>
              </div>

              {/* Syarat 2: Foto Final/Handover */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  2. Bukti Akhir (FINAL / HANDOVER):
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    hasFinalEvidence
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {hasFinalEvidence ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tersedia
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Belum Diupload
                    </>
                  )}
                </span>
              </div>

              {/* Syarat 3: Permission REPORT_CLOSE */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  3. Hak Akses User (REPORT_CLOSE):
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    canClose
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {canClose ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terotorisasi
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" /> Ditolak (Izin Kurang)
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {!isEligible ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Laporan belum memenuhi seluruh kriteria untuk ditutup.</p>
              <p className="text-[11px] mt-0.5 opacity-90">
                {!canClose
                  ? (closeReason || "Akun Anda tidak memiliki izin REPORT_CLOSE untuk laporan ini.")
                  : latestProgress < 100
                  ? "Harap update progress pekerjaan hingga mencapai 100% terlebih dahulu."
                  : "Harap upload foto bukti akhir pekerjaan dengan tipe FINAL atau HANDOVER."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmClose} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Catatan Penutupan / Serah Terima (Opsional):
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Pekerjaan fisik telah diverifikasi bersama Branch Manager, toko kembali beroperasi normal."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Menutup Laporan...</span>
                  ) : (
                    <>
                      <span>Konfirmasi Tutup Laporan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {!isEligible && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
