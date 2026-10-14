"use client";

import React, { useState } from "react";
import {
  Layers,
  RotateCcw,
  Info,
  Radio,
  Activity,
  MapPin,
  List,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building,
  Store,
  Eye,
  EyeOff,
  CloudRain,
  Clock,
  Filter,
  CheckCircle2,
  Wrench,
  ShieldAlert,
  Search,
  X,
} from "lucide-react";
import { Earthquake } from "@/types/disaster";

export type MapMode = "event" | "location";

interface MapToolbarProps {
  mapMode: MapMode;
  onModeChange: (mode: MapMode) => void;
  // Mode Kejadian Context
  latestEarthquake?: Earthquake;
  activeEarthquakesCount: number;
  evaluatedLocationsCount: number;
  onOpenEvaluatedSheet: () => void;
  onOpenEarthquakeListModal: () => void;
  onFocusEpicenter: () => void;
  // Mode Lokasi Context & Filters
  searchQuery: string;
  onSearchChange: (query: string) => void;
  facilityType: string;
  onFacilityTypeChange: (type: string) => void;
  facilityBranch: string;
  onFacilityBranchChange: (branch: string) => void;
  facilityMapping: string;
  onFacilityMappingChange: (mapping: string) => void;
  branchOptions: string[];
  onResetLocationFilters: () => void;
  totalLocationsCount: number;
  // Map Quick View Controls
  basemap: "esri-dark" | "esri-light" | "osm";
  onChangeBasemap: (basemap: "esri-dark" | "esri-light" | "osm") => void;
  activeLayer: "all" | "earthquake" | "stores" | "weather" | "flood";
  onLayerChange: (layer: "all" | "earthquake" | "stores" | "weather" | "flood") => void;
  mapTimeFilter: "24h" | "3d";
  onChangeMapTimeFilter: (filter: "24h" | "3d") => void;
  incidentOnly: boolean;
  onToggleIncidentOnly: () => void;
  showRadar: boolean;
  onToggleRadar: () => void;
  onResetView: () => void;
  theme?: "dark" | "light";
  onOpenFilterModal?: () => void;
  isMobileDetailOpen?: boolean;
}

