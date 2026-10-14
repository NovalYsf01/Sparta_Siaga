"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Filter, Loader2, X } from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
import { DisasterAlertBar } from "@/components/disaster/disaster-alert-bar";
import { MapControls } from "@/components/map/map-controls";
import type { Store } from "@/types/store";

type MapMode = "event" | "location";

type MapFacility = {
  id: string;
  code: string;
  name: string;
  facility_type: string;
  latitude: number;
  longitude: number;
  branch_id: string | null;
  operational_status: string;
  auto_report_enabled: boolean;
  mapping_verified_at: string | null;
};

const MapView = dynamic(
  () => import("@/components/map/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-900 animate-pulse flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
        <span className="text-slate-400 font-medium">
          Memuat SPARTA Geospatial Engine...
        </span>
      </div>
    ),
  }
);

export default function MonitoringPage() {
  const [mapMode, setMapMode] = useState<MapMode>("event");
  const [facilities, setFacilities] = useState<MapFacility[]>([]);
  const [facilityType, setFacilityType] = useState("");
  const [facilityBranch, setFacilityBranch] = useState("");
  const [facilityStatus, setFacilityStatus] = useState("");
  const [facilityMapping, setFacilityMapping] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<MapFacility | null>(null);
  const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const {
    computedStores,
    disasterData,
    basemap,
    setBasemap,
    incidentOnly,
    setIncidentOnly,
    statusFilter,
    selectedStore,
    handleSelectStore,
    flyToTarget,
    showRadar,
    setShowRadar,
    radarData,
    activeLayer,
    setActiveLayer,
    dangerCount,
    warningCount,
    handleResetView,
    handleFocusDisaster,
    setIsAffectedSheetOpen,
    theme,
    mapTimeFilter,
    setMapTimeFilter,
    selectedEarthquake,
    clearEventFocus,
  } = useSiaga();

  useEffect(() => {
    if (mapMode !== "location") return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (facilityType) params.set("type", facilityType);
    if (facilityBranch) params.set("branch", facilityBranch);
    if (facilityStatus) params.set("status", facilityStatus);
    if (facilityMapping) params.set("mapping", facilityMapping);
    if (viewport) Object.entries(viewport).forEach(([key, value]) => params.set(key, String(value)));
    fetch(`/api/locations/facilities?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Gagal memuat fasilitas");
        setFacilities(payload.data);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") setFacilities([]);
      });
    return () => controller.abort();
  }, [facilityBranch, facilityMapping, facilityStatus, facilityType, mapMode, viewport]);

  const locationModeStores = useMemo<Store[]>(() => facilities.map((facility) => ({
    id: `FACILITY:${facility.id}`,
    kode_toko: facility.code,
    nama_toko: facility.name,
    cabang: facility.branch_id || "Belum dipetakan",
    alamat: facility.mapping_verified_at ? "Mapping cabang terverifikasi" : "Mapping cabang perlu dilengkapi",
    latitude: Number(facility.latitude),
    longitude: Number(facility.longitude),
    fr_type: `FACILITY_${facility.facility_type}`,
    status: "SAFE",
    spatialRisk: "SAFE",
    operationalStatus: facility.operational_status === "ACTIVE" ? "NONE" : "RESOLVED",
    visualStatus: "NORMAL",
  })), [facilities]);

  const displayedLocations = mapMode === "location"
    ? [...computedStores, ...locationModeStores]
    : computedStores;
  const facilityByStoreId = useMemo(() => new Map(facilities.map((facility) => [`FACILITY:${facility.id}`, facility])), [facilities]);
  const branchOptions = useMemo(() => [...new Set(facilities.map((facility) => facility.branch_id).filter(Boolean))] as string[], [facilities]);

  // Requirement 2 & 3: Active operational earthquakes filtered strictly by active window (24h or 72h max)
  const activeQuakes = useMemo(() => {
    const allActive = disasterData?.activeEarthquakes || [];
    const maxHours = mapTimeFilter === "24h" ? 24 : 72;
    const maxAgeMs = maxHours * 60 * 60 * 1000;
    const now = Date.now();
    return allActive.filter((eq) => now - eq.timestamp <= maxAgeMs);
  }, [disasterData, mapTimeFilter]);

  // Requirement 7: In Event Focus Mode, render focused event
  const mapEarthquakes = useMemo(() => {
    if (selectedEarthquake) {
      return [selectedEarthquake];
    }
    return activeQuakes;
  }, [selectedEarthquake, activeQuakes]);

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      {/* Top Disaster Alert Bar */}
      <DisasterAlertBar
        earthquakes={
          activeQuakes.length > 0
            ? activeQuakes
            : disasterData?.latestBmkgEarthquake
            ? [disasterData.latestBmkgEarthquake]
            : []
        }
        latestEarthquake={selectedEarthquake || disasterData?.latestBmkgEarthquake}
        affectedCount={dangerCount}
        onOpenAffectedSheet={() => setIsAffectedSheetOpen(true)}
        onFocusDisaster={handleFocusDisaster}
        theme={theme}
      />

      <div className="flex-1 relative w-full h-full overflow-hidden">
        <div className="absolute left-3 top-3 z-[1000] flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label="Mode peta">
          <button type="button" onClick={() => setMapMode("event")} aria-pressed={mapMode === "event"}
            className={`min-h-11 rounded-md px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-blue-600 ${mapMode === "event" ? "bg-blue-700 text-white" : "text-slate-700 dark:text-slate-200"}`}>
            Mode Kejadian
          </button>
          <button type="button" onClick={() => setMapMode("location")} aria-pressed={mapMode === "location"}
            className={`min-h-11 rounded-md px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-blue-600 ${mapMode === "location" ? "bg-blue-700 text-white" : "text-slate-700 dark:text-slate-200"}`}>
            Mode Lokasi
          </button>
        </div>
        {mapMode === "location" && <button onClick={() => setFilterOpen(true)} className="absolute left-3 top-16 z-[1000] sparta-button bg-white"><Filter />Filter fasilitas</button>}
        {/* Map Area (Full Viewport) */}
        <div className="w-full h-full relative z-0">
          <MapView
            stores={displayedLocations}
            earthquakes={mapMode === "event" ? mapEarthquakes : []}
            floodReports={disasterData?.floodReports || []}
            basemap={basemap}
            incidentOnly={incidentOnly}
            statusFilter={statusFilter}
            selectedStore={selectedStore}
            onSelectStore={(store) => {
              const facility = facilityByStoreId.get(store.id);
              if (facility) setSelectedFacility(facility); else handleSelectStore(store);
            }}
            flyToTarget={flyToTarget}
            showRadar={showRadar}
            radarTileUrl={radarData?.tileUrl}
            activeLayer={activeLayer}
            theme={theme}
            onViewportChange={setViewport}
          />
          
          {/* Compact Map Controls inside Map */}
          <MapControls
            latestEarthquake={selectedEarthquake || disasterData?.latestBmkgEarthquake}
            incidentOnly={incidentOnly}
            onToggleIncidentOnly={() => setIncidentOnly((prev) => !prev)}
            basemap={basemap}
            onChangeBasemap={(b) => setBasemap(b)}
            onResetView={handleResetView}
            totalStoresCount={displayedLocations.length}
            affectedStoresCount={dangerCount + warningCount}
            showRadar={showRadar}
            onToggleRadar={() => setShowRadar((prev) => !prev)}
            radarTimeString={radarData?.timeFormatted}
            theme={theme}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            mapTimeFilter={mapTimeFilter}
            onChangeMapTimeFilter={setMapTimeFilter}
            selectedEarthquake={selectedEarthquake}
            onClearEventFocus={clearEventFocus}
          />
        </div>

      </div>
      {filterOpen && <div className="fixed inset-0 z-[3000] flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="facility-filter-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}><div className="w-full rounded-t-2xl bg-white p-4 text-slate-900 shadow-2xl sm:max-w-md sm:rounded-xl"><div className="flex items-center justify-between"><h2 id="facility-filter-title" className="font-bold">Filter fasilitas</h2><button onClick={() => setFilterOpen(false)} className="touch-target-min grid place-items-center" aria-label="Tutup"><X className="h-5 w-5" /></button></div><div className="mt-4 grid gap-3"><select value={facilityType} onChange={(event) => setFacilityType(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3"><option value="">Semua kategori</option><option value="DC">DC</option><option value="WAREHOUSE">Warehouse</option><option value="DEPO">Depo</option><option value="BULKY">Bulky</option><option value="STORE_HUB">Store Hub</option></select><select value={facilityBranch} onChange={(event) => setFacilityBranch(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3"><option value="">Semua cabang</option>{branchOptions.map((branch) => <option key={branch}>{branch}</option>)}</select><select value={facilityStatus} onChange={(event) => setFacilityStatus(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3"><option value="">Semua status</option><option value="ACTIVE">Aktif</option><option value="INACTIVE">Tidak aktif</option></select><select value={facilityMapping} onChange={(event) => setFacilityMapping(event.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3"><option value="">Semua mapping</option><option value="mapped">Terpetakan</option><option value="unmapped">Belum terpetakan</option></select><div className="grid grid-cols-2 gap-2"><button className="sparta-button" onClick={() => { setFacilityType(""); setFacilityBranch(""); setFacilityStatus(""); setFacilityMapping(""); }}>Reset</button><button className="sparta-button primary" onClick={() => setFilterOpen(false)}>Terapkan</button></div></div></div></div>}
      {selectedFacility && <div className="fixed inset-x-0 bottom-16 z-[2500] p-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96"><section className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Detail fasilitas</p><h2 className="mt-1 font-bold">{selectedFacility.name}</h2><p className="text-xs text-slate-500">{selectedFacility.code} · {selectedFacility.facility_type.replace("_", " ")}</p></div><button onClick={() => setSelectedFacility(null)} className="touch-target-min grid place-items-center" aria-label="Tutup detail"><X className="h-5 w-5" /></button></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Cabang</dt><dd className="mt-1 font-semibold">{selectedFacility.branch_id || "Belum dipetakan"}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-semibold">{selectedFacility.operational_status}</dd></div><div><dt className="text-slate-500">Mapping</dt><dd className="mt-1 font-semibold">{selectedFacility.mapping_verified_at ? "Terverifikasi" : "Perlu verifikasi"}</dd></div><div><dt className="text-slate-500">Auto-report</dt><dd className="mt-1 font-semibold">{selectedFacility.auto_report_enabled ? "Aktif" : "Nonaktif"}</dd></div></dl></section></div>}
    </div>
  );
}
