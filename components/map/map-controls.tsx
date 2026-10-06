"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  Eye,
  EyeOff,
  CloudRain,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCcw,
} from "lucide-react";
import { Earthquake } from "@/types/disaster";

interface MapControlsProps {
  latestEarthquake?: Earthquake;
  incidentOnly: boolean;
  onToggleIncidentOnly: () => void;
  basemap: "esri-dark" | "esri-light" | "osm";
  onChangeBasemap: (basemap: "esri-dark" | "esri-light" | "osm") => void;
  onResetView: () => void;
  totalStoresCount: number;
  affectedStoresCount: number;
  showRadar?: boolean;
  onToggleRadar?: () => void;
  radarTimeString?: string;
  hidden?: boolean;
  theme?: "dark" | "light";
  activeLayer?: "all" | "earthquake" | "stores" | "weather" | "flood";
  onLayerChange?: (layer: "all" | "earthquake" | "stores" | "weather" | "flood") => void;

  // Requirement 3 & 22: Map Time Filter (24 Jam vs 3 Hari Segmented Control)
  mapTimeFilter?: "24h" | "3d";
  onChangeMapTimeFilter?: (filter: "24h" | "3d") => void;

  // Requirement 7 & 32: Compact Event Focus Mode Banner
  selectedEarthquake?: Earthquake | null;
  onClearEventFocus?: () => void;
}