export function MapToolbar({
  mapMode,
  onModeChange,
  latestEarthquake,
  activeEarthquakesCount,
  evaluatedLocationsCount,
  onOpenEvaluatedSheet,
  onOpenEarthquakeListModal,
  onFocusEpicenter,
  searchQuery,
  onSearchChange,
  facilityType,
  onFacilityTypeChange,
  facilityBranch,
  onFacilityBranchChange,
  facilityMapping,
  onFacilityMappingChange,
  branchOptions,
  onResetLocationFilters,
  totalLocationsCount,
  basemap,
  onChangeBasemap,
  activeLayer,
  onLayerChange,
  mapTimeFilter,
  onChangeMapTimeFilter,
  incidentOnly,
  onToggleIncidentOnly,
  showRadar,
  onToggleRadar,
  onResetView,
  theme = "light",
  onOpenFilterModal,
  isMobileDetailOpen = false,
}: MapToolbarProps) {
  const [isLayerPopoverOpen, setIsLayerPopoverOpen] = useState(false);
  const [isLegendPopoverOpen, setIsLegendPopoverOpen] = useState(false);
  const [isFloatingCardCollapsed, setIsFloatingCardCollapsed] = useState(false);

  const activeFiltersCount =
    (facilityType ? 1 : 0) + (facilityBranch ? 1 : 0) + (facilityMapping ? 1 : 0);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs z-20 flex flex-col shrink-0">
      {/* ROW 1: Mode Switcher & Primary Controls */}
      <div className="px-3 md:px-4 py-2 flex items-center justify-between gap-2 md:gap-3 flex-wrap">
        {/* Left: Mode Toggle (Kejadian vs Lokasi) */}
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase hidden lg:inline">
            Peta Monitoring
          </span>

          {/* Segmented Control for Map Mode */}
          <div
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5"
            aria-label="Mode Monitoring Peta"
          >
            <button
              type="button"
              aria-pressed={mapMode === "event"}
              onClick={() => onModeChange("event")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
                mapMode === "event"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Mode Kejadian</span>
            </button>
            <button
              type="button"
              aria-pressed={mapMode === "location"}
              onClick={() => onModeChange("location")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
                mapMode === "location"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Mode Lokasi</span>
            </button>
          </div>
        </div>

        {/* Right: Context Actions & Quick Map Utility Popovers */}
        <div className="flex items-center gap-1.5 md:gap-2 relative ml-auto">
          {/* Mode Lokasi: Primary Filter button on mobile */}
          {mapMode === "location" && (
            <button
              type="button"
              onClick={onOpenFilterModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[36px] shadow-xs"
              aria-label="Filter fasilitas"
            >
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Filter fasilitas</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] grid place-items-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {/* Mode Kejadian: Mobile shortcut to earthquake list */}
          {mapMode === "event" && (
            <button
              type="button"
              onClick={onOpenEarthquakeListModal}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[36px]"
              aria-label="Daftar Gempa"
            >
              <List className="w-3.5 h-3.5" />
              <span>Gempa ({activeEarthquakesCount})</span>
            </button>
          )}

          {/* Layer & Tampilan Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsLayerPopoverOpen(!isLayerPopoverOpen);
                setIsLegendPopoverOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors min-h-[36px] ${
                isLayerPopoverOpen
                  ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              aria-expanded={isLayerPopoverOpen}
              aria-haspopup="dialog"
              title="Pengaturan Layer & Tampilan"
            >
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Layer</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Popover Dropdown */}
            {isLayerPopoverOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-2xl z-[2000] text-xs space-y-3"
                role="dialog"
                aria-label="Pengaturan Layer dan Tampilan Peta"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <strong className="font-bold text-slate-900 dark:text-white">
                    Tampilan Peta
                  </strong>
                  <button
                    type="button"
                    onClick={() => setIsLayerPopoverOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Basemap Choice */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Basemap
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => onChangeBasemap("esri-dark")}
                      className={`py-1 rounded text-center font-medium ${
                        basemap === "esri-dark"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeBasemap("esri-light")}
                      className={`py-1 rounded text-center font-medium ${
                        basemap === "esri-light"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeBasemap("osm")}
                      className={`py-1 rounded text-center font-medium ${
                        basemap === "osm"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      OSM
                    </button>
                  </div>
                </div>

                {/* Layer Visibility */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Lapisan (Layer)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "all", label: "Semua Layer" },
                      { key: "earthquake", label: "Gempa Bumi" },
                      { key: "stores", label: "Toko & Fasilitas" },
                      { key: "flood", label: "Banjir / Cuaca" },
                    ].map((ly) => (
                      <button
                        key={ly.key}
                        type="button"
                        onClick={() => onLayerChange(ly.key as any)}
                        className={`px-2 py-1.5 rounded-md border text-left font-medium transition-colors ${
                          activeLayer === ly.key
                            ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300 font-bold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {ly.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Window (Mode Kejadian) */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Rentang Waktu Gempa
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => onChangeMapTimeFilter("24h")}
                      className={`py-1 rounded text-center font-medium ${
                        mapTimeFilter === "24h"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      24 Jam
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeMapTimeFilter("3d")}
                      className={`py-1 rounded text-center font-medium ${
                        mapTimeFilter === "3d"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      3 Hari
                    </button>
                  </div>
                </div>

                {/* Toggles: Krisis & Radar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onToggleIncidentOnly}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold ${
                      incidentOnly
                        ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/60 dark:border-red-800 dark:text-red-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>Hanya Kasus / Krisis</span>
                    <span className="text-[10px] uppercase font-bold">{incidentOnly ? "Aktif" : "Mati"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleRadar}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold ${
                      showRadar
                        ? "bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-950/60 dark:border-cyan-800 dark:text-cyan-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-cyan-600" />
                      Radar Cuaca (RainViewer)
                    </span>
                    <span className="text-[10px] uppercase font-bold">{showRadar ? "Aktif" : "Mati"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legenda Popover */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setIsLegendPopoverOpen(!isLegendPopoverOpen);
                setIsLayerPopoverOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors min-h-[36px] ${
                isLegendPopoverOpen
                  ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              aria-expanded={isLegendPopoverOpen}
              aria-haspopup="dialog"
            >
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Legenda</span>
            </button>

            {/* Popover Legend Menu */}
            {isLegendPopoverOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-2xl z-[2000] text-xs space-y-2.5"
                role="dialog"
                aria-label="Legenda Status Lokasi dan Gempa"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <strong className="font-bold text-slate-900 dark:text-white">
                    Legenda Status Operasional
                  </strong>
                  <button
                    type="button"
                    onClick={() => setIsLegendPopoverOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 dark:text-white font-semibold">
                        Dalam Radius Evaluasi
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Lokasi dalam radius gempa, belum diverifikasi fisik.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 dark:text-white font-semibold">
                        Menunggu Pemeriksaan
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Tiket dibuat, petugas belum kirim hasil cek fisik.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600 border border-red-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 dark:text-white font-semibold">
                        Kerusakan Terkonfirmasi
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Kerusakan fisik telah diverifikasi oleh petugas lapangan.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 dark:text-white font-semibold">
                        Dalam Penanganan
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        SPK/perbaikan aktif atau milestone berjalan.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 dark:text-white font-semibold">
                        Selesai / Normal
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Kondisi aman atau penanganan telah ditutup (CLOSED).
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reset Tampilan Button */}
          <button
            type="button"
            onClick={onResetView}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors min-h-[36px]"
            title="Reset tampilan peta ke seluruh Indonesia"
            aria-label="Reset Tampilan"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* ROW 2: CONTEXT BAR ACCORDING TO ACTIVE MODE */}
      {mapMode === "event" ? (
        <>
          {/* DESKTOP CONTEXT BAR FOR EVENT MODE */}
          <div className="hidden md:flex px-3 md:px-4 py-2 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200/80 dark:border-slate-800 items-center justify-between gap-3 flex-wrap text-xs">
            {latestEarthquake ? (
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800 shrink-0">
                  <Radio className="w-3 h-3 text-red-600 animate-ping" />
                  {latestEarthquake.source || "BMKG"} LIVE
                </span>

                <span className="font-bold text-slate-900 dark:text-white truncate max-w-sm lg:max-w-xl">
                  M {latestEarthquake.magnitude} — {latestEarthquake.title || latestEarthquake.place}
                </span>

                <span className="text-slate-500 font-mono hidden lg:inline">
                  Kedalaman: {latestEarthquake.depth} • {latestEarthquake.time}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Tidak ada gempa darurat baru dalam periode pemantauan aktif.</span>
              </div>
            )}

            {/* Action Pills */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-wrap">
              {evaluatedLocationsCount > 0 ? (
                <button
                  type="button"
                  onClick={onOpenEvaluatedSheet}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors min-h-[32px]"
                  title="Buka daftar toko/fasilitas yang berada dalam radius gempa"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Dalam Radius Evaluasi ({evaluatedLocationsCount})</span>
                </button>
              ) : (
                <span className="px-2 py-1 rounded-md text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 hidden sm:inline">
                  ✓ Seluruh Toko di Luar Radius Evaluasi
                </span>
              )}

              <button
                type="button"
                onClick={onOpenEarthquakeListModal}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-colors min-h-[32px]"
                title="Lihat daftar gempa yang tercatat di sistem"
              >
                <List className="w-3.5 h-3.5" />
                <span>Daftar Gempa ({activeEarthquakesCount})</span>
              </button>

              {latestEarthquake && (
                <button
                  type="button"
                  onClick={onFocusEpicenter}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors min-h-[32px]"
                  title="Fokuskan peta ke episentrum gempa"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>Lihat Episentrum</span>
                </button>
              )}
            </div>
          </div>

          {/* MOBILE FLOATING CONTEXT CARD FOR EVENT MODE (Only shown when not obstructed by bottom detail sheet) */}
          {latestEarthquake && !isMobileDetailOpen && (
            <div className="md:hidden fixed bottom-20 left-3 right-3 sm:left-4 sm:right-auto sm:w-[380px] z-[400] pointer-events-auto transition-all duration-200">
              {isFloatingCardCollapsed ? (
                /* Collapsed Pill */
                <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl rounded-full px-3.5 py-2 flex items-center justify-between text-xs backdrop-blur-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      M {latestEarthquake.magnitude} • {latestEarthquake.place || latestEarthquake.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFloatingCardCollapsed(false)}
                    className="text-blue-600 dark:text-blue-400 font-bold text-[11px] shrink-0 ml-2 px-2 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  >
                    Buka Panel
                  </button>
                </div>
              ) : (
                /* Expanded Floating Card */
                <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-3 text-xs backdrop-blur-md space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
                      <strong className="text-slate-900 dark:text-white font-bold truncate">
                        M {latestEarthquake.magnitude} — {latestEarthquake.title || latestEarthquake.place}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFloatingCardCollapsed(true)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                      aria-label="Sembunyikan panel"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono">
                    Kedalaman: {latestEarthquake.depth} • {latestEarthquake.time}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    {evaluatedLocationsCount > 0 ? (
                      <button
                        type="button"
                        onClick={onOpenEvaluatedSheet}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs min-h-[38px]"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Radius Evaluasi ({evaluatedLocationsCount})</span>
                      </button>
                    ) : (
                      <div className="flex-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        ✓ Luar radius evaluasi
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={onFocusEpicenter}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs min-h-[38px]"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500 inline mr-1" />
                      <span>Episentrum</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* MODE LOKASI CONTEXT BAR */
        <div className="px-3 md:px-4 py-2 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 md:gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[240px]">
            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari kode atau nama lokasi..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs min-h-[36px] md:min-h-[32px] focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Desktop-only Direct Dropdown Selectors */}
            <select
              value={facilityType}
              onChange={(e) => onFacilityTypeChange(e.target.value)}
              className="hidden md:inline-flex py-1 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs min-h-[32px]"
            >
              <option value="">Semua Kategori (Toko & Fasilitas)</option>
              <option value="STORE">Hanya Toko Alfamart</option>
              <option value="DC">DC (Distribution Center)</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="DEPO">Depo</option>
              <option value="BULKY">Bulky</option>
              <option value="STORE_HUB">Store Hub</option>
            </select>

            <select
              value={facilityBranch}
              onChange={(e) => onFacilityBranchChange(e.target.value)}
              className="hidden md:inline-flex py-1 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs min-h-[32px]"
            >
              <option value="">Semua Cabang</option>
              {branchOptions.map((br) => (
                <option key={br} value={br}>
                  Cabang {br}
                </option>
              ))}
            </select>

            <select
              value={facilityMapping}
              onChange={(e) => onFacilityMappingChange(e.target.value)}
              className="hidden md:inline-flex py-1 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs min-h-[32px]"
            >
              <option value="">Status Mapping</option>
              <option value="mapped">Terpetakan ke Cabang</option>
              <option value="unmapped">Belum Dipetakan</option>
            </select>

            {/* Reset Filters */}
            {(searchQuery || facilityType || facilityBranch || facilityMapping) && (
              <button
                type="button"
                onClick={onResetLocationFilters}
                className="px-2 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono shrink-0 hidden sm:block">
            {totalLocationsCount} lokasi termuat
          </div>
        </div>
      )}
    </div>
  );
}
