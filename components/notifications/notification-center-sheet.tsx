"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Bell,
  Clock,
  RefreshCw,
  Volume2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  FileText,
  MapPin,
  Building,
  Flame,
  CloudRain,
  History,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationLog } from "@/types/notification";
import { RoleType } from "@/types/incident";
import {
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
  onNotificationRead?: (id: string) => void;
  onFlyToIncident?: (incident: NotificationLog) => void;
  onOpenReport?: (report: any) => void;
  selectedNotificationId?: string | null;
  onClearSelectedNotification?: () => void;
  theme?: "dark" | "light";
  activeIncidents?: any[];
  userRole?: RoleType;
  userBranch?: string;
  onUnreadCountChange?: (count: number) => void;
}

const ACTIVE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 Hours max active awareness window

export function NotificationCenterSheet({
  isOpen,
  onClose,
  onOpenPermissionDialog,
  onMarkAllAsRead,
  onNotificationRead,
  onFlyToIncident,
  onOpenReport,
  selectedNotificationId,
  onClearSelectedNotification,
  theme = "dark",
  activeIncidents = [],
  userRole = "ho_admin",
  userBranch = "all",
  onUnreadCountChange,
}: NotificationCenterSheetProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningWorker, setRunningWorker] = useState(false);
  const [selectedIncidentForDetail, setSelectedIncidentForDetail] = useState<NotificationLog | null>(null);
  const [activeTab, setActiveTab] = useState<"recent" | "history">("recent");
  const [filterType, setFilterType] = useState<"all" | "earthquake" | "heavy_rain" | "flood">("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");

  // Read state stored locally (Personal UI state - Requirement 5 & 6)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(0);

  // Group expansion state for HO canonical events
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const isDark = theme === "dark";
  const isHoUser = userBranch === "all" || !userRole || userRole.startsWith("ho_");

  // Load read state from localStorage
  const refreshReadState = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const rawIds = localStorage.getItem("sparta_read_notif_ids");
        if (rawIds) {
          setReadIds(new Set(JSON.parse(rawIds)));
        }
        const lastRead = localStorage.getItem("sparta_last_read_at");
        if (lastRead) {
          setLastReadTimestamp(new Date(lastRead).getTime());
        }
      } catch (e) {
        console.warn("[Notification Center] Error reading local state:", e);
      }
    }
  }, []);

  const markItemAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sparta_read_notif_ids", JSON.stringify(Array.from(next)));
        } catch (e) {}
      }
      return next;
    });
    if (onNotificationRead) {
      onNotificationRead(id);
    }
  }, [onNotificationRead]);

  const handleMarkAllAsRead = () => {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    if (typeof window !== "undefined") {
      localStorage.setItem("sparta_last_read_at", nowIso);
      // Mark all existing loaded log ids as read
      const allIds = logs.map((l) => l.id);
      localStorage.setItem("sparta_read_notif_ids", JSON.stringify(allIds));
    }
    setLastReadTimestamp(nowMs);
    setReadIds(new Set(logs.map((l) => l.id)));

    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
    toast.custom(() => (
      <div className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-full shadow-md text-[11px] font-medium pointer-events-auto">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        Semua notifikasi ditandai dibaca
      </div>
    ), { duration: 2500, position: "top-center" });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPermissionState(getNotificationPermission());
    }
    refreshReadState();
  }, [isOpen, refreshReadState]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/logs?limit=100");
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

  // Fetch logs on mount and when sheet opens
  useEffect(() => {
    fetchLogs();
  }, []);

  // Note: Requirement 6 - Do NOT automatically mark all as read upon opening the sheet!
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      refreshReadState();
    }
  }, [isOpen, refreshReadState]);

  useEffect(() => {
    if (isOpen && selectedNotificationId && logs.length > 0) {
      const targetLog = logs.find((l) => l.id === selectedNotificationId);
      if (targetLog) {
        setSelectedIncidentForDetail(targetLog);
        markItemAsRead(targetLog.id);
      }
      if (onClearSelectedNotification) {
        onClearSelectedNotification();
      }
    }
  }, [isOpen, selectedNotificationId, logs, onClearSelectedNotification, markItemAsRead]);

  const handleRefreshData = async () => {
    setRunningWorker(true);
    try {
      await fetchLogs();
      refreshReadState();
      toast.success("Data notifikasi berhasil dimutakhirkan.");
    } catch (err) {
      toast.error("Gagal memperbarui notifikasi.");
    } finally {
      setRunningWorker(false);
    }
  };

  const handleRequestPermission = async () => {
    const res = await requestDesktopNotificationPermission();
    setPermissionState(res);
    if (res === "granted") {
      triggerDesktopPopup({
        id: "perm-granted",
        title: "Pop-up Desktop Aktif",
        body: "Sistem akan mengirim peringatan darurat ke perangkat ini.",
        disasterType: "earthquake",
      });
    }
  };

  const handleTestDesktopPopup = () => {
    triggerDesktopPopup({
      id: "test-popup",
      title: "Gempa M5.6 — Cabang SIDOARJO",
      body: "2 gerai toko berada di Zona Prioritas Pantau SPARTA. Harap bersiap.",
      disasterType: "earthquake",
      ticketNumber: "ESC-SID-9912",
      branch: "SIDOARJO",
      isSimulation: true,
      onClickDetail: () => {},
    });
  };

  const toggleGroupExpand = (canonicalId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(canonicalId)) {
        next.delete(canonicalId);
      } else {
        next.add(canonicalId);
      }
      return next;
    });
  };

  // Helper to determine unread status per personal UI state
  const isItemUnread = useCallback(
    (log: NotificationLog) => {
      if (readIds.has(log.id)) return false;
      const sentTime = new Date(log.sent_at).getTime();
      return sentTime > lastReadTimestamp;
    },
    [readIds, lastReadTimestamp]
  );

  // Partition logs into TERBARU (<=72h) and RIWAYAT (>72h)
  const now = Date.now();
  const { recentLogs, historyLogs } = useMemo(() => {
    const recent: NotificationLog[] = [];
    const history: NotificationLog[] = [];

    logs.forEach((log) => {
      const sentTime = new Date(log.sent_at).getTime();
      const ageMs = now - sentTime;

      // Disaster notifications are global informational alerts available to all authenticated users
      if (ageMs <= ACTIVE_WINDOW_MS) {
        recent.push(log);
      } else {
        history.push(log);
      }
    });

    return { recentLogs: recent, historyLogs: history };
  }, [logs, now]);

  // Unique branches for history filtering
  const branches = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.branch) set.add(l.branch);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filter logs for the active tab
  const displayedLogs = useMemo(() => {
    const baseList = activeTab === "recent" ? recentLogs : historyLogs;

    return baseList.filter((log) => {
      if (filterType !== "all") {
        if (filterType === "earthquake" && log.disaster_type !== "earthquake") return false;
        if (filterType === "heavy_rain" && log.disaster_type !== "heavy_rain" && log.disaster_type !== "flood") return false;
        if (filterType === "flood" && log.disaster_type !== "flood") return false;
      }
      if (selectedBranch !== "all" && log.branch !== selectedBranch) return false;
      return true;
    });
  }, [activeTab, recentLogs, historyLogs, filterType, selectedBranch]);

  // Requirement 11: HO Canonical Event Grouping in TERBARU tab
  const hoGroupedRecentEvents = useMemo(() => {
    if (!isHoUser || activeTab !== "recent") return null;

    const earthquakeGroups = new Map<string, NotificationLog[]>();
    const nonEarthquakes: NotificationLog[] = [];

    displayedLogs.forEach((log) => {
      if (log.disaster_type === "earthquake") {
        const canonicalKey = log.disaster_id || log.title;
        if (!earthquakeGroups.has(canonicalKey)) {
          earthquakeGroups.set(canonicalKey, []);
        }
        earthquakeGroups.get(canonicalKey)!.push(log);
      } else {
        nonEarthquakes.push(log);
      }
    });

    return { earthquakeGroups, nonEarthquakes };
  }, [isHoUser, activeTab, displayedLogs]);

  // Find related report for a notification
  const findRelatedReport = useCallback(
    (log: NotificationLog) => {
      return activeIncidents.find((inc: any) => {
        const branchMatch = inc.branch?.toLowerCase() === log.branch?.toLowerCase();
        if (!branchMatch) return false;
        if (log.disaster_type === "earthquake") {
          return (
            inc.disasterType === "earthquake" &&
            (inc.earthquakeEventId === log.disaster_id ||
              (inc.earthquakeEventId && log.disaster_id.includes(inc.earthquakeEventId)) ||
              (inc.earthquakeEventId && inc.earthquakeEventId.includes(log.disaster_id)))
          );
        }
        return false;
      });
    },
    [activeIncidents]
  );

  // Active unread count badge (only <= 72h recent logs)
  const activeUnreadCount = useMemo(() => {
    return recentLogs.filter((l) => isItemUnread(l)).length;
  }, [recentLogs, isItemUnread]);

  useEffect(() => {
    onUnreadCountChange?.(activeUnreadCount);
  }, [activeUnreadCount, onUnreadCountChange]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-[700] flex flex-col shadow-2xl transition-all duration-300 ease-in-out animate-in fade-in ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900 shadow-2xl"
      }
      /* Mobile: bottom sheet */
      inset-x-0 bottom-0 h-[88vh] rounded-t-2xl border-t sm:border
      /* Desktop: popover style */
      sm:top-16 sm:right-6 sm:bottom-auto sm:left-auto sm:h-auto sm:max-h-[85vh] sm:w-[440px] sm:rounded-2xl sm:slide-in-from-top-4`}
    >
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 bg-transparent">
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Header Bar */}
      <div className={`p-4 pb-3 flex items-start justify-between gap-3 border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Bell className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
            <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Pusat Notifikasi
            </h2>
            {activeUnreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white">
                {activeUnreadCount} baru
              </span>
            )}
          </div>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Awareness kejadian & peringatan dini bencana
          </p>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
          title="Tutup Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs: [ TERBARU ] [ RIWAYAT ] (Requirements 2, 7, 8) */}
      <div className={`px-4 pt-2.5 pb-2 border-b flex items-center justify-between gap-2 ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
        <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-300/40 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "recent"
                ? isDark
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-900 shadow-xs"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>TERBARU</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-300 dark:bg-slate-700">
              {recentLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? isDark
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-900 shadow-xs"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>RIWAYAT</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-300 dark:bg-slate-700">
              {historyLogs.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllAsRead}
            className={`text-[11px] font-semibold transition-colors ${
              isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"
            }`}
          >
            Tandai Semua Dibaca
          </button>
        </div>
      </div>

      {/* Sub-bar Action & Refresh */}
      <div className={`px-4 py-2 border-b flex items-center justify-between gap-2 text-xs ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshData}
            disabled={runningWorker}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            } disabled:opacity-50`}
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3 h-3 ${runningWorker ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={handleTestDesktopPopup}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Tes Alarm"
          >
            <Volume2 className="w-3 h-3" />
            <span>Tes Alarm</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className={`px-2 py-1 rounded border text-[11px] font-medium bg-transparent focus:outline-none ${
              isDark ? "border-slate-800 text-slate-300 bg-slate-900" : "border-slate-200 text-slate-700 bg-white"
            }`}
          >
            <option value="all">Semua Jenis</option>
            <option value="earthquake">Gempa</option>
            <option value="heavy_rain">Cuaca Ekstrem</option>
            <option value="flood">Banjir</option>
          </select>

          {activeTab === "history" && branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={`px-2 py-1 rounded border text-[11px] font-medium bg-transparent focus:outline-none ${
                isDark ? "border-slate-800 text-slate-300 bg-slate-900" : "border-slate-200 text-slate-700 bg-white"
              }`}
            >
              <option value="all">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  Cabang {b}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayedLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {activeTab === "recent" ? "Tidak ada notifikasi aktif" : "Tidak ada riwayat notifikasi"}
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              {activeTab === "recent"
                ? "Kejadian dalam 72 jam terakhir akan tampil di sini."
                : "Notifikasi lama (>72 jam) yang tersimpan akan tampil di sini."}
            </p>
          </div>
        ) : (
          <>
            {/* HO Canonical Grouping in TERBARU (Requirement 11) */}
            {isHoUser && activeTab === "recent" && hoGroupedRecentEvents ? (
              <>
                {/* Render Grouped Earthquakes */}
                {Array.from(hoGroupedRecentEvents.earthquakeGroups.entries()).map(([canonicalKey, groupLogs]) => {
                  const firstLog = groupLogs[0];
                  const isExpanded = expandedGroups.has(canonicalKey);
                  const totalBranches = groupLogs.length;

                  // Aggregate store numbers across branches
                  let totalStores = 0;
                  let priorityStores = 0;
                  groupLogs.forEach((l) => {
                    totalStores += l.affected_stores_count || 0;
                    const samples = l.affected_stores_sample || [];
                    priorityStores += samples.filter((s) => s.status === "PRIORITY_MONITOR").length;
                  });

                  // Check if any report exists
                  const hasAnyReport = groupLogs.some((l) => !!findRelatedReport(l));
                  const isAnyUnread = groupLogs.some((l) => isItemUnread(l));

                  const dateStr = new Date(firstLog.sent_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }) + " • " + new Date(firstLog.sent_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

                  return (
                    <div
                      key={canonicalKey}
                      className={`rounded-xl p-3.5 border transition-all ${
                        isDark
                          ? isAnyUnread
                            ? "bg-slate-800/90 border-slate-700 shadow-md"
                            : "bg-slate-900/60 border-slate-800"
                          : isAnyUnread
                          ? "bg-white border-slate-300 shadow-md ring-1 ring-blue-500/10"
                          : "bg-slate-50/80 border-slate-200"
                      }`}
                    >
                      {/* Group Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white">
                            Gempa Bumi • BMKG/USGS
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isDark ? "bg-slate-800 text-cyan-400" : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                          }`}>
                            {totalBranches} Cabang Terimbas
                          </span>
                          {isAnyUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          )}
                        </div>
                        <span className={`text-[10px] font-medium whitespace-nowrap ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {dateStr}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h3 className={`text-sm leading-snug mb-2 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {firstLog.title}
                      </h3>

                      {/* Aggregated Monitoring Zone Summary */}
                      <div className={`p-2 rounded-lg border text-[11px] mb-3 space-y-1 ${
                        isDark ? "bg-slate-950/70 border-slate-800" : "bg-white border-slate-200"
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={isDark ? "text-slate-400" : "text-slate-600"}>Total Gerai Zona Pantau:</span>
                          <strong className={isDark ? "text-white" : "text-slate-900"}>{totalStores} Toko</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-500 font-semibold">Prioritas Pantau:</span>
                          <strong className="text-red-500 font-bold">{priorityStores} Toko</strong>
                        </div>
                        {hasAnyReport && (
                          <div className="text-[10px] text-blue-500 font-medium pt-1 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Laporan operasional terkait tersedia</span>
                          </div>
                        )}
                      </div>

                      {/* Primary Awareness Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            groupLogs.forEach((l) => markItemAsRead(l.id));
                            if (onFlyToIncident) onFlyToIncident(firstLog);
                            onClose();
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Lihat di Peta</span>
                        </button>

                        <button
                          onClick={() => toggleGroupExpand(canonicalKey)}
                          className={`py-1.5 px-3 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition-colors ${
                            isDark
                              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span>{isExpanded ? "Tutup Rincian" : "Rincian Cabang"}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expandable Accordion: Branch Breakdown (Requirement 11) */}
                      {isExpanded && (
                        <div className={`mt-3 pt-3 border-t space-y-2 animate-in fade-in duration-200 ${
                          isDark ? "border-slate-800" : "border-slate-200"
                        }`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Rincian per Cabang DC
                          </div>
                          {groupLogs.map((bLog) => {
                            const bReport = findRelatedReport(bLog);
                            const bSamples = bLog.affected_stores_sample || [];
                            const bPriority = bSamples.filter((s) => s.status === "PRIORITY_MONITOR").length;

                            return (
                              <div
                                key={bLog.id}
                                className={`p-2 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100/70 border-slate-200"
                                }`}
                              >
                                <div>
                                  <div className="font-bold flex items-center gap-1">
                                    <Building className="w-3 h-3 text-slate-400" />
                                    <span>Cabang {bLog.branch}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {bLog.affected_stores_count} toko ({bPriority} prioritas)
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      markItemAsRead(bLog.id);
                                      setSelectedIncidentForDetail(bLog);
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                                      isDark
                                        ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                                        : "border-slate-300 text-slate-700 hover:bg-white"
                                    }`}
                                  >
                                    Detail
                                  </button>

                                  {bReport && onOpenReport && (
                                    <button
                                      onClick={() => {
                                        markItemAsRead(bLog.id);
                                        onClose();
                                        onOpenReport(bReport);
                                      }}
                                      className="px-2 py-1 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>Laporan</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Non-earthquakes (Weather / Flood) */}
                {hoGroupedRecentEvents.nonEarthquakes.map((log) => renderIndividualCard(log))}
              </>
            ) : (
              /* Branch user view or History view: Individual Cards */
              displayedLogs.map((log) => renderIndividualCard(log))
            )}
          </>
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
        onOpenReport={onOpenReport}
        relatedReport={
          selectedIncidentForDetail ? findRelatedReport(selectedIncidentForDetail) : null
        }
        theme={theme}
      />
    </div>
  );

  // Render individual notification card
  function renderIndividualCard(log: NotificationLog) {
    const isEarthquake = log.disaster_type === "earthquake";
    const dateStr = new Date(log.sent_at).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " • " + new Date(log.sent_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    const isUnread = isItemUnread(log);
    const relatedReport = findRelatedReport(log);

    // Delivery Status Honesty (Requirement 15)
    const deliveryStatus = log.delivery_status || "not_configured";
    const deliveryBadge = (() => {
      switch (deliveryStatus) {
        case "sent":
        case "delivered":
          return { text: "Terkirim", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
        case "pending":
        case "queued":
          return { text: "Menunggu Pengiriman", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
        case "failed":
          return { text: "Gagal Dikirim", class: "bg-red-500/10 text-red-400 border-red-500/20" };
        case "not_configured":
        default:
          return { text: "Provider Belum Terhubung", class: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
      }
    })();

    return (
      <div
        key={log.id}
        className={`rounded-xl p-3.5 border transition-all ${
          isDark
            ? isUnread
              ? "bg-slate-800/90 border-slate-700 shadow-md"
              : "bg-slate-900/60 border-slate-800"
            : isUnread
            ? "bg-white border-slate-300 shadow-md ring-1 ring-blue-500/10"
            : "bg-slate-50/80 border-slate-200"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isEarthquake
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {isEarthquake ? "Gempa Bumi" : "Cuaca & Banjir"}
            </span>

            {activeTab === "history" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Riwayat (&gt;72 Jam)
              </span>
            )}

            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${deliveryBadge.class}`}>
              {deliveryBadge.text}
            </span>

            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </div>

          <span className={`text-[10px] font-medium whitespace-nowrap ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {dateStr}
          </span>
        </div>

        <h3 className={`text-sm leading-snug mb-1.5 ${isUnread ? "font-bold" : "font-semibold"} ${
          isDark ? "text-white" : "text-slate-900"
        }`}>
          {log.title}
        </h3>

        <p className={`text-xs mb-2.5 line-clamp-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {log.message}
        </p>

        {/* Store Zone Summary */}
        <div className={`p-2 rounded-lg border text-[11px] mb-3 space-y-0.5 ${
          isDark ? "bg-slate-950/70 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="flex justify-between items-center">
            <span className={isDark ? "text-slate-400" : "text-slate-600"}>Wilayah:</span>
            <strong className={isDark ? "text-white" : "text-slate-900"}>DC Cabang {log.branch}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className={isDark ? "text-slate-400" : "text-slate-600"}>Toko di Zona Pantau:</span>
            <strong className={isDark ? "text-white" : "text-slate-900"}>{log.affected_stores_count} Gerai</strong>
          </div>
          {relatedReport && (
            <div className="text-[10px] text-blue-500 font-medium pt-1 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Laporan operasional terkait tersedia</span>
            </div>
          )}
        </div>

        {/* Awareness Action Buttons (Requirements 7, 8, 13, 14, 16) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              markItemAsRead(log.id);
              setSelectedIncidentForDetail(log);
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 ${
              isDark
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Lihat Detail
          </button>

          <button
            onClick={() => {
              markItemAsRead(log.id);
              if (onFlyToIncident) onFlyToIncident(log);
              onClose();
            }}
            className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1 transition-colors shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Lihat di Peta</span>
          </button>
        </div>

        {/* Requirement 14: Only show Lihat Laporan Terkait if report actually exists */}
        {relatedReport && onOpenReport && (
          <button
            onClick={() => {
              markItemAsRead(log.id);
              onClose();
              onOpenReport(relatedReport);
            }}
            className="w-full mt-2 py-1.5 px-3 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lihat Laporan Terkait</span>
          </button>
        )}
      </div>
    );
  }
}
