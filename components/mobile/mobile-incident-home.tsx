"use client";

import React from "react";
import {
  FileText,
  Plus,
  Activity,
  Waves,
  Building2,
  ChevronRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { IncidentRecord, DisasterType } from "@/types/incident";

interface MobileIncidentHomeProps {
  incidents: IncidentRecord[];
  onSelectIncident: (incident: IncidentRecord) => void;
  onCreateReportClick: () => void;
  onCategoryClick?: (category: DisasterType) => void;
  onViewAllClick?: () => void;
  theme?: "dark" | "light";
}

export function MobileIncidentHome({
  incidents,
  onSelectIncident,
  onCreateReportClick,
  onCategoryClick,
  onViewAllClick,
  theme = "light",
}: MobileIncidentHomeProps) {
  const isDark = theme === "dark";

  const categories: {
    id: DisasterType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    darkBg: string;
    color: string;
  }[] = [
    { id: "earthquake", label: "Gempa Bumi", icon: Activity, bg: "bg-red-50 hover:bg-red-100", darkBg: "bg-red-950/40 border-red-900/40", color: "text-[#D9272E]" },
    { id: "flood", label: "Banjir / Badai", icon: Waves, bg: "bg-blue-50 hover:bg-blue-100", darkBg: "bg-blue-950/40 border-blue-900/40", color: "text-[#1D5AA6]" },
    { id: "severe_building_damage", label: "Kerusakan Fisik", icon: Building2, bg: "bg-slate-100 hover:bg-slate-200", darkBg: "bg-slate-800/60 border-slate-700/50", color: "text-slate-600 dark:text-slate-300" },
  ];

  // Active highlighted incident
  const activeIncident = incidents.find((i) => i.status !== "resolved" && i.status !== "closed" && i.status !== "archived") || incidents[0];

  const getDisasterIcon = (type: DisasterType) => {
    switch (type) {
      case "flood":
      case "heavy_rain":
        return <Waves className="w-5 h-5 text-blue-500" />;
      case "earthquake":
        return <Activity className="w-5 h-5 text-[#D9272E]" />;
      case "severe_building_damage":
        return <Building2 className="w-5 h-5 text-amber-500" />;
      default:
        return <Building2 className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_confirmation":
      case "verifying":
        return {
          label: "Cek Fisik",
          color: isDark ? "bg-amber-950/80 text-amber-300 border border-amber-700/50" : "bg-amber-50 text-amber-800 border border-amber-200",
        };
      case "pending_bm_approval":
      case "pending_final_approval":
      case "awaiting_st":
        return {
          label: "Approval BM",
          color: isDark ? "bg-indigo-950/80 text-indigo-300 border border-indigo-700/50" : "bg-indigo-50 text-indigo-800 border border-indigo-200",
        };
      case "in_maintenance":
      case "investigating":
      case "in_estimation":
      case "confirmed_affected":
        return {
          label: "Penanganan",
          color: isDark ? "bg-blue-950/80 text-blue-300 border border-blue-700/50" : "bg-blue-50 text-[#1D5AA6] border border-blue-200",
        };
      case "closed":
      case "resolved":
      case "confirmed_safe":
        return {
          label: "Selesai (CLOSED)",
          color: isDark ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/50" : "bg-emerald-50 text-emerald-800 border border-emerald-200",
        };
      default:
        return {
          label: "Laporan Baru",
          color: isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700",
        };
    }
  };

  // Operational metrics from genuine data
  const totalCount = incidents.length;
  const earthquakeCount = incidents.filter(i => i.disasterType === "earthquake" || i.reportOrigin === "automatic_earthquake").length;
  const needCheckCount = incidents.filter(i => i.status === "pending_confirmation" || i.status === "verifying" || i.status === "clarification_requested").length;
  const needBmCount = incidents.filter(i => i.status === "pending_bm_approval" || i.status === "pending_final_approval" || i.status === "awaiting_st").length;
  const inProgressCount = incidents.filter(i => i.status === "in_maintenance" || i.status === "investigating" || i.status === "in_estimation" || ((i.progress ?? 0) > 0 && (i.progress ?? 0) < 100)).length;
  const closedCount = incidents.filter(i => i.status === "closed" || i.status === "resolved").length;

  return (
    <div className="flex flex-col gap-3.5 p-3.5 max-w-lg mx-auto pb-10 transition-colors duration-200">
      {/* 1. HERO QUICK ACTION CARD */}
      <div
        className={`rounded-2xl p-4 border shadow-xs flex flex-col gap-3 transition-colors ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#123B6D] dark:text-blue-400">
              SPARTA SIAGA Mobile
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Pemantauan Bencana Cabang
            </h2>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1D5AA6] dark:bg-blue-950/60 dark:text-blue-300">
            {totalCount} Laporan
          </span>
        </div>

        <button
          onClick={onCreateReportClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D5AA6] hover:bg-[#123B6D] active:scale-98 text-white font-bold text-xs shadow-sm transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan Insiden Baru</span>
        </button>
      </div>

      {/* 2. PILIH JENIS KEJADIAN */}
      <div>
        <h3 className={`font-bold text-xs uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Kategori Bencana
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryClick?.(cat.id)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition-all active:scale-95 min-h-[76px] ${
                  isDark ? `${cat.darkBg} border-slate-800` : `${cat.bg} border-slate-200/80 shadow-xs`
                }`}
              >
                <div className={`p-1.5 rounded-lg ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-semibold text-center leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. OPERATIONAL KPI SUMMARY (2 COLUMNS RESPONSIVE) */}
      <div
        className={`rounded-2xl p-4 border shadow-xs transition-colors ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-bold text-xs uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Status Operasional
          </h3>
          <button
            onClick={onViewAllClick}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline min-h-[36px] flex items-center"
          >
            Lihat Semua ({totalCount})
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
            <span className="text-[11px] font-medium text-slate-500">Gempa Otomatis</span>
            <span className="font-bold text-sm text-[#D9272E] font-mono">{earthquakeCount}</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
            <span className="text-[11px] font-medium text-slate-500">Perlu Cek Fisik</span>
            <span className="font-bold text-sm text-[#F59E0B] font-mono">{needCheckCount}</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
            <span className="text-[11px] font-medium text-slate-500">Persetujuan BM</span>
            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 font-mono">{needBmCount}</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
            <span className="text-[11px] font-medium text-slate-500">Dalam Penanganan</span>
            <span className="font-bold text-sm text-[#1D5AA6] dark:text-blue-400 font-mono">{inProgressCount}</span>
          </div>

          <div className={`col-span-2 p-2.5 rounded-xl border flex items-center justify-between ${isDark ? "bg-emerald-950/20 border-emerald-900/40" : "bg-emerald-50/50 border-emerald-100"}`}>
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Laporan Selesai / CLOSED</span>
            <span className="font-black text-sm text-emerald-700 dark:text-emerald-300 font-mono">{closedCount}</span>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE HIGHLIGHTED REPORT CARD (5 MILESTONES) */}
      {activeIncident && (
        <div
          onClick={() => onSelectIncident(activeIncident)}
          className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition-colors active:scale-[0.99] ${
            isDark
              ? "bg-slate-900 border-slate-800 hover:border-blue-500"
              : "bg-white border-slate-200 hover:border-blue-400"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-bold text-xs uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Penanganan Sedang Berjalan
            </h3>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${isDark ? "bg-slate-800" : "bg-blue-50"}`}>
                {getDisasterIcon(activeIncident.disasterType)}
              </div>
              <div className="truncate">
                <div className={`font-bold text-sm truncate leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
                  {activeIncident.storeName}
                </div>
                <div className={`text-[11px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {activeIncident.branch} • {activeIncident.date}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                getStatusBadge(activeIncident.status).color
              }`}
            >
              {getStatusBadge(activeIncident.status).label}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-500">Progress Milestone</span>
              <span className="font-mono font-bold text-[#1D5AA6] dark:text-blue-400">
                {activeIncident.progress ?? 0}%
              </span>
            </div>
            <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
              <div
                className="h-full rounded-full bg-[#1D5AA6] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, activeIncident.progress ?? 0))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. DAFTAR KEJADIAN TERBARU */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-bold text-xs uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Laporan Terbaru
          </h3>
          <button
            onClick={onViewAllClick}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline min-h-[36px] flex items-center"
          >
            Lihat Semua
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {incidents.slice(0, 4).map((inc) => (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc)}
              className={`p-3 rounded-xl border flex items-center justify-between shadow-xs transition-colors cursor-pointer min-h-[56px] active:scale-[0.99] ${
                isDark
                  ? "bg-slate-900 border-slate-800 active:bg-slate-800 text-white"
                  : "bg-white border-slate-200 active:bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                  {getDisasterIcon(inc.disasterType)}
                </div>
                <div className="truncate flex-1">
                  <div className="font-bold text-xs truncate leading-snug">{inc.storeName}</div>
                  <div className={`text-[10px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {inc.branch} • {inc.date}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    getStatusBadge(inc.status).color
                  }`}
                >
                  {getStatusBadge(inc.status).label}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
