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
  selectedNotificationId?: string | null;
  onClearSelectedNotification?: () => void;
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
  selectedNotificationId,
  onClearSelectedNotification,
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
    toast.custom((t) => (
      <div className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-full shadow-md text-[11px] font-medium pointer-events-auto">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        Notifikasi ditandai dibaca
      </div>
    ), { duration: 2500, position: "top-center" });
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
        id: "perm-granted",
        title: "Pop-up Desktop Aktif",
        body: "Sistem akan mengirim peringatan darurat ke laptop ini.",
        disasterType: "earthquake",
      });
    }
  };

  const handleTestDesktopPopup = () => {
    triggerDesktopPopup({
      id: "test-popup",
      title: "Gempa M5.6 — Cabang SIDOARJO",
      body: "2 gerai toko berada di radius bahaya guncangan. Harap bersiap.",
      disasterType: "earthquake",
      ticketNumber: "ESC-SID-9912",
      branch: "SIDOARJO",
      isSimulation: true,
      onClickDetail: () => {
        // Just a test
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
  }, [isOpen, onMarkAllAsRead]); // Keep stable deps

  useEffect(() => {
    if (isOpen && selectedNotificationId && logs.length > 0) {
      const targetLog = logs.find(l => l.id === selectedNotificationId);
      if (targetLog) {
        setSelectedIncidentForDetail(targetLog);
      }
      if (onClearSelectedNotification) {
        onClearSelectedNotification();
      }
    }
  }, [isOpen, selectedNotificationId, logs, onClearSelectedNotification]);

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
          ? "bg-slate-900 border-slate-800 text-slate-100"
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
        className={`p-5 pb-4 flex items-start justify-between gap-3 ${
          isDark ? "bg-slate-900" : "bg-white"
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Bell className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
            <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Pusat Notifikasi
            </h2>
            <span className={`text-[11px] font-medium ml-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Auto Sync · 60 detik
            </span>
          </div>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Informasi kejadian & peringatan darurat
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

      {/* Control Area */}
      <div
        className={`px-5 py-3 flex items-center justify-between gap-3 ${
          isDark ? "bg-slate-900" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRefreshData()}
            disabled={runningWorker}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            } disabled:opacity-50`}
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningWorker ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </button>
          <button
            onClick={handleTestDesktopPopup}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Tes Alarm Peringatan"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Tes Alarm</span>
          </button>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className={`text-xs font-medium transition-colors ${
            isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Tandai Semua Dibaca
        </button>
      </div>

      {/* Desktop Alert Request Banner (If needed) */}
      {permissionState !== "granted" && (
        <div className={`px-5 py-3 border-y flex items-center justify-between gap-3 text-xs ${
          isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <span className={isDark ? "text-slate-400" : "text-slate-600"}>
            Aktifkan pop-up peringatan desktop
          </span>
          <button
            onClick={handleRequestPermission}
            className="text-blue-500 font-semibold hover:underline"
          >
            Aktifkan
          </button>
        </div>
      )}

      {/* Filter Area */}
      <div
        className={`px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap text-xs ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        }`}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === "all"
                ? isDark
                  ? "bg-slate-800 text-white font-semibold"
                  : "bg-slate-200 text-slate-900 font-semibold"
                : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType("earthquake")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === "earthquake"
                ? isDark
                  ? "bg-slate-800 text-white font-semibold"
                  : "bg-slate-200 text-slate-900 font-semibold"
                : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            Gempa
          </button>
          <button
            onClick={() => setFilterType("heavy_rain")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === "heavy_rain"
                ? isDark
                  ? "bg-slate-800 text-white font-semibold"
                  : "bg-slate-200 text-slate-900 font-semibold"
                : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            Hujan & Banjir
          </button>
        </div>

        {branches.length > 0 && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className={`px-2 py-1.5 rounded border text-xs focus:outline-none focus:border-blue-500 bg-transparent ${
              isDark
                ? "border-slate-800 text-slate-300"
                : "border-slate-200 text-slate-700"
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Tidak ada notifikasi
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Saat ini tidak ada peringatan darurat yang sesuai filter.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isEarthquake = log.disaster_type === "earthquake";
            const dateStr = new Date(log.sent_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            });
            const derivedStatus = getDerivedStatus(log);
            const isRead = derivedStatus === "read";
            
            // Deduce source from disaster_id
            let sourceStr = "Sistem Peringatan Dini";
            if (isEarthquake) {
              if (log.disaster_id.toLowerCase().startsWith("usgs")) sourceStr = "USGS";
              else if (log.disaster_id.toLowerCase().startsWith("bmkg")) sourceStr = "BMKG";
              else sourceStr = "BMKG / USGS";
            } else if (log.disaster_type === "heavy_rain" || log.disaster_type === "flood") {
              if (log.disaster_id.startsWith("flood_")) sourceStr = "Open-Meteo";
              else sourceStr = "Petabencana / BMKG";
            }

            return (
              <div
                key={log.id}
                className={`group rounded-xl p-4 transition-colors ${
                  isDark 
                    ? isRead ? "bg-slate-900/50 border border-slate-800" : "bg-slate-800 border border-slate-700" 
                    : isRead ? "bg-slate-50 border border-slate-100" : "bg-white border border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isEarthquake 
                        ? (isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")
                        : (isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")
                    }`}>
                      {isEarthquake ? "Gempa Bumi" : "Hujan & Banjir"}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                    }`}>
                      {sourceStr}
                    </span>
                    {!isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {dateStr}
                  </span>
                </div>
                
                <h3 className={`text-sm leading-snug mb-1.5 ${
                  !isRead ? "font-bold" : "font-medium"
                } ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}>
                  {log.title}
                </h3>
                
                <p className={`text-xs mb-3 line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {log.message}
                </p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIncidentForDetail(log)}
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                      isDark 
                        ? "border-slate-700 text-slate-300 hover:bg-slate-700" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Lihat Detail
                  </button>
                  <button
                    onClick={() => {
                      if (onFlyToIncident) {
                        onFlyToIncident(log);
                      }
                      onClose();
                    }}
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      isDark 
                        ? "bg-slate-800 text-white hover:bg-slate-700" 
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Lihat di Peta
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Incident Detail Modal */}
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
