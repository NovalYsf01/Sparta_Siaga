"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Popup,
  Circle,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import { Store } from "@/types/store";
import { Earthquake } from "@/types/disaster";
import {
  AlertTriangle,
  Building,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface MapInnerProps {
  stores: Store[];
  earthquakes: Earthquake[];
  basemap: "esri-dark" | "esri-light" | "osm";
  incidentOnly: boolean;
  statusFilter: "all" | "danger" | "warning" | "safe";
  selectedStore: Store | null;
  onSelectStore: (store: Store) => void;
  flyToTarget: { lat: number; lng: number; zoom?: number } | null;
  showRadar?: boolean;
  radarTileUrl?: string;
  activeLayer?: "all" | "earthquake" | "stores" | "weather" | "flood";
  floodReports?: any[];
}

// Controller component to smoothly fly to coordinates when requested
function MapFlyController({
  target,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 13, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [target, map]);

  return null;
}

// Component to track map zoom level for dynamic LOD (Level of Detail)
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

// Function to generate dynamic Alfamart store markers using L.divIcon
function createStoreIcon(store: Store, isSelected: boolean = false) {
  const isDanger = store.status === "danger";
  const isWarning = store.status === "warning";
  const isFlood = !!store.floodWarning;

  let ringColor = "border-emerald-500 shadow-emerald-500/20";
  let pulseClass = "";
  let badgeColor = "bg-emerald-600";

  if (isSelected) {
    ringColor = "border-cyan-400 shadow-cyan-400/80 scale-125";
    pulseClass = "pulse-beacon";
    badgeColor = isDanger ? "bg-red-600" : isWarning ? "bg-amber-500" : "bg-cyan-500";
  } else if (isDanger) {
    ringColor = "border-red-600 shadow-red-600/50";
    pulseClass = "pulse-beacon";
    badgeColor = "bg-red-600";
  } else if (isWarning) {
    ringColor = "border-amber-500 shadow-amber-500/30";
    badgeColor = "bg-amber-500";
  } else if (isFlood) {
    ringColor = "border-blue-500 shadow-blue-500/40";
    pulseClass = "pulse-beacon";
    badgeColor = "bg-blue-600";
  }

  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center">
      ${isSelected
      ? `<div class="absolute -inset-3 bg-cyan-400/50 rounded-full animate-ping"></div>`
      : isDanger
        ? `<div class="absolute -inset-2 bg-red-600/40 rounded-full animate-ping"></div>`
        : isFlood
          ? `<div class="absolute -inset-2 bg-blue-500/40 rounded-full animate-ping"></div>`
          : ""
    }
      <div class="w-8 h-8 rounded-full bg-slate-900 border-2 ${ringColor} ${pulseClass} flex items-center justify-center shadow-lg transition-transform hover:scale-125 z-20">
        <div class="w-5 h-5 rounded-full ${isSelected && !isDanger && !isWarning
      ? "bg-cyan-500"
      : isDanger
        ? "bg-red-600"
        : isWarning
          ? "bg-amber-500"
          : isFlood
            ? "bg-blue-600"
            : "bg-red-600"
    } flex items-center justify-center text-[9px] font-black text-white tracking-tighter">
          A
        </div>
      </div>
      <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${badgeColor} border border-slate-900 z-30"></div>
      ${isFlood
      ? `<div class="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-blue-600 border border-slate-900 text-[8px] flex items-center justify-center shadow-md z-30" title="Peringatan Banjir / Hujan Lebat">💧</div>`
      : ""
    }
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-store-pin",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

// Function to generate dynamic epicenter earthquake marker
function createEpicenterIcon(earthquake: Earthquake) {
  const isTsunami = earthquake.potensiTsunami;
  const isHigh = earthquake.magnitude >= 6.0;

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer">
      <div class="absolute -inset-4 bg-red-600/30 rounded-full animate-ping"></div>
      <div class="absolute -inset-2 bg-red-500/50 rounded-full animate-pulse"></div>
      <div class="relative w-9 h-9 rounded-full ${isTsunami ? "bg-red-700" : isHigh ? "bg-red-600" : "bg-amber-600"
    } border-2 border-white shadow-2xl flex items-center justify-center text-white">
        <span class="text-[10px] font-black font-mono">M${earthquake.magnitude}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-disaster-pin",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

interface BranchAggregation {
  cabang: string;
  latitude: number;
  longitude: number;
  totalStores: number;
  dangerCount: number;
  warningCount: number;
}

function createBranchIcon(branch: BranchAggregation) {
  const hasDanger = branch.dangerCount > 0;
  const hasWarning = branch.warningCount > 0;

  const badgeBg = hasDanger
    ? "bg-red-600 border-red-300 ring-4 ring-red-500/30"
    : hasWarning
      ? "bg-amber-600 border-amber-300 ring-4 ring-amber-500/20"
      : "bg-slate-900 border-cyan-400/80 shadow-cyan-500/20";

  const dotColor = hasDanger ? "bg-white animate-ping" : hasWarning ? "bg-white" : "bg-cyan-400";

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group select-none">
      ${hasDanger ? '<div class="absolute -inset-3 bg-red-600/40 rounded-full animate-ping"></div>' : ''}
      <div class="px-3 py-1 rounded-full ${badgeBg} border-2 text-white shadow-2xl flex items-center gap-2 font-bold text-xs whitespace-nowrap transition-transform duration-200 group-hover:scale-110">
        <span class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0"></span>
        <span class="tracking-tight text-[11px] font-semibold">${branch.cabang}</span>
        <span class="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono font-bold">${branch.totalStores} Toko</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-branch-marker",
    iconSize: [140, 32],
    iconAnchor: [70, 16],
    popupAnchor: [0, -18],
  });
}