export function MapControls({
  incidentOnly,
  onToggleIncidentOnly,
  basemap,
  onChangeBasemap,
  onResetView,
  totalStoresCount,
  affectedStoresCount,
  showRadar = false,
  onToggleRadar,
  hidden = false,
  theme = "dark",
  activeLayer = "all",
  onLayerChange,
  mapTimeFilter = "3d",
  onChangeMapTimeFilter,
  selectedEarthquake,
  onClearEventFocus,
}: MapControlsProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMinimized(true);
      setIsLegendExpanded(false);
    }
  }, []);

  if (hidden) return null;

  const isDark = theme === "dark";

  // Minimized state - compact icon-only expand trigger (Tombol "Kontrol Peta" tidak tampil saat minimized)
  if (isMinimized) {
    return (
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[400] pointer-events-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className={`p-2.5 rounded-xl shadow-xl backdrop-blur-md transition-all hover:scale-105 flex items-center justify-center ${
            isDark
              ? "bg-slate-900/95 border border-slate-700 text-white hover:bg-slate-800"
              : "bg-white/95 border border-slate-300 text-slate-800 hover:bg-slate-100 shadow-md"
          }`}
          title="Buka Kontrol Peta"
          aria-label="Buka Kontrol Peta"
        >
          <Layers className="w-4 h-4 text-cyan-500" />
          {showRadar && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping ml-1" />
          )}
        </button>
      </div>
    );
  }

  // Expanded compact enterprise card (Requirements 20–32)
  return (
    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[400] flex flex-col pointer-events-auto transition-all duration-200 max-w-[calc(100vw-1.5rem)] sm:w-[260px]">
      <div
        className={`border rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl w-full text-xs space-y-2 transition-colors duration-200 max-h-[calc(100vh-140px)] overflow-y-auto ${
          isDark
            ? "bg-slate-900/95 border-slate-700/80 text-white"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* 21. Header Panel: Kontrol Peta + minimize button */}
        <div className={`flex items-center justify-between border-b pb-1.5 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <div className="flex items-center gap-1.5 font-bold text-xs tracking-tight">
            <Layers className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>Kontrol Peta</span>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className={`p-1 rounded-md transition-colors ${
              isDark
                ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
            }`}
            title="Minimalkan Kontrol"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 32. Event Focus Mode Banner: Compact Fokus: M... [Reset] */}
        {selectedEarthquake && (
          <div className={`p-1.5 px-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 ${
            isDark ? "bg-red-950/80 border-red-500/40 text-red-100" : "bg-red-50 border-red-200 text-red-900"
          }`}>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="text-[10px] font-bold truncate">
                Fokus: M{selectedEarthquake.magnitude} • {selectedEarthquake.title || selectedEarthquake.place}
              </span>
            </div>
            {onClearEventFocus && (
              <button
                onClick={onClearEventFocus}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 hover:bg-red-500 text-white shrink-0 transition-colors flex items-center gap-1 shadow-xs"
                title="Reset Fokus Event"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}

        {/* 22. Periode Gempa — Segmented Control [ 24 Jam | 3 Hari ] */}
        <div>
          <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Periode Gempa
          </div>
          <div
            className={`p-0.5 rounded-lg flex items-center gap-0.5 border ${
              isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}
          >
            <button
              onClick={() => onChangeMapTimeFilter?.("24h")}
              className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all text-center ${
                mapTimeFilter === "24h"
                  ? "bg-amber-500 text-white shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              24 Jam
            </button>
            <button
              onClick={() => onChangeMapTimeFilter?.("3d")}
              className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all text-center ${
                mapTimeFilter === "3d"
                  ? "bg-blue-600 text-white shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3 Hari
            </button>
          </div>
        </div>

        {/* 24. Layer Selector: Compact horizontal pills */}
        <div>
          <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Layer
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: "all", label: "Semua", icon: "🌐" },
              { id: "earthquake", label: "Gempa", icon: "🌋" },
              { id: "flood", label: "Banjir", icon: "🌊" },
              { id: "stores", label: "Toko", icon: "🏪" },
            ].map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() =>
                    onLayerChange?.(
                      layer.id as "all" | "earthquake" | "stores" | "flood"
                    )
                  }
                  className={`py-1 px-1 rounded-lg border text-center text-[10px] transition-all flex flex-col items-center gap-0.5 ${
                    isActive
                      ? isDark
                        ? "bg-slate-800 text-white border-cyan-500/50 shadow-xs font-bold"
                        : "bg-white text-slate-900 border-slate-300 shadow-xs font-bold"
                      : isDark
                      ? "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <span className="text-xs leading-none">{layer.icon}</span>
                  <span className="leading-none text-[9px]">{layer.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 25. Crisis + Radar: Compact row right under Layer */}
        <div className="grid grid-cols-2 gap-1 pt-0.5">
          <button
            onClick={onToggleIncidentOnly}
            className={`py-1 px-1.5 rounded-lg border text-center font-semibold text-[10px] flex items-center justify-center gap-1 transition-all ${
              incidentOnly
                ? isDark
                  ? "bg-red-500/15 text-red-400 border-red-500/40 font-bold"
                  : "bg-red-50 text-red-600 border-red-200 font-bold"
                : isDark
                ? "bg-transparent border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                : "bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title={incidentOnly ? "Mode krisis aktif (hanya toko di zona terdampak)" : "Klik untuk memfilter hanya toko di zona krisis"}
          >
            {incidentOnly ? (
              <Eye className="w-3 h-3 shrink-0" />
            ) : (
              <EyeOff className="w-3 h-3 shrink-0 opacity-70" />
            )}
            <span className="truncate">Krisis</span>
          </button>

          <button
            onClick={onToggleRadar}
            className={`py-1 px-1.5 rounded-lg border text-center font-semibold text-[10px] flex items-center justify-center gap-1 transition-all ${
              showRadar
                ? isDark
                  ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/40 font-bold"
                  : "bg-cyan-50 text-cyan-600 border-cyan-200 font-bold"
                : isDark
                ? "bg-transparent border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                : "bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title="Toggle Radar Doppler RainViewer"
          >
            <CloudRain className="w-3 h-3 shrink-0" />
            <span className="truncate">Radar</span>
          </button>
        </div>

        {/* 26. Legenda Status Operasional: Collapsible */}
        <div
          className={`rounded-xl border overflow-hidden transition-all duration-200 ${
            isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <button
            onClick={() => setIsLegendExpanded(!isLegendExpanded)}
            className={`w-full flex items-center justify-between p-1.5 px-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Legenda Status</span>
            </span>
            {isLegendExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {isLegendExpanded && (
            <div className="p-2 pt-0.5 flex flex-col gap-1 border-t border-slate-200/40 dark:border-slate-800/40 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 border border-emerald-600/50 shrink-0" />
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-700 font-medium"}>
                  Normal
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-amber-500 border border-amber-600/50 shrink-0" />
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-700 font-medium"}>
                  Perlu Perhatian
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-red-600 border border-red-700/50 animate-pulse shrink-0" />
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-700 font-medium"}>
                  Terdampak Lapangan
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-blue-600 border border-blue-700/50 shrink-0" />
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-700 font-medium"}>
                  Dalam Penanganan
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-slate-400 border border-slate-500/50 shrink-0" />
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-700 font-medium"}>
                  Selesai
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 27. Basemap Selector: Compact segmented selector */}
        <div>
          <div className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Basemap
          </div>
          <div
            className={`p-0.5 rounded-lg flex items-center gap-0.5 border ${
              isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}
          >
            {[
              { id: "esri-dark", label: "Dark" },
              { id: "esri-light", label: "Light" },
              { id: "osm", label: "OSM" },
            ].map((b) => {
              const isSelected = basemap === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => onChangeBasemap(b.id as any)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all text-center ${
                    isSelected
                      ? isDark
                        ? "bg-slate-800 text-cyan-400 shadow-xs font-bold"
                        : "bg-white text-blue-600 shadow-xs font-bold"
                      : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 28. Reset Tampilan Peta: Secondary action button */}
        <button
          onClick={onResetView}
          className={`w-full py-1 px-2 rounded-lg border font-medium text-[10px] flex items-center justify-center gap-1.5 transition-all ${
            isDark
              ? "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              : "border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Compass className="w-3 h-3 shrink-0" />
          <span>Reset Tampilan</span>
        </button>
      </div>
    </div>
  );
}
