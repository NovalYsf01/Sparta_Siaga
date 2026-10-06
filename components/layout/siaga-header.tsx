"use client";

import React from "react";
import {
  Shield,
  Search,
  Eye,
  EyeOff,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  Building2,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Settings,
} from "lucide-react";
import { StoreStatus } from "@/types/store";

interface SiagaHeaderProps {
  dangerCount: number;
  warningCount: number;
  safeCount: number;
  incidentOnly: boolean;
  onToggleIncidentOnly: () => void;
  statusFilter: "all" | StoreStatus;
  onSelectStatusFilter: (status: "all" | StoreStatus) => void;
  onOpenSearch: () => void;
  onOpenNotificationCenter?: () => void;
  onOpenPermissionDialog?: () => void;
  onOpenSettings?: () => void;
  permissionState?: NotificationPermission;
  monitoredBranch?: string;
  notificationCount?: number;
  onRefreshData: () => void;
  isRefreshing: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

export function SiagaHeader({
  dangerCount,
  warningCount,
  safeCount,
  incidentOnly,
  onToggleIncidentOnly,
  statusFilter,
  onSelectStatusFilter,
  onOpenSearch,
  onOpenNotificationCenter,
  onOpenPermissionDialog,
  onOpenSettings,
  permissionState = "default",
  monitoredBranch = "all",
  notificationCount = 0,
  onRefreshData,
  isRefreshing,
  theme,
  onToggleTheme,
  userEmail = "operator.sparta@sat.co.id",
  onLogout,
}: SiagaHeaderProps) {
  const isDark = theme === "dark";

  return (
    <header
      className={`h-14 sm:h-16 px-2.5 sm:px-4 border-b flex items-center justify-between gap-2 sm:gap-4 z-40 backdrop-blur-md select-none transition-colors duration-200 ${
        isDark
          ? "bg-slate-950/95 border-slate-800/80 text-white"
          : "bg-white/95 border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Brand & Title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 text-white shadow-lg shadow-red-500/20 shrink-0">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
        </div>

        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-1">
              <span className={isDark ? "text-white" : "text-slate-900"}>SPARTA</span>
              <span className="text-red-600">SIAGA</span>
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">
              Disaster & Branch Maps
            </span>
          </div>
          <p className={`hidden sm:block text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Sistem Pemantauan Spasial Jaringan Toko & Peringatan Dini
          </p>
        </div>
      </div>

      {/* Center: Status Pills & Incident Focus Toggle */}
      <div
        className={`hidden lg:flex items-center gap-2 p-1 rounded-xl border transition-colors ${
          isDark ? "bg-slate-900/80 border-slate-800" : "bg-slate-100 border-slate-200"
        }`}
      >
        <button
          onClick={() => onSelectStatusFilter("all")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            statusFilter === "all"
              ? isDark
                ? "bg-slate-800 text-white shadow-sm font-semibold"
                : "bg-white text-slate-900 shadow-sm font-semibold"
              : isDark
              ? "text-slate-400 hover:text-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Semua ({dangerCount + warningCount + safeCount})</span>
        </button>

        <button
          onClick={() => onSelectStatusFilter("PRIORITY_MONITOR")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            statusFilter === "PRIORITY_MONITOR"
              ? "bg-red-600 text-white shadow-sm"
              : "text-red-500 hover:bg-red-500/10"
          } ${dangerCount > 0 ? "animate-pulse" : ""}`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Prioritas ({dangerCount})</span>
        </button>

        <button
          onClick={() => onSelectStatusFilter("MONITOR")}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            statusFilter === "MONITOR"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-amber-500 hover:bg-amber-500/10"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Pantau ({warningCount})</span>
        </button>

        <button
          onClick={() => onSelectStatusFilter("SAFE")}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            statusFilter === "SAFE"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-500 hover:bg-emerald-500/10"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Aman ({safeCount})</span>
        </button>
      </div>

      {/* Right Controls: Search, Incident Toggle, Refresh, Theme, Settings, User */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Incident Focus Toggle Button */}
        <button
          onClick={onToggleIncidentOnly}
          title={
            incidentOnly
              ? "Tampilkan kembali semua toko"
              : "Fokus hanya pada toko di Zona Prioritas & Pantau SPARTA"
          }
          className={`flex items-center gap-1 sm:gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            incidentOnly
              ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30"
              : isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
          }`}
        >
          {incidentOnly ? (
            <>
              <Eye className="w-3.5 h-3.5 text-white" />
              <span className="hidden md:inline">Fokus Krisis (Aktif)</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Fokus Krisis</span>
            </>
          )}
        </button>

        {/* Search Command Palette Trigger (Ctrl + K) */}
        <button
          onClick={onOpenSearch}
          className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg border text-xs transition-colors ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
          }`}
          title="Cari Toko / Cabang (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-red-500 sm:text-slate-400" />
          <span className="hidden lg:inline">Cari Toko / Cabang...</span>
          <kbd
            className={`hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-400"
                : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            Ctrl+K
          </kbd>
        </button>

        {/* Emergency Notification & Worker Center */}
        <button
          onClick={onOpenNotificationCenter}
          title="Pusat Notifikasi Darurat"
          className={`relative p-2 rounded-lg border transition-colors ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold bg-red-600 text-white rounded-full flex items-center justify-center border-2 border-slate-950 animate-pulse">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          title="Segarkan Data Bencana & Toko"
          className={`hidden xs:flex p-2 rounded-lg border transition-colors disabled:opacity-50 ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
          }`}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-red-500" : ""}`}
          />
        </button>

        {/* Quick Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
          className={`p-2 rounded-lg border transition-colors ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-400"
              : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-blue-600"
          }`}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Unified Settings Modal Trigger Button */}
        <button
          onClick={onOpenSettings || onOpenPermissionDialog}
          title="Pengaturan Sistem & Preferensi Command Center"
          className={`p-2 rounded-lg border transition-colors ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* User SSO pill & Logout */}
        <div
          className={`flex items-center gap-2 pl-2 border-l ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <div className="hidden xl:block text-right">
            <p
              className={`text-xs font-semibold leading-none ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {userEmail.split("@")[0]}
            </p>
            <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              SPARTA SSO
            </p>
          </div>
          <button
            onClick={onLogout}
            title="Keluar dari SPARTA Siaga"
            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
