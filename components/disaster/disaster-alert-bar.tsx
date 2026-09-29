"use client";

import React, { useState } from "react";
import { Earthquake } from "@/types/disaster";
import {
  AlertTriangle,
  Radio,
  Waves,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Activity,
  MapPin,
  List,
} from "lucide-react";
import { EarthquakeListModal } from "./earthquake-list-modal";

interface DisasterAlertBarProps {
  earthquakes?: Earthquake[];
  latestEarthquake?: Earthquake;
  affectedCount: number;
  onOpenAffectedSheet: () => void;
  onFocusDisaster: (earthquake: Earthquake) => void;
  theme?: "dark" | "light";
}

export function DisasterAlertBar({
  earthquakes = [],
  latestEarthquake,
  affectedCount,
  onOpenAffectedSheet,
  onFocusDisaster,
  theme = "dark",
}: DisasterAlertBarProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  const activeEarthquakes = earthquakes.length > 0 ? earthquakes : (latestEarthquake ? [latestEarthquake] : []);
  if (activeEarthquakes.length === 0) return null;

  // HANYA TAMPILKAN 1 GEMPA TERBARU SESUAI PERMINTAAN USER
  const currentEq = latestEarthquake || activeEarthquakes[0];
  const isTsunami = currentEq.potensiTsunami;
  const isHighMag = currentEq.magnitude >= 6.0;
  const isDark = theme === "dark";

  return (
    <div
      className={`w-full px-2.5 sm:px-4 py-1.5 sm:py-2 transition-all duration-300 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 text-xs sm:text-sm font-medium z-30 shadow-md ${
        isTsunami
          ? isDark
            ? "bg-red-950/90 text-red-200 border-red-700/80 animate-pulse"
            : "bg-red-100 text-red-900 border-red-300"
          : isHighMag
          ? isDark
            ? "bg-red-900/80 text-red-100 border-red-700/60"
            : "bg-rose-50 text-rose-900 border-rose-200"
          : isDark
          ? "bg-slate-900/90 text-slate-200 border-slate-700/60 backdrop-blur-md"
          : "bg-slate-50 text-slate-800 border-slate-200 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div
          className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
            isTsunami
              ? "bg-red-600 text-white animate-bounce"
              : isHighMag
              ? "bg-red-700 text-white"
              : "bg-amber-600 text-white"
          }`}
        >
          {isTsunami ? (
            <Waves className="w-4 h-4" />
          ) : isHighMag ? (
            <ShieldAlert className="w-4 h-4" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold tracking-wide uppercase bg-red-500/20 text-red-500 border border-red-500/30 shrink-0">
            <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-ping text-red-500" />
            {currentEq.source} LIVE
          </span>

          {/* Removed Pagination (1/17) as per user request to keep it minimal */}

          <span className={`font-semibold text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none ${isDark ? "text-white" : "text-slate-900"}`}>
            {currentEq.title}
          </span>

          <span className={`text-[11px] sm:text-xs font-mono hidden sm:inline ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Kedalaman: {currentEq.depth} • {currentEq.time}
          </span>

          {isTsunami && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-600 text-white tracking-wider animate-pulse shrink-0">
              PERINGATAN DINI TSUNAMI
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end md:self-center">
        {affectedCount > 0 ? (
          <button
            onClick={onOpenAffectedSheet}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{affectedCount} Toko Terdampak</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <span
            className={`text-[11px] sm:text-xs border px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-mono hidden sm:inline ${
              isDark
                ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/40"
                : "text-emerald-700 bg-emerald-50 border-emerald-300"
            }`}
          >
            ✓ Seluruh Toko Aman
          </span>
        )}

        <button
          onClick={() => setIsListModalOpen(true)}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 font-semibold ${
            isDark
              ? "bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700"
              : "bg-white hover:bg-slate-100 text-cyan-700 border-slate-300 shadow-sm"
          }`}
          title="Buka daftar lengkap seluruh gempa bumi aktif nasional"
        >
          <List className="w-3.5 h-3.5 text-cyan-400" />
          <span>Daftar Gempa ({activeEarthquakes.length})</span>
        </button>

        <button
          onClick={() => onFocusDisaster(currentEq)}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 font-semibold ${
            isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm"
          }`}
          title="Fokuskan kamera peta ke episentrum gempa ini"
        >
          <MapPin className="w-3 h-3 text-red-500" />
          <span>Lihat Episentrum</span>
        </button>
      </div>

      <EarthquakeListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        earthquakes={activeEarthquakes}
        onSelectEarthquake={(eq) => {
          onFocusDisaster(eq);
          // Since we only display index 0 on the banner, clicking a past earthquake in the list 
          // simply focuses the map. The banner itself remains anchored to the latest earthquake.
        }}
        selectedEarthquakeId={currentEq.id}
        theme={theme}
      />
    </div>
  );
}
