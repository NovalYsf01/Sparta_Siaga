"use client";

import React from "react";
import {
  FileText,
  Plus,
  UserX,
  Flame,
  Activity,
  Waves,
  Wind,
  MoreHorizontal,
  ChevronRight,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldAlert,
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
    { id: "earthquake", label: "Gempa Bumi", icon: Activity, bg: "bg-orange-50/80 hover:bg-orange-100/80", darkBg: "bg-orange-950/40 hover:bg-orange-900/50 border-orange-900/40", color: "text-orange-500" },
    { id: "flood", label: "Banjir", icon: Waves, bg: "bg-sky-50/80 hover:bg-sky-100/80", darkBg: "bg-sky-950/40 hover:bg-sky-900/50 border-sky-900/40", color: "text-sky-400" },
    { id: "other", label: "Lainnya", icon: MoreHorizontal, bg: "bg-slate-100/80 hover:bg-slate-200/80", darkBg: "bg-slate-800/60 hover:bg-slate-800 border-slate-700/50", color: "text-slate-400" },
  ];

  // Active highlighted incident for the Progress Penanganan card
  const activeIncident = incidents.find((i) => i.status !== "resolved" && i.status !== "archived") || incidents[0];

  const getDisasterIcon = (type: DisasterType) => {
    switch (type) {
      case "flood":
        return <Waves className="w-5 h-5 text-blue-500" />;
      case "theft":
        return <UserX className="w-5 h-5 text-slate-400" />;
      case "fire":
        return <Flame className="w-5 h-5 text-red-500" />;
      case "earthquake":
        return <Activity className="w-5 h-5 text-amber-500" />;
      case "wind":
        return <Wind className="w-5 h-5 text-emerald-500" />;
      default:
        return <MoreHorizontal className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_maintenance":
        return {
          label: "Dalam Penanganan",
          color: isDark ? "bg-amber-950/80 text-amber-300 border border-amber-700/50" : "bg-amber-100 text-amber-800",
        };
      case "investigating":
        return {
          label: "Investigasi",
          color: isDark ? "bg-blue-950/80 text-blue-300 border border-blue-700/50" : "bg-blue-100 text-blue-800",
        };
      case "resolved":
      case "archived":
        return {
          label: "Selesai",
          color: isDark ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/50" : "bg-emerald-100 text-emerald-800",
        };
      case "verifying":
        return {
          label: "Verifikasi SM",
          color: isDark ? "bg-purple-950/80 text-purple-300 border border-purple-700/50" : "bg-purple-100 text-purple-800",
        };
      default:
        return {
          label: "Laporan Baru",
          color: isDark ? "bg-rose-950/80 text-rose-300 border border-rose-700/50" : "bg-rose-100 text-rose-800",
        };
    }
  };

  // Compute active step dynamically based on status
  const getStepState = (stepIndex: number, status: string) => {
    // 0: Laporan Masuk, 1: Verifikasi, 2: Perbaikan, 3: Selesai
    if (status === "resolved" || status === "archived") return "completed";
    if (status === "in_maintenance") {
      if (stepIndex <= 1) return "completed";
      if (stepIndex === 2) return "active";
      return "pending";
    }
    if (status === "investigating") {
      if (stepIndex === 0) return "completed";
      if (stepIndex === 1) return "completed";
      if (stepIndex === 2) return "active";
      return "pending";
    }
    if (status === "verifying") {
      if (stepIndex === 0) return "completed";
      if (stepIndex === 1) return "active";
      return "pending";
    }
    // New or unhandled
    if (stepIndex === 0) return "active";
    return "pending";
  };

  return (
    <div className="flex flex-col gap-4 p-3.5 sm:p-4 max-w-lg mx-auto pb-12 transition-colors duration-200">
      {/* 1. HERO QUICK ACTION CARD */}
      <div
        className={`rounded-2xl p-4 border shadow-sm flex flex-col gap-3 transition-colors ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div
          onClick={onCreateReportClick}
          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
            isDark
              ? "bg-slate-950/60 border-slate-800 hover:bg-slate-950 text-slate-200"
              : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 hover:bg-emerald-100/60 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">Lapor Kejadian</div>
              <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Laporkan insiden gerai dengan cepat
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>

        <button
          onClick={onCreateReportClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all min-h-[44px]"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Laporan Baru</span>
        </button>
      </div>

      {/* 2. PILIH JENIS KEJADIAN */}
      <div>
        <h3 className={`font-bold text-sm mb-2.5 ${isDark ? "text-white" : "text-slate-900"}`}>
          Pilih Jenis Kejadian
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryClick?.(cat.id)}
                className={`flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-2xl border transition-all active:scale-95 min-h-[88px] ${
                  isDark ? `${cat.darkBg} border-slate-800` : `${cat.bg} border-transparent shadow-xs`
                }`}
              >
                <div
                  className={`p-2 rounded-xl shadow-xs ${cat.color} ${
                    isDark ? "bg-slate-900/80" : "bg-white/80"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span
                  className={`text-xs font-semibold text-center leading-tight ${
                    isDark ? "text-slate-200" : "text-slate-800"
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. RINGKASAN KEJADIAN */}
      <div
        className={`rounded-2xl p-4 border shadow-xs transition-colors ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
            Ringkasan Kejadian (Sep 2026)
          </h3>
          <button
            onClick={onViewAllClick}
            className="text-xs font-semibold text-blue-500 hover:underline"
          >
            Lihat Semua
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            <span className={`text-lg font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
              {incidents.length}
            </span>
            <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Total
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            <UserX className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className={`text-sm font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                {incidents.filter((i) => i.disasterType === "theft").length}
              </div>
              <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Maling</div>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            <Flame className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className={`text-sm font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                {incidents.filter((i) => i.disasterType === "fire").length}
              </div>
              <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Kebakaran</div>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            <Activity className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <div className={`text-sm font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                {incidents.filter((i) => i.disasterType === "earthquake").length}
              </div>
              <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Gempa</div>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            <Waves className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className={`text-sm font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                {incidents.filter((i) => i.disasterType === "flood").length}
              </div>
              <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Banjir</div>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            <Wind className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className={`text-sm font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                {incidents.filter((i) => i.disasterType === "wind").length}
              </div>
              <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Angin</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PROGRESS PENANGANAN CARD */}
      {activeIncident && (
        <div
          onClick={() => onSelectIncident(activeIncident)}
          className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition-colors ${
            isDark
              ? "bg-slate-900 border-slate-800 hover:border-blue-500"
              : "bg-white border-slate-200 hover:border-blue-400"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
              Progress Penanganan Aktif
            </h3>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isDark ? "bg-slate-800" : "bg-blue-50"}`}>
                {getDisasterIcon(activeIncident.disasterType)}
              </div>
              <div>
                <div className={`font-bold text-sm leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
                  {activeIncident.storeName}
                </div>
                <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {activeIncident.disasterType.toUpperCase()} • {activeIncident.date}
                </div>
              </div>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                getStatusBadge(activeIncident.status).color
              }`}
            >
              {getStatusBadge(activeIncident.status).label}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`flex-1 h-2 rounded-full overflow-hidden ${
                isDark ? "bg-slate-800" : "bg-slate-100"
              }`}
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${activeIncident.progress}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
              {activeIncident.progress}%
            </span>
          </div>

          {/* 4-Step Dynamic Stepper */}
          <div className="grid grid-cols-4 gap-1 text-center relative pt-2">
            {[
              { label: "Laporan", date: "Masuk" },
              { label: "Verifikasi", date: "SM" },
              { label: "Perbaikan", date: "Sparta" },
              { label: "Selesai", date: "Arsip" },
            ].map((step, idx) => {
              const state = getStepState(idx, activeIncident.status);
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  {state === "completed" ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : state === "active" ? (
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-500/20 text-blue-400 flex items-center justify-center animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                        isDark
                          ? "border-slate-800 bg-slate-800/60 text-slate-500"
                          : "border-slate-200 bg-slate-100 text-slate-300"
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-slate-400/40" />
                    </div>
                  )}
                  <span
                    className={`text-[10px] font-semibold leading-tight ${
                      state === "completed"
                        ? isDark ? "text-emerald-400" : "text-emerald-700"
                        : state === "active"
                        ? isDark ? "text-blue-400 font-bold" : "text-blue-700 font-bold"
                        : isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[9px] text-slate-500">{step.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. KEJADIAN TERBARU LIST */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
            Kejadian Terbaru
          </h3>
          <button
            onClick={onViewAllClick}
            className="text-xs font-semibold text-blue-500 hover:underline"
          >
            Lihat Semua
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {incidents.slice(1, 4).map((inc) => (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc)}
              className={`p-3 rounded-2xl border flex items-center justify-between shadow-xs transition-colors cursor-pointer ${
                isDark
                  ? "bg-slate-900 border-slate-800 active:bg-slate-800 text-white"
                  : "bg-white border-slate-200 active:bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                  {getDisasterIcon(inc.disasterType)}
                </div>
                <div>
                  <div className="font-bold text-sm leading-snug">{inc.storeName}</div>
                  <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {inc.disasterType.charAt(0).toUpperCase() + inc.disasterType.slice(1)} • {inc.date}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  getStatusBadge(inc.status).color
                }`}
              >
                {getStatusBadge(inc.status).label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