export default function MapInner({
  stores,
  earthquakes,
  basemap,
  incidentOnly,
  statusFilter,
  selectedStore,
  onSelectStore,
  flyToTarget,
  showRadar = false,
  radarTileUrl,
  activeLayer = "all",
  floodReports = [],
}: MapInnerProps) {
  const [currentZoom, setCurrentZoom] = useState(5);

  const showEarthquakes = activeLayer === "all" || activeLayer === "earthquake";
  const showStoresLayer = activeLayer === "all" || activeLayer === "stores";

  // Requirement: Radar is only visible when specifically enabled and zoomed in to prevent global watermark clutter.
  const isRadarEnabled = showRadar || activeLayer === "weather";
  const showWeatherLayer = isRadarEnabled;

  // Group stores into branch aggregations for Zoom <= 7 (Titik Percabang)
  const branchAggregations = useMemo(() => {
    const map = new Map<
      string,
      {
        cabang: string;
        sumLat: number;
        sumLng: number;
        count: number;
        dangerCount: number;
        warningCount: number;
      }
    >();

    for (const store of stores) {
      const branchName = store.cabang || "Lainnya";
      const existing = map.get(branchName);
      const isDanger = store.status === "danger";
      const isWarning = store.status === "warning";

      if (!existing) {
        map.set(branchName, {
          cabang: branchName,
          sumLat: store.latitude,
          sumLng: store.longitude,
          count: 1,
          dangerCount: isDanger ? 1 : 0,
          warningCount: isWarning ? 1 : 0,
        });
      } else {
        existing.sumLat += store.latitude;
        existing.sumLng += store.longitude;
        existing.count += 1;
        if (isDanger) existing.dangerCount += 1;
        if (isWarning) existing.warningCount += 1;
      }
    }

    const result: BranchAggregation[] = [];
    map.forEach((item) => {
      if (item.count > 0) {
        // If incidentOnly is ON, hide branches that have zero affected stores
        if (incidentOnly && item.dangerCount === 0 && item.warningCount === 0) {
          return;
        }

        result.push({
          cabang: item.cabang,
          latitude: item.sumLat / item.count,
          longitude: item.sumLng / item.count,
          totalStores: incidentOnly ? item.dangerCount + item.warningCount : item.count,
          dangerCount: item.dangerCount,
          warningCount: item.warningCount,
        });
      }
    });

    return result;
  }, [stores, incidentOnly]);

  // Partition stores into high-priority affected (danger & warning) and safe stores
  const { affectedStores, safeStores } = useMemo(() => {
    const affected: Store[] = [];
    const safe: Store[] = [];

    for (const store of stores) {
      if (store.status === "danger" || store.status === "warning") {
        if (statusFilter === "all" || store.status === statusFilter) {
          affected.push(store);
        }
      } else {
        if (!incidentOnly && (statusFilter === "all" || statusFilter === "safe")) {
          safe.push(store);
        }
      }
    }

    return { affectedStores: affected, safeStores: safe };
  }, [stores, incidentOnly, statusFilter]);

  // 100% Watermark-Free Tile URL Mapping (ESRI World Gray Canvas & OpenStreetMap)
  const tileUrl = useMemo(() => {
    if (basemap === "esri-dark") {
      return "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
    }
    if (basemap === "esri-light") {
      return "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
    }
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }, [basemap]);

  const tileAttribution = useMemo(() => {
    if (basemap === "osm") {
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
    return 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
  }, [basemap]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[-2.5, 118.0]}
        zoom={5}
        minZoom={4}
        maxZoom={18}
        scrollWheelZoom={true}
        zoomControl={false} // Disabled default to prevent overlap with top-left controls
        className="w-full h-full z-0"
        preferCanvas={true} // Enable HTML5 Canvas rendering for high-performance markers
      >
        {/* Clean, Watermark-Free Basemap Layer */}
        <TileLayer key={tileUrl} url={tileUrl} attribution={tileAttribution} />

        {/* Live RainViewer Doppler Weather Radar Layer */}
        {showWeatherLayer && radarTileUrl && (
          <TileLayer
            key={radarTileUrl}
            url={radarTileUrl}
            opacity={0.65}
            zIndex={350}
          />
        )}

        {/* Position Zoom Controls safely at bottom-right corner */}
        <ZoomControl position="bottomright" />

        <MapFlyController target={flyToTarget} />
        <ZoomTracker onZoomChange={setCurrentZoom} />

        {/* 1. DISASTER EPICENTERS & SCIENTIFIC RADIUS CIRCLES */}
        {showEarthquakes &&
          earthquakes.map((eq) => {
            const dangerRadius = eq.dangerRadiusKm || 50;
            const warningRadius = eq.warningRadiusKm || 110;

            return (
              <React.Fragment key={eq.id}>
                {/* Primary Danger Radius Circle (MMI >= VI) */}
                <Circle
                  center={[eq.latitude, eq.longitude]}
                  radius={dangerRadius * 1000} // meters
                  pathOptions={{
                    color: "#dc2626",
                    fillColor: "#dc2626",
                    fillOpacity: 0.16,
                    weight: 2,
                    dashArray: "6, 6",
                  }}
                />

                {/* Secondary Warning Radius Circle (MMI IV - V) */}
                <Circle
                  center={[eq.latitude, eq.longitude]}
                  radius={warningRadius * 1000} // meters
                  pathOptions={{
                    color: "#f59e0b",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.05,
                    weight: 1.5,
                    dashArray: "4, 8",
                  }}
                />

                {/* Epicenter Marker */}
                <Marker
                  position={[eq.latitude, eq.longitude]}
                  icon={createEpicenterIcon(eq)}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl w-68 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-red-400">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <span>Pusat Gempa ({eq.source})</span>
                      </div>

                      <p className="font-semibold text-white leading-snug">
                        {eq.title}
                      </p>

                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                        <div>
                          <span className="text-slate-500">Magnitudo:</span>{" "}
                          <strong className="text-white">M {eq.magnitude}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Kedalaman:</span>{" "}
                          <strong className="text-white">{eq.depth}</strong>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[10px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-red-400 font-bold">Radius Bahaya (MMI ≥ VI):</span>
                          <span className="font-mono text-white font-bold">{dangerRadius} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-400 font-bold">Radius Waspada (MMI IV-V):</span>
                          <span className="font-mono text-white font-bold">{warningRadius} km</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400">
                        Waktu: {eq.time}
                      </div>

                      {eq.potensiText && (
                        <div
                          className={`p-1.5 rounded text-[10px] font-bold ${eq.potensiTsunami
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-slate-800 text-slate-300"
                            }`}
                        >
                          {eq.potensiText}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* 2. STORES LAYER (Titik Percabang on Zoom <= 7, Individual stores on Zoom >= 8) */}
        {showStoresLayer && (
          <>
            {/* LEVEL NASIONAL/PROVINSI (Zoom <= 7): Hanya muncul Titik Percabang (Kantor Cabang / DC) */}
            {currentZoom <= 7 &&
              branchAggregations.map((branch) => (
                <Marker
                  key={branch.cabang}
                  position={[branch.latitude, branch.longitude]}
                  icon={createBranchIcon(branch)}
                  eventHandlers={{
                    click: (e) => {
                      e.target._map?.flyTo([branch.latitude, branch.longitude], 10, {
                        duration: 1.2,
                      });
                    },
                  }}
                >
                  <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                    <div className="text-xs font-semibold text-slate-900 px-1">
                      Klik untuk fokus ke {branch.cabang} ({branch.totalStores} Toko)
                    </div>
                  </Tooltip>
                </Marker>
              ))}

            {/* LEVEL KOTA/KECAMATAN (Zoom >= 8): Muncul titik-titik toko riil */}
            {currentZoom > 7 &&
              !incidentOnly &&
              safeStores.map((store) => (
                <CircleMarker
                  key={store.id}
                  center={[store.latitude, store.longitude]}
                  radius={currentZoom >= 13 ? 6 : currentZoom >= 10 ? 4 : 3}
                  pathOptions={{
                    color: "#059669",
                    fillColor: "#10b981",
                    fillOpacity: 0.75,
                    weight: 1,
                  }}
                  eventHandlers={{
                    click: () => onSelectStore(store),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                    <div className="text-[11px] font-medium text-slate-900 px-1">
                      <span className="font-bold text-red-600">[{store.kode_toko}]</span>{" "}
                      {store.nama_toko} ({store.cabang})
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
          </>
        )}

        {/* 3. AFFECTED STORES (Selalu Menyala & Berdenyut di SEMUA Level Zoom!) */}
        {showStoresLayer && activeLayer !== "flood" && affectedStores.map((store) => {
          const isDanger = store.status === "danger";
          const isSelected = store.id === selectedStore?.id;

          return (
            <Marker
              key={store.id}
              position={[store.latitude, store.longitude]}
              icon={createStoreIcon(store, isSelected)}
              eventHandlers={{
                click: () => onSelectStore(store),
              }}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                <div className="text-xs font-semibold text-slate-900 px-1 py-0.5">
                  <span className="font-bold text-red-600">[{store.kode_toko}]</span>{" "}
                  {store.nama_toko}
                  {store.distanceFromDisasterKm !== undefined && (
                    <span className="ml-1 text-slate-600">
                      ({store.distanceFromDisasterKm} km)
                    </span>
                  )}
                </div>
              </Tooltip>

              <Popup className="custom-leaflet-popup">
                <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl w-68 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600/20 text-red-400">
                      {store.kode_toko}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDanger
                          ? "bg-red-600 text-white animate-pulse"
                          : "bg-amber-600 text-white"
                        }`}
                    >
                      {isDanger ? "Zona Bahaya" : "Zona Waspada"}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm leading-snug">
                    {store.nama_toko}
                  </h3>

                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-500" />
                    <span>Cabang {store.cabang}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-medium">
                      {store.fr_type === "F" ? "Franchise" : "Reguler"}
                    </span>
                  </div>

                  {store.distanceFromDisasterKm !== undefined && (
                    <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
                      Jarak dari episentrum:{" "}
                      <strong className="text-red-400">
                        {store.distanceFromDisasterKm} km
                      </strong>
                    </div>
                  )}

                  {store.floodWarning && (
                    <div className="p-1.5 rounded bg-blue-950/80 border border-blue-600/60 text-[10px] text-blue-200 flex items-center gap-1.5">
                      <span className="text-xs shrink-0">🌧️</span>
                      <div className="leading-tight">
                        <span className="font-bold text-blue-300">Waspada Potensi Banjir</span>
                        {store.rainIntensityMm && (
                          <span className="block text-slate-300 text-[9px]">
                            Curah Hujan: {store.rainIntensityMm} mm/jam
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectStore(store)}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Detail & Eskalasi Cabang</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* RENDER FLOOD REPORTS */}
        {(activeLayer === "all" || activeLayer === "weather" || activeLayer === "flood") &&
          floodReports?.map((report) => {
            const floodIcon = L.divIcon({
              className: "custom-div-icon",
              html: `
                <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg z-50 pulse-beacon">
                  <span class="text-[10px]">🌊</span>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });

            return (
              <React.Fragment key={report.id}>
                {/* Flood radius circle (e.g., 2km warning zone) */}
                <Circle
                  center={[report.lat, report.lng]}
                  radius={2000}
                  pathOptions={{
                    color: "#3b82f6",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: "4, 4",
                  }}
                />
                <Marker position={[report.lat, report.lng]} icon={floodIcon}>
                  <Popup className="custom-leaflet-popup">
                    <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl w-68 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                          PB-{report.id.substring(0, 4).toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white animate-pulse">
                          Zona Genangan
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm leading-snug">
                        {report.title}
                      </h3>

                      <div className="p-1.5 rounded bg-blue-950/80 border border-blue-600/60 text-[11px] text-blue-200">
                        <span className="block mb-0.5 opacity-80">Estimasi Ketinggian Air:</span>
                        <strong className="text-red-400 text-sm">{report.depth} cm</strong>
                      </div>

                      <div className="text-[10px] text-slate-400">
                        Waktu Update: {new Date(report.timestamp).toLocaleTimeString("id-ID")}
                      </div>

                      <button
                        onClick={() => {
                          // Try to fly to it
                          const map = document.querySelector('.leaflet-container');
                          if (map) (map as any)._leaflet_map?.flyTo([report.lat, report.lng], 15);
                        }}
                        className="w-full mt-2 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>Fokus ke Area Genangan</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {/* 4. EXPLICIT SELECTED STORE PIN (Always visible even in Crisis Focus Mode!) */}
        {selectedStore &&
          !affectedStores.some((s) => s.id === selectedStore.id) &&
          !safeStores.some((s) => s.id === selectedStore.id) && (
            <Marker
              key={`selected-${selectedStore.id}`}
              position={[selectedStore.latitude, selectedStore.longitude]}
              icon={createStoreIcon(selectedStore, true)}
              eventHandlers={{
                click: () => onSelectStore(selectedStore),
              }}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={0.98} permanent>
                <div className="text-xs font-bold text-slate-900 px-1.5 py-0.5 flex items-center gap-1.5">
                  <span className="text-cyan-600 font-extrabold">🎯 [{selectedStore.kode_toko}]</span>
                  <span>{selectedStore.nama_toko}</span>
                  <span className="text-slate-500 font-normal">({selectedStore.cabang})</span>
                </div>
              </Tooltip>

              <Popup className="custom-leaflet-popup">
                <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl w-68 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                      {selectedStore.kode_toko}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-300">
                      Operasional Aman
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm leading-snug">
                    {selectedStore.nama_toko}
                  </h3>

                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-500" />
                    <span>Cabang {selectedStore.cabang}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-medium">
                      {selectedStore.fr_type === "F" ? "Franchise" : "Reguler"}
                    </span>
                  </div>

                  {selectedStore.floodWarning && (
                    <div className="p-1.5 rounded bg-blue-950/80 border border-blue-600/60 text-[10px] text-blue-200 flex items-center gap-1.5">
                      <span className="text-xs shrink-0">🌧️</span>
                      <div className="leading-tight">
                        <span className="font-bold text-blue-300">Waspada Potensi Banjir</span>
                        {selectedStore.rainIntensityMm && (
                          <span className="block text-slate-300 text-[9px]">
                            Curah Hujan: {selectedStore.rainIntensityMm} mm/jam
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectStore(selectedStore)}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Buka Detail Gerai</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Popup>
            </Marker>
          )}
      </MapContainer>
    </div>
  );
}
