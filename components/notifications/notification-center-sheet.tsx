"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  Mail,
  Smartphone,
  AlertTriangle,
  CloudRain,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Send,
  Building,
  Flame,
  FileText,
  Monitor,
  Volume2,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationLog } from "@/types/notification";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestDesktopNotificationPermission,
  triggerDesktopPopup,
} from "@/lib/desktop-notification";
import { IncidentDetailModal } from "./incident-detail-modal";

interface NotificationCenterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkerDispatched?: () => void;
  onOpenPermissionDialog?: () => void;
  onMarkAllAsRead?: () => void;
  onFlyToIncident?: (incident: NotificationLog) => void;
  theme?: "dark" | "light";
  activeIncidents?: any[];
}

export function NotificationCenterSheet({
  isOpen,
  onClose,
  onWorkerDispatched,
  onOpenPermissionDialog,
  onMarkAllAsRead,
  onFlyToIncident,
  theme = "dark",
  activeIncidents = [],
}: NotificationCenterSheetProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningWorker, setRunningWorker] = useState(false);
  const [selectedIncidentForDetail, setSelectedIncidentForDetail] = useState<NotificationLog | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "earthquake" | "heavy_rain">("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [lastWorkerMessage, setLastWorkerMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");

  const isDark = theme === "dark";

  const handleMarkAllAsRead = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sparta_last_read_at", new Date().toISOString());
    }
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
    toast.success("Notifikasi telah ditandai telah dibaca");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPermissionState(getNotificationPermission());
    }
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const res = await requestDesktopNotificationPermission();
    setPermissionState(res);
    if (res === "granted") {
      triggerDesktopPopup({
        title: "✅ Notifikasi Pop-up Desktop Berhasil Diaktifkan!",
        body: "Laptop / PC Anda kini akan menerima pop-up darurat otomatis saat terdeteksi gempa bumi BMKG atau potensi banjir.",
        disasterType: "earthquake",
      });
    }
  };

  const handleTestDesktopPopup = () => {
    triggerDesktopPopup({
      title: "🚨 ALERT TEST: Gempa M 5.6 - Cabang SIDOARJO",
      body: "Simulasi pop-up laptop berhasil! 2 gerai toko berada di radius bahaya guncangan. Tiket investigasi #ESC-SID-9912 terbit otomatis.",
      disasterType: "earthquake",
      ticketNumber: "ESC-SID-9912",
      branch: "SIDOARJO",
      onClick: () => {
        // Open center if clicked
      },
    });
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch notification logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      if (typeof window !== "undefined") {
        localStorage.setItem("sparta_last_read_at", new Date().toISOString());
      }
      if (onMarkAllAsRead) {
        onMarkAllAsRead();
      }
    }
  }, [isOpen, onMarkAllAsRead]);

  const handleRefreshData = async () => {
    setRunningWorker(true);
    setLastWorkerMessage(null);
    try {
      await fetchLogs();
      setLastWorkerMessage("Data notifikasi berhasil diperbarui.");
    } catch (err) {
      setLastWorkerMessage("Gagal memperbarui notifikasi.");
    } finally {
      setRunningWorker(false);
    }
  };

  if (!isOpen) return null;

  // Compute unique branches
  const branches = Array.from(new Set(logs.map((l) => l.branch))).sort();

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterType !== "all" && log.disaster_type !== filterType) return false;
    if (selectedBranch !== "all" && log.branch !== selectedBranch) return false;
    return true;
  });

  const getDerivedStatus = (log: NotificationLog) => {
    // P0: Notification = Pure Information.
    // Do NOT mix IncidentRecord.status into notification status.
    const lastRead = typeof window !== "undefined" ? localStorage.getItem("sparta_last_read_at") : null;
    const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
    const sentTime = new Date(log.sent_at).getTime();
    
    return sentTime <= lastReadTime ? "read" : "unread";
  };

  const eqCount = logs.filter((l) => l.disaster_type === "earthquake").length;
  const rainCount = logs.filter((l) => l.disaster_type === "heavy_rain" || l.disaster_type === "flood").length;

  return (
    <div
      className={`fixed z-[700] flex flex-col shadow-2xl transition-all duration-300 ease-in-out animate-in fade-in ${
        isDark
          ? "bg-slate-900 border-slate-800 text-white"
          : "bg-white border-slate-200 text-slate-900 shadow-2xl"
      }
      /* Mobile: bottom sheet style */
      inset-x-0 bottom-0 h-[85vh] rounded-t-2xl border-t sm:border
      /* Desktop: popover style */
      sm:top-20 sm:right-6 sm:bottom-auto sm:left-auto sm:h-auto sm:max-h-[80vh] sm:w-[420px] sm:rounded-2xl sm:slide-in-from-top-4 slide-in-from-bottom-8 sm:slide-in-from-bottom-0`}
    >
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 bg-transparent">
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Header */}
      <div
        className={`p-4 border-b flex items-start justify-between gap-3 ${
          isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Pusat Notifikasi Darurat
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isDark
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-600/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-300"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-Sync (60d)
            </span>
          </div>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Monitoring peringatan darurat BMKG & eskalasi krisis cabang.
          </p>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark
              ? "text-slate-400 hover:text-white hover:bg-slate-800"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
          title="Tutup Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Alert Status Banner */}
      <div
        className={`px-4 py-2 border-b flex items-center justify-between gap-3 text-xs ${
          isDark
            ? "bg-slate-950/90 border-slate-800/80"
            : "bg-slate-50/90 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-1.5 rounded-md shrink-0 ${
              isDark ? "bg-slate-800/80 text-cyan-400" : "bg-cyan-50 text-cyan-700 border border-cyan-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Alarm Layar Desktop:
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                  permissionState === "granted"
                    ? isDark
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-600/30"
                      : "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : isDark
                    ? "bg-amber-950 text-amber-400 border border-amber-600/30"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }`}
              >
                {permissionState === "granted" ? "● Aktif" : "○ Belum Aktif"}
              </span>
            </div>
            <p className={`text-[11px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {permissionState === "granted"
                ? "Banner pop-up & audio siaga aktif saat layar terminimalisir."
                : "Aktifkan izin pop-up agar peringatan krisis langsung tampil di laptop."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {permissionState !== "granted" && (
            <button
              onClick={handleRequestPermission}
              className="px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors shadow-sm"
            >
              Aktifkan
            </button>
          )}

          <button
            onClick={handleTestDesktopPopup}
            className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1 transition-colors border ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
            }`}
            title="Uji coba pop-up darurat dan suara audio chime"
          >
            <Volume2 className="w-3 h-3 text-amber-500" />
            <span>Tes Alarm</span>
          </button>
        </div>
      </div>

      {/* Control Actions Bar */}
      <div
        className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark
            ? "bg-slate-950/40 border-slate-800/80"
            : "bg-slate-50/50 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => handleRefreshData()}
            disabled={runningWorker}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50"
            title="Perbarui data notifikasi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningWorker ? "animate-spin" : ""}`} />
            <span>Muat Ulang Data</span>
          </button>

          <button
            disabled={true}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-50 cursor-not-allowed ${
              isDark
                ? "bg-slate-800 text-slate-500 border-slate-700/80"
                : "bg-slate-100 text-slate-400 border-slate-300"
            }`}
            title="Simulasi hanya dapat dijalankan dari backend/CLI"
          >
            <Send className="w-3 h-3 text-cyan-700" />
            <span>Simulasi Alert</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleMarkAllAsRead}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-colors border shadow-sm ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
            }`}
            title="Tandai semua notifikasi telah dibaca"
          >
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden xs:inline">Tandai Semua Dibaca</span>
            <span className="xs:hidden">Tandai Dibaca</span>
          </button>
        </div>
      </div>

      {/* Last Worker Status Feedback */}
      {lastWorkerMessage && (
        <div
          className={`px-4 py-2 border-b text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            isDark
              ? "bg-slate-800/90 border-slate-700 text-slate-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">{lastWorkerMessage}</span>
        </div>
      )}

      {/* Filters (Channel tabs & Branch dropdown) */}
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 flex-wrap text-xs ${
          isDark
            ? "bg-slate-900/60 border-slate-800"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div
          className={`flex items-center gap-1 p-1 rounded-lg border ${
            isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
          }`}
        >
          <button
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterType === "all"
                ? isDark
                  ? "bg-slate-800 text-white font-semibold"
                  : "bg-white text-slate-900 font-semibold shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua ({logs.length})
          </button>
          <button
            onClick={() => setFilterType("earthquake")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              filterType === "earthquake"
                ? "bg-red-600 text-white font-semibold shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Flame className="w-3 h-3 text-red-500" />
            <span>Gempa ({eqCount})</span>
          </button>
          <button
            onClick={() => setFilterType("heavy_rain")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              filterType === "heavy_rain"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CloudRain className="w-3 h-3 text-cyan-500" />
            <span>Hujan & Banjir ({rainCount})</span>
          </button>
        </div>

        {branches.length > 0 && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className={`px-2.5 py-1 rounded-lg border text-xs focus:outline-none focus:border-red-500 ${
              isDark
                ? "bg-slate-950 border-slate-800 text-slate-300"
                : "bg-white border-slate-300 text-slate-800 shadow-sm"
            }`}
          >
            <option value="all">Semua Cabang DC</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                Cabang {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
            <p className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Tidak ada log notifikasi
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Semua cabang dalam status normal, atau filter tidak menghasilkan kecocokan.
            </p>
            <button
              onClick={() => handleRefreshData()}
              className={`mt-4 px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 border ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm"
              }`}
            >
              <RefreshCw className="w-3 h-3 text-cyan-500" />
              <span>Muat Ulang Data</span>
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isEarthquake = log.disaster_type === "earthquake";
            const dateStr = new Date(log.sent_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "Asia/Jakarta",
            });
            const derivedStatus = getDerivedStatus(log);

            return (
              <div
                key={log.id}
                className={`border rounded-xl p-3.5 transition-all shadow-md group ${
                  isDark
                    ? "bg-slate-950/80 border-slate-800/90 hover:border-slate-700 text-white"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-sm"
                }`}
              >
                {/* Top line: Badges and time */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Disaster Type Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isEarthquake
                          ? isDark
                            ? "bg-red-600/20 text-red-400 border border-red-500/30"
                            : "bg-red-50 text-red-700 border border-red-200"
                          : isDark
                          ? "bg-blue-600/20 text-cyan-400 border border-blue-500/30"
                          : "bg-blue-50 text-cyan-700 border border-blue-200"
                      }`}
                    >
                      {isEarthquake ? <Flame className="w-3 h-3 text-red-500" /> : <CloudRain className="w-3 h-3 text-cyan-500" />}
                      {isEarthquake ? "Gempa Bumi" : "Hujan & Banjir"}
                    </span>

                    {/* Ticket Number */}
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        isDark
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {log.ticket_number}
                    </span>

                    {/* Status Badge */}
                    {derivedStatus === "read" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>DIBACA</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-600/40 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>BELUM DIBACA</span>
                      </span>
                    )}
                  </div>

                  <span className={`text-[11px] flex items-center gap-1 font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <Clock className="w-3 h-3" />
                    {dateStr} WIB
                  </span>
                </div>

                {/* Title */}
                <h3 className={`text-xs font-bold mb-1 transition-colors ${
                  isDark ? "text-white group-hover:text-red-300" : "text-slate-900 group-hover:text-red-600"
                }`}>
                  {log.title}
                </h3>

                {/* Subtitle impact summary */}
                <p className={`text-[11px] mb-2.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  ⚠️ Terdeteksi <strong className={isDark ? "text-white" : "text-slate-900"}>{log.affected_stores_count} Gerai Toko</strong> Cabang {log.branch} di zona pantauan bahaya & waspada.
                </p>

                {/* Footer Bar with Status and Detail Action */}
                <div
                  className={`flex items-center justify-between gap-2 pt-2 border-t ${
                    isDark ? "border-slate-800/80" : "border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    {derivedStatus === "read" ? (
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Dibaca</span>
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Belum Dibaca</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedIncidentForDetail(log)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border ${
                      isDark
                        ? "bg-slate-800 hover:bg-slate-700 text-white hover:text-cyan-300 border-slate-700"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-cyan-600 border-slate-200"
                    }`}
                  >
                    <span>Lihat Detail Notifikasi</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Incident Detail & Store Verification SOP Modal */}
      <IncidentDetailModal
        isOpen={!!selectedIncidentForDetail}
        incident={selectedIncidentForDetail}
        onClose={() => setSelectedIncidentForDetail(null)}
        onFlyToIncident={(incident) => {
          setSelectedIncidentForDetail(null);
          onClose();
          if (onFlyToIncident) {
            onFlyToIncident(incident);
          }
        }}
        theme={theme}
      />
    </div>
  );
}
