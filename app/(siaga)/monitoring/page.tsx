"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Filter, Loader2, X } from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
import { MapToolbar, type MapMode } from "@/components/map/map-toolbar";
import { LocationDetailPanel, type FacilityDetail } from "@/components/map/location-detail-panel";
import { EarthquakeListModal } from "@/components/disaster/earthquake-list-modal";
import { assessStoreRisk } from "@/lib/haversine";
import type { Store } from "@/types/store";

const MapView = dynamic(
  () => import("@/components/map/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-900 animate-pulse flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <span className="text-slate-500 font-medium text-xs">
          Memuat SPARTA Geospatial Engine...
        </span>
      </div>
    ),
  }
);

export default function MonitoringPage() {
  // Mode Kejadian is the strict default mode
  const [mapMode, setMapMode] = useState<MapMode>("event");
  const [facilities, setFacilities] = useState<FacilityDetail[]>([]);
  const [facilityType, setFacilityType] = useState("");
  const [facilityBranch, setFacilityBranch] = useState("");
  const [facilityStatus, setFacilityStatus] = useState("");
  const [facilityMapping, setFacilityMapping] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<FacilityDetail | null>(null);
  const [isEarthquakeModalOpen, setIsEarthquakeModalOpen] = useState(false);
  const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // Detect mobile screen for responsive side-panel vs bottom-sheet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Stabilized viewport callback with threshold check to prevent infinite re-render cycles
  const handleViewportChange = useCallback(
    (next: { north: number; south: number; east: number; west: number }) => {
      setViewport((prev) => {
        if (!prev) return next;
        const diff = Math.max(
          Math.abs(prev.north - next.north),
          Math.abs(prev.south - next.south),
          Math.abs(prev.east - next.east),
          Math.abs(prev.west - next.west)
        );
        if (diff < 0.05) return prev;
        return next;
      });
    },
    []
  );

  // Fetch facilities for both Event Mode (evaluated alongside stores) and Location Mode
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (mapMode === "location") {
      if (facilityType && facilityType !== "STORE") params.set("type", facilityType);
      if (facilityBranch) params.set("branch", facilityBranch);
      if (facilityStatus) params.set("status", facilityStatus);
      if (facilityMapping) params.set("mapping", facilityMapping);
    }
    if (viewport) {
      Object.entries(viewport).forEach(([key, value]) => params.set(key, String(value)));
    }

    fetch(`/api/locations/facilities?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok) throw new Error(payload.error || "Gagal memuat fasilitas");
        setFacilities(payload.data || []);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setFacilities([]);
        }
      });

    return () => controller.abort();
  }, [facilityBranch, facilityMapping, facilityStatus, facilityType, mapMode, viewport]);

  // Active operational earthquakes filtered strictly by active window (24h or 72h max)
  const activeQuakes = useMemo(() => {
    const allActive = disasterData?.activeEarthquakes || [];
    const maxHours = mapTimeFilter === "24h" ? 24 : 72;
    const maxAgeMs = maxHours * 60 * 60 * 1000;
    const now = Date.now();
    return allActive.filter((eq) => now - eq.timestamp <= maxAgeMs);
  }, [disasterData, mapTimeFilter]);

  const latestEq = selectedEarthquake || disasterData?.latestBmkgEarthquake;

  // Map earthquakes: In Event Focus Mode render focused event; otherwise render all active window quakes
  const mapEarthquakes = useMemo(() => {
    if (selectedEarthquake) {
      return [selectedEarthquake];
    }
    return activeQuakes;
  }, [selectedEarthquake, activeQuakes]);

  // Convert facilities to Store-compatible format with evaluated earthquake risk
  const locationModeStores = useMemo<Store[]>(() => {
    return facilities.map((facility) => {
      const lat = Number(facility.latitude);
      const lng = Number(facility.longitude);
      const risk = assessStoreRisk({ latitude: lat, longitude: lng }, mapEarthquakes);
      const isDanger = risk.spatialRisk === "PRIORITY_MONITOR";
      const isWarning = risk.spatialRisk === "MONITOR";

      return {
        id: `FACILITY:${facility.id}`,
        kode_toko: facility.code,
        nama_toko: facility.name,
        cabang: facility.branch_id || "Belum dipetakan",
        alamat: facility.mapping_verified_at
          ? "Mapping cabang terverifikasi"
          : "Mapping cabang perlu dilengkapi",
        latitude: lat,
        longitude: lng,
        fr_type: `FACILITY_${facility.facility_type}`,
        status: risk.spatialRisk,
        spatialRisk: risk.spatialRisk,
        operationalStatus: facility.operational_status === "ACTIVE" ? "NONE" : "RESOLVED",
        visualStatus: isDanger ? "PERLU_PERHATIAN" : isWarning ? "PERLU_PERHATIAN" : "NORMAL",
        distanceFromDisasterKm: risk.distanceFromEventKm,
        riskSourceEvent: risk.riskSourceEvent,
      };
    });
  }, [facilities, mapEarthquakes]);

  // Filter stores and facilities based on search and filters
  const displayedLocations = useMemo(() => {
    let list: Store[] = [];
    if (mapMode === "location") {
      if (facilityType === "STORE") {
        list = [...computedStores];
      } else if (facilityType) {
        list = [...locationModeStores];
      } else {
        list = [...computedStores, ...locationModeStores];
      }
    } else {
      // In Event Focus / Mode Kejadian: include both stores and facilities in evaluated zone!
      list = [...computedStores, ...locationModeStores];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (loc) =>
          loc.kode_toko.toLowerCase().includes(q) ||
          loc.nama_toko.toLowerCase().includes(q) ||
          (loc.cabang && loc.cabang.toLowerCase().includes(q))
      );
    }

    return list;
  }, [mapMode, facilityType, computedStores, locationModeStores, searchQuery]);

  const facilityByStoreId = useMemo(
    () => new Map(facilities.map((facility) => [`FACILITY:${facility.id}`, facility])),
    [facilities]
  );

  const branchOptions = useMemo(
    () => [...new Set(facilities.map((facility) => facility.branch_id).filter(Boolean))] as string[],
    [facilities]
  );

  // Selected item detail resolver
  const activeDetailStore = selectedStore;
  const activeDetailFacility = selectedFacility || (selectedStore ? facilityByStoreId.get(selectedStore.id) : null);

  const handleCloseDetail = () => {
    handleSelectStore(null as any);
    setSelectedFacility(null);
  };

  const handleResetLocationFilters = () => {
    setSearchQuery("");
    setFacilityType("");
    setFacilityBranch("");
    setFacilityStatus("");
    setFacilityMapping("");
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* 1. TOP TOOLBAR & CONTEXT BAR (NO OVERLAYS OVER MAP) */}
      <MapToolbar
        mapMode={mapMode}
        onModeChange={(m) => {
          setMapMode(m);
          handleCloseDetail();
        }}
        latestEarthquake={latestEq}
        activeEarthquakesCount={activeQuakes.length}
        evaluatedLocationsCount={dangerCount}
        onOpenEvaluatedSheet={() => setIsAffectedSheetOpen(true)}
        onOpenEarthquakeListModal={() => setIsEarthquakeModalOpen(true)}
        onFocusEpicenter={() => {
          if (latestEq) handleFocusDisaster(latestEq);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        facilityType={facilityType}
        onFacilityTypeChange={setFacilityType}
        facilityBranch={facilityBranch}
        onFacilityBranchChange={setFacilityBranch}
        facilityMapping={facilityMapping}
        onFacilityMappingChange={setFacilityMapping}
        branchOptions={branchOptions}
        onResetLocationFilters={handleResetLocationFilters}
        totalLocationsCount={displayedLocations.length}
        basemap={basemap}
        onChangeBasemap={setBasemap}
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        mapTimeFilter={mapTimeFilter}
        onChangeMapTimeFilter={setMapTimeFilter}
        incidentOnly={incidentOnly}
        onToggleIncidentOnly={() => setIncidentOnly((prev) => !prev)}
        showRadar={showRadar}
        onToggleRadar={() => setShowRadar((prev) => !prev)}
        onResetView={handleResetView}
        theme={theme}
        onOpenFilterModal={() => setFilterOpen(true)}
        isMobileDetailOpen={Boolean(activeDetailStore || activeDetailFacility)}
      />

      {/* 2. MAIN WORKSPACE: MAP (LEFT/MAIN) + CONTEXTUAL SIDE PANEL (RIGHT) */}
      <div className="flex-1 relative w-full h-full flex overflow-hidden">
        {/* INTERACTIVE MAP AREA (Takes maximum available space) */}
        <div className="flex-1 relative h-full w-full z-0">
          <MapView
            stores={displayedLocations}
            earthquakes={mapMode === "event" ? mapEarthquakes : []}
            floodReports={disasterData?.floodReports || []}
            basemap={basemap}
            incidentOnly={incidentOnly}
            statusFilter={statusFilter}
            selectedStore={selectedStore}
            onSelectStore={(store) => {
              const fac = facilityByStoreId.get(store.id);
              if (fac) {
                setSelectedFacility(fac);
              } else {
                setSelectedFacility(null);
              }
              handleSelectStore(store);
            }}
            flyToTarget={flyToTarget}
            showRadar={showRadar}
            radarTileUrl={radarData?.tileUrl}
            activeLayer={activeLayer}
            theme={theme}
            onViewportChange={handleViewportChange}
          />
        </div>

        {/* CONTEXTUAL DETAIL PANEL (DESKTOP: Slide-in Side Panel) */}
        {!isMobile && (activeDetailStore || activeDetailFacility) && (
          <LocationDetailPanel
            location={activeDetailStore}
            facility={activeDetailFacility}
            onClose={handleCloseDetail}
            isMobile={false}
            currentEarthquake={latestEq}
          />
        )}
      </div>

      {/* CONTEXTUAL DETAIL SHEET (MOBILE: Non-overlapping Bottom Sheet with safe-area padding - Detail fasilitas) */}
      {isMobile && (activeDetailStore || activeDetailFacility) && (
        <div data-testid="detail-fasilitas-sheet" aria-label="Detail fasilitas">
          <LocationDetailPanel
            location={activeDetailStore}
            facility={activeDetailFacility}
            onClose={handleCloseDetail}
            isMobile={true}
            currentEarthquake={latestEq}
          />
        </div>
      )}

      {/* 3. EARTHQUAKE LIST MODAL */}
      <EarthquakeListModal
        isOpen={isEarthquakeModalOpen}
        onClose={() => setIsEarthquakeModalOpen(false)}
        earthquakes={activeQuakes}
        onSelectEarthquake={(eq) => {
          handleFocusDisaster(eq);
          setIsEarthquakeModalOpen(false);
        }}
        selectedEarthquakeId={latestEq?.id}
        theme={theme}
      />

      {/* 4. FACILITY FILTER MODAL (Compatible with test selector) */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[3000] flex items-end sm:items-center sm:justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Filter fasilitas"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFilterOpen(false);
          }}
        >
          <div className="w-full rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 text-slate-900 dark:text-white shadow-2xl sm:max-w-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-sm">Filter Fasilitas & Jaringan</h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] grid place-items-center"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kategori Fasilitas
                </label>
                <select
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                >
                  <option value="">Semua Kategori</option>
                  <option value="DC">DC (Distribution Center)</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="DEPO">Depo</option>
                  <option value="BULKY">Bulky</option>
                  <option value="STORE_HUB">Store Hub</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Cabang Operasional
                </label>
                <select
                  value={facilityBranch}
                  onChange={(e) => setFacilityBranch(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                >
                  <option value="">Semua Cabang</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      Cabang {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Status Operasional
                </label>
                <select
                  value={facilityStatus}
                  onChange={(e) => setFacilityStatus(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                >
                  <option value="">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Tidak Aktif</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Status Pemetaan Cabang
                </label>
                <select
                  value={facilityMapping}
                  onChange={(e) => setFacilityMapping(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                >
                  <option value="">Semua Status Mapping</option>
                  <option value="mapped">Terpetakan ke Cabang</option>
                  <option value="unmapped">Belum Terpetakan</option>
                </select>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetLocationFilters}
                  className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs min-h-[44px]"
                >
                  Reset Filter
                </button>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="px-3 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs min-h-[44px]"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
