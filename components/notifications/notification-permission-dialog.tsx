"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Volume2,
  VolumeX,
  CheckCircle2,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestDesktopNotificationPermission,
  isSoundAlertEnabled,
  setSoundAlertEnabled,
  triggerDesktopPopup,
  playEmergencyAudioChime,
  setUserDismissedPermissionPrompt,
} from "@/lib/desktop-notification";

interface NotificationPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export function NotificationPermissionDialog({
  isOpen,
  onClose,
  onPermissionGranted,
}: NotificationPermissionDialogProps) {
  const [currentPermission, setCurrentPermission] = useState<NotificationPermission>("default");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [browserSupportsNotification, setBrowserSupportsNotification] = useState<boolean>(true);
  const [browserSupportsAudio, setBrowserSupportsAudio] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBrowserSupportsNotification(isNotificationSupported());
      const audioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      setBrowserSupportsAudio(typeof audioCtx !== "undefined");
      setCurrentPermission(getNotificationPermission());
      setSoundEnabled(isSoundAlertEnabled());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      setSoundAlertEnabled(soundEnabled);
      setUserDismissedPermissionPrompt(true);

      if (soundEnabled && browserSupportsAudio) {
        playEmergencyAudioChime();
      }

      if (browserSupportsNotification) {
        const result = await requestDesktopNotificationPermission();
        setCurrentPermission(result);

        if (result === "granted") {
          triggerDesktopPopup({
            id: "perm-dialog-granted",
            title: "Notifikasi SPARTA SIAGA Aktif",
            body: "Pemberitahuan darurat dan status laporan aktif pada perangkat ini.",
            disasterType: "earthquake",
            forceBypassBranchFilter: true,
          });
        }
      }

      if (onPermissionGranted) {
        onPermissionGranted();
      }

      onClose();
    } catch (err) {
      console.error("Error activating notifications:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setUserDismissedPermissionPrompt(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Neutral Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Aktifkan Notifikasi SPARTA SIAGA
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pemberitahuan Dini & Peringatan Darurat
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              aria-label="Tutup"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Aktifkan notifikasi untuk menerima pembaruan status laporan bencana, eskalasi darurat kejadian alam, dan tindak lanjut penanganan operasional secara tepat waktu.
          </p>

          {/* Cards: Notification & Audio */}
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {browserSupportsNotification ? "Notifikasi Browser / Sistem" : "Pemberitahuan Dalam Aplikasi"}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                  {browserSupportsNotification
                    ? "Menampilkan pesan pembaruan saat terjadi laporan darurat atau persetujuan penanganan."
                    : "Browser/perangkat saat ini tidak mendukung Web Notifications sistem; pemberitahuan tetap aktif di dalam aplikasi."}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Sinyal Suara Siaga
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    {browserSupportsAudio
                      ? "Bunyi nada pengingat saat laporan darurat diterima."
                      : "Audio web tidak didukung pada browser ini."}
                  </p>
                </div>
              </div>

              {browserSupportsAudio && (
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                    soundEnabled
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {soundEnabled ? "Aktif" : "Hening"}
                </button>
              )}
            </div>
          </div>

          {/* Browser Permission Info Indicator */}
          {browserSupportsNotification && currentPermission === "denied" && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed">
                Izin notifikasi browser sebelumnya diblokir. Anda dapat mengizinkannya kembali melalui ikon pengaturan/gembok pada bilah alamat browser.
              </span>
            </div>
          )}

          {!browserSupportsNotification && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-slate-600 dark:text-slate-300 text-xs">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed">
                Peringatan darurat tetap akan diproses dan ditampilkan di dalam aplikasi SPARTA SIAGA.
              </span>
            </div>
          )}
        </div>

        {/* Responsive Action Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-center"
          >
            Nanti Saja
          </button>

          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aktifkan Notifikasi</span>
          </button>
        </div>

      </div>
    </div>
  );
}
