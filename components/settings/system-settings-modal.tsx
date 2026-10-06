"use client";

import React, { useState } from "react";
import {
  X,
  Settings,
  Bell,
  Volume2,
  VolumeX,
  Palette,
  Map,
  Shield,
  Check,
  Building,
  Monitor,
  CloudRain,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

export interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 1. Notification & Branch
  permissionState: NotificationPermission;
  onRequestPermission: () => Promise<void>;
  monitoredBranch: string;
  onSelectMonitoredBranch: (branch: string) => void;
  branchList: string[];
  // 2. Audio & Alarm
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onTestSound: () => void;
  // 3. Theme & Appearance
  theme: "dark" | "light";
  onSelectTheme: (theme: "dark" | "light") => void;
  basemap: "esri-dark" | "esri-light" | "osm";
  onSelectBasemap: (basemap: "esri-dark" | "esri-light" | "osm") => void;
  showRadar: boolean;
  onToggleRadar: (show: boolean) => void;
}

export function SystemSettingsModal({
  isOpen,
  onClose,
  permissionState,
  onRequestPermission,
  monitoredBranch,
  onSelectMonitoredBranch,
  branchList,
  soundEnabled,
  onToggleSound,
  onTestSound,
  theme,
  onSelectTheme,
  basemap,
  onSelectBasemap,
  showRadar,
  onToggleRadar,
}: SystemSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "audio" | "appearance">("general");

  if (!isOpen) return null;

  const isDark = theme === "dark";

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
          isDark
            ? "bg-slate-900 border-slate-700/90 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-3.5 sm:p-4 border-b flex items-center justify-between gap-2.5 sm:gap-3 ${
            isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20 shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">Pengaturan Command Center</h2>
              <p className={`text-[10px] sm:text-[11px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Preferensi notifikasi, alarm suara, cabang siaga, dan tema visual
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              isDark
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Tutup (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex border-b text-xs font-semibold px-2 sm:px-4 gap-1 sm:gap-2 overflow-x-auto ${
            isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200"
          }`}
        >
          <button
            onClick={() => setActiveTab("general")}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "general"
                ? "border-red-500 text-red-500 font-bold"
                : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifikasi & Cabang</span>
          </button>

          <button
            onClick={() => setActiveTab("audio")}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "audio"
                ? "border-red-500 text-red-500 font-bold"
                : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Alarm & Suara</span>
          </button>

          <button
            onClick={() => setActiveTab("appearance")}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "appearance"
                ? "border-red-500 text-red-500 font-bold"
                : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Tema & Peta</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-5 text-xs">
          {/* TAB 1: General (Notifikasi & Cabang) */}
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Desktop Notification Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  isDark
                    ? "bg-slate-950/60 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">Notifikasi Pop-up Desktop</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          permissionState === "granted"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-600/40"
                            : "bg-amber-950 text-amber-400 border border-amber-600/40"
                        }`}
                      >
                        {permissionState === "granted" ? "● Aktif" : "○ Belum Diizinkan"}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Menampilkan kartu peringatan darurat otomatis di pojok layar monitor Anda bahkan
                      ketika browser terminimalisir saat terjadi gempa atau krisis bencana baru.
                    </p>
                  </div>
                </div>

                {permissionState !== "granted" ? (
                  <button
                    onClick={onRequestPermission}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shrink-0 shadow-md shadow-cyan-600/30"
                  >
                    Izinkan Notifikasi
                  </button>
                ) : (
                  <span className="text-emerald-500 font-semibold text-xs shrink-0 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Terhubung</span>
                  </span>
                )}
              </div>

              {/* Monitored Branch Selector */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Building className="w-4 h-4 text-amber-500" />
                  <span className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Cabang Tanggung Jawab / Wilayah Pantauan</span>
                </div>
                <div
                  className={`w-full p-2.5 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
                    isDark
                      ? "bg-slate-900/50 border-slate-800 text-slate-400"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  <span>
                    {monitoredBranch === "all" ? "🏢 Semua Cabang (Nasional / Head Office Pusat)" : `Cabang ${monitoredBranch}`}
                  </span>
                  <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-500"}`}>Otomatis berdasarkan login</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Audio & Alarm */}
          {activeTab === "audio" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 shrink-0">
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">Suara Chime Siaga Darurat</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Memutar audio chime ganda harmonis secara otomatis saat gempa BMKG terdeteksi di Zona Prioritas Pantau SPARTA gerai toko.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onToggleSound(!soundEnabled)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                    soundEnabled
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                  }`}
                >
                  {soundEnabled ? "Aktif" : "Senyap"}
                </button>
              </div>

              {/* Test Audio Button */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">Uji Coba Alarm Audio</div>
                  <p className="text-slate-400 text-[11px]">
                    Pastikan volume speaker laptop Anda terdengar jelas oleh Duty Officer.
                  </p>
                </div>

                <button
                  onClick={onTestSound}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/20"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Uji Suara Chime</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Theme & Map Appearance */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              {/* Theme Choice Cards */}
              <div className="space-y-2">
                <span className={`font-bold text-xs ${isDark ? "text-white" : "text-slate-900"}`}>Tema Sistem Dashboard</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onSelectTheme("dark")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 transition-all ${
                      theme === "dark"
                        ? isDark ? "bg-slate-900 border-red-500 ring-1 ring-red-500 shadow-md text-red-400" : "bg-red-50 border-red-500 text-red-600"
                        : isDark
                        ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span className="font-bold text-xs">Mode Gelap</span>
                  </button>

                  <button
                    onClick={() => onSelectTheme("light")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 transition-all ${
                      theme === "light"
                        ? isDark ? "bg-slate-900 border-red-500 ring-1 ring-red-500 shadow-md text-red-400" : "bg-red-50 border-red-500 text-red-600"
                        : isDark
                        ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span className="font-bold text-xs">Mode Terang</span>
                  </button>
                </div>
              </div>

              {/* Basemap Selection */}
              <div className="space-y-2">
                <span className={`font-bold text-xs ${isDark ? "text-white" : "text-slate-900"}`}>Pilihan Kanvas Peta (Basemap)</span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <button
                    onClick={() => onSelectBasemap("esri-dark")}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      basemap === "esri-dark"
                        ? isDark ? "border-red-500 bg-red-500/10 text-red-400 font-bold" : "border-red-500 bg-red-50 text-red-600 font-bold"
                        : isDark
                        ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Map className="w-4 h-4 mx-auto mb-1" />
                    <span>Esri Dark</span>
                  </button>

                  <button
                    onClick={() => onSelectBasemap("esri-light")}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      basemap === "esri-light"
                        ? isDark ? "border-red-500 bg-red-500/10 text-red-400 font-bold" : "border-red-500 bg-red-50 text-red-600 font-bold"
                        : isDark
                        ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Map className="w-4 h-4 mx-auto mb-1" />
                    <span>Esri Light</span>
                  </button>

                  <button
                    onClick={() => onSelectBasemap("osm")}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      basemap === "osm"
                        ? isDark ? "border-red-500 bg-red-500/10 text-red-400 font-bold" : "border-red-500 bg-red-50 text-red-600 font-bold"
                        : isDark
                        ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Map className="w-4 h-4 mx-auto mb-1" />
                    <span>OSM</span>
                  </button>
                </div>
              </div>

              {/* RainViewer Doppler Radar Toggle */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600/20 text-cyan-400 border border-blue-500/30">
                    <CloudRain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`font-semibold text-xs ${isDark ? "text-white" : "text-slate-900"}`}>Live Doppler Weather Radar</div>
                    <div className="text-[11px] text-slate-400">
                      Layer satelit awan hujan intensitas tinggi BMKG & RainViewer
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onToggleRadar(!showRadar)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    showRadar
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                  }`}
                >
                  {showRadar ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3.5 border-t flex items-center justify-end text-xs ${
            isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-md shadow-red-600/20"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
