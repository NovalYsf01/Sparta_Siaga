"use client";

import React, { useState } from "react";
import {
  Compass,
  ShieldAlert,
  Eye,
  EyeOff,
  CloudRain,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
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
}

export function MapControls({
  latestEarthquake,
  incidentOnly,
  onToggleIncidentOnly,
  basemap,
  onChangeBasemap,
  onResetView,
  totalStoresCount,
  affectedStoresCount,
  showRadar = false,
  onToggleRadar,
  radarTimeString,
  hidden = false,
  theme = "dark",
  activeLayer = "all",
  onLayerChange,
}: MapControlsProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMinimized(true);
      setIsLegendExpanded(false);
    }
  }, []);

  if (hidden) return null;

  const isDark = theme === "dark";
  const dangerRadius = latestEarthquake?.dangerRadiusKm || 50;
  const warningRadius = latestEarthquake?.warningRadiusKm || 110;

  // Minimized state - sleek floating pill button
  if (isMinimized) {
    return (
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[400] pointer-events-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center justify-center p-2.5 rounded-xl shadow-xl backdrop-blur-md text-xs font-semibold transition-all hover:scale-105 ${
            isDark
              ? "bg-slate-900/95 border border-slate-700 text-white hover:bg-slate-800"
              : "bg-white/95 border border-slate-300 text-slate-800 hover:bg-slate-100"
          }`}
          title="Buka Kontrol Layer Peta"
        >
          <Layers className="w-5 h-5 text-cyan-400" />
          {showRadar && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>
      </div>
    );
  }

  // Expanded compact card (No bulky scrollbars, sleek corporate slate design)
  return (
    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[400] flex flex-col pointer-events-auto transition-all duration-200 max-w-[calc(100vw-1.5rem)] sm:max-w-xs">
      <div
        className={`border rounded-2xl p-3 shadow-2xl backdrop-blur-xl w-full text-xs space-y-2.5 transition-colors duration-200 ${
          isDark
            ? "bg-slate-900/95 border-slate-700/80 text-white"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* Header with Title and Minimize Button */}
        <div className="flex items-center justify-between border-b pb-2 border-slate-700/50">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Kontrol Layer Peta</span>
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
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Layer Selector (3 Compact Horizontal Pills) */}
        <div>
          <div className={`text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center justify-between ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span>Tampilan Layer</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
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
                  className={`py-1.5 px-1 rounded-xl border text-center font-medium text-[11px] transition-all flex flex-col items-center gap-1 ${
                    isActive
                      ? isDark ? "bg-slate-800 text-white border-slate-600 shadow-sm font-bold" : "bg-white text-slate-900 border-slate-300 shadow-sm font-bold"
                      : isDark
                      ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      : "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700"
                  }`}
                >
                  <span className="text-sm">{layer.icon}</span>
                  <span className="leading-none">{layer.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Automated Earthquake Radius Summary REMOVED */}        {/* 3. Legenda Peta (Collapsible) */}
        <div className={`rounded-xl border overflow-hidden transition-all duration-200 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          <button
            onClick={() => setIsLegendExpanded(!isLegendExpanded)}
            className={`w-full flex items-center justify-between p-2 text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
          >
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Legenda
            </span>
            {isLegendExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {isLegendExpanded && (
            <div className="p-2 pt-0 grid grid-cols-2 gap-y-2 gap-x-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[7px] text-white">🌋</div>
                <span className={isDark ? "text-slate-300" : "text-slate-700"}>Epicenter Gempa</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded bg-blue-600/20 border border-blue-600 flex items-center justify-center text-[7px]">🏢</div>
                <span className={isDark ? "text-slate-300" : "text-slate-700"}>Cabang</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
                <span className={isDark ? "text-slate-300" : "text-slate-700"}>Toko (Aman)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded-full bg-amber-500 border border-white animate-pulse"></div>
                <span className={isDark ? "text-slate-300" : "text-slate-700"}>Toko Terindikasi</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Crisis Mode Filter & Doppler Radar Row */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onToggleIncidentOnly}
            className={`py-1.5 px-2 rounded-xl border text-center font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
              incidentOnly
                ? isDark ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-red-50 text-red-600 border-red-200"
                : isDark
                ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                : "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700"
            }`}
            title="Filter hanya toko dalam zona terdampak bencana"
          >
            {incidentOnly ? (
              <>
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Krisis ({affectedStoresCount})</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">Semua ({totalStoresCount.toLocaleString()})</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleRadar}
            className={`py-1.5 px-2 rounded-xl border text-center font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
              showRadar
                ? isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-cyan-50 text-cyan-600 border-cyan-200"
                : isDark
                ? "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                : "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700"
            }`}
            title="Aktifkan Doppler Satelit Radar Cuaca RainViewer"
          >
            <CloudRain className={`w-3.5 h-3.5 shrink-0 ${showRadar ? "animate-pulse" : ""}`} />
            <span className="truncate">Radar Cuaca</span>
          </button>
        </div>

        {/* Weather Radar Legend (Conditionally Rendered) */}
        {showRadar && (
          <div className={`p-2.5 rounded-xl border transition-colors animate-in fade-in slide-in-from-top-1 ${
            isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-200"
          }`}>
            <div className="flex items-center justify-between text-[10px] font-semibold mb-1.5">
              <span className={isDark ? "text-slate-300" : "text-slate-700"}>Intensitas Curah Hujan</span>
              <span className={`font-mono text-[9px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>dBZ</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-cyan-300 via-green-400 via-yellow-400 via-orange-500 via-red-500 to-fuchsia-600 mb-1"></div>
            <div className="flex justify-between text-[9px] font-medium">
              <span className="text-cyan-500">Gerimis</span>
              <span className="text-green-500">Sedang</span>
              <span className="text-orange-500">Lebat</span>
              <span className="text-fuchsia-500">Ekstrem</span>
            </div>
          </div>
        )}

        {/* 4. Basemap Switcher & Compass Reset */}
        <div
          className={`flex items-center justify-between pt-1 border-t ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-1">
            {(["esri-dark", "esri-light", "osm"] as const).map((mapType) => {
              const isSelected = basemap === mapType;
              const label =
                mapType === "esri-dark"
                  ? "Dark"
                  : mapType === "esri-light"
                  ? "Light"
                  : "OSM";
              return (
                <button
                  key={mapType}
                  onClick={() => onChangeBasemap(mapType)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    isSelected
                      ? isDark
                        ? "bg-cyan-600 text-white font-bold"
                        : "bg-slate-900 text-white font-bold"
                      : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={onResetView}
            title="Reset Kamera ke Peta Nasional"
            className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 transition-colors ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
