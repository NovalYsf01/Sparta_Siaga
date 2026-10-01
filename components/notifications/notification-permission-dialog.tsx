"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Bell,
  Volume2,
  VolumeX,
  Building,
  CheckCircle2,
  X,
  AlertTriangle,
  Radio,
  Sparkles,
} from "lucide-react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestDesktopNotificationPermission,
  getUserMonitoredBranch,
  setUserMonitoredBranch,
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
  availableBranches?: string[];
}

const DEFAULT_BRANCHES = [
  "all",
  "SIDOARJO",
  "JAKARTA 1",
  "JAKARTA 2",
  "BANDUNG 1",
  "BANDUNG 2",
  "SEMARANG",
  "YOGYAKARTA",
  "MALANG",
  "JEMBER",
  "BALI",
  "LOMBOK",
  "MEDAN",
  "PALEMBANG",
  "PEKANBARU",
  "LAMPUNG",
  "BATAM",
  "MAKASSAR",
  "MANADO",
  "BANJARMASIN",
  "PONTIANAK",
  "SAMARINDA",
  "CILEUNGSI",
  "CIKOKOL",
  "BALARAJA",
  "PARUNG",
  "KLATEN",
  "REMBANG",
  "KOTABUMI",
];

export function NotificationPermissionDialog({
  isOpen,
  onClose,
  onPermissionGranted,
  availableBranches = DEFAULT_BRANCHES,
}: NotificationPermissionDialogProps) {
  const [currentPermission, setCurrentPermission] = useState<NotificationPermission>("default");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPermission(getNotificationPermission());
      setSelectedBranch(getUserMonitoredBranch());
      setSoundEnabled(isSoundAlertEnabled());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      // 1. Save branch and sound preferences
      setUserMonitoredBranch(selectedBranch);
      setSoundAlertEnabled(soundEnabled);
      setUserDismissedPermissionPrompt(true);

      // 2. Play audio unlock chime
      if (soundEnabled) {
        playEmergencyAudioChime();
      }

      // 3. Request browser OS notification permission
      const result = await requestDesktopNotificationPermission();
      setCurrentPermission(result);

      if (onPermissionGranted) {
        onPermissionGranted();
      }

      // 4. Trigger test confirmation popup
      triggerDesktopPopup({
        id: "perm-dialog-granted",
        title: "Notifikasi Siaga Aktif",
        body: `Laptop terhubung untuk: ${
          selectedBranch === "all" ? "HO Pusat" : `Cabang ${selectedBranch}`
        }.`,
        disasterType: "earthquake",
        branch: selectedBranch,
        forceBypassBranchFilter: true,
      });

      onClose();
    } catch (err) {
      console.error("Error approving notification permission:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setUserDismissedPermissionPrompt(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-red-500/30 shadow-2xl shadow-red-950/50 overflow-hidden">
        
        {/* Top Glowing Header Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-red-950/90 via-slate-900 to-slate-900 border-b border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
                <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 font-mono">
                  SPARTA Siaga • Early Warning System
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Persetujuan Izin Notifikasi Laptop
                </h3>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Untuk memastikan respon cepat Duty Officer saat terjadi darurat gempa bumi tektonik BMKG atau banjir bandang, sistem memerlukan izin Anda untuk meletuskan pop-up di layar laptop dan membunyikan alarm siaga.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Pop-up Layar Laptop</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Banner Windows Action Center & in-app toast kartu krisis otomatis.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Alarm Audio 2-Tone</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Nada sirine Web Audio (A5→D5) seketika saat gerai toko terancam.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Form: Branch & Audio */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-red-400" />
                  Wilayah Pantauan / Cabang Penugasan:
                </span>
                <span className="text-[10px] text-slate-500">Mencegah polusi alert luar cabang</span>
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="all">🌐 Semua Cabang (HO Pusat / Tim Command Center Nasional)</option>
                {availableBranches
                  .filter((b) => b !== "all")
                  .map((b) => (
                    <option key={b} value={b}>
                      📍 Cabang {b}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="text-xs text-slate-300 font-medium">Bunyi Alarm Suara Siaga</span>
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  soundEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {soundEnabled ? "Aktif (Chime ON)" : "Mute (Hening)"}
              </button>
            </div>
          </div>

          {/* Browser Permission Info Indicator */}
          {currentPermission === "denied" && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 flex items-start gap-2 text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Izin browser sebelumnya ditolak. Anda dapat mengklik icon gembok di sebelah URL browser laptop untuk menyetel notifikasi menjadi <strong>"Allow"</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Nanti Saja
          </button>

          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Setujui & Aktifkan Notifikasi Laptop</span>
          </button>
        </div>

      </div>
    </div>
  );
}
