"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Activity, AlertTriangle, Building2, Filter, List, Loader2, MapPin, Radio, Search, Store as StoreIcon, X } from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
type MapMode = "event" | "store" | "dc";
import { MapControls } from "@/components/map/map-controls";
import { LocationDetailPanel, type FacilityDetail } from "@/components/map/location-detail-panel";
import { LocationListSheet } from "@/components/map/location-list-sheet";
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
  const [facilityFetchError, setFacilityFetchError] = useState(false);
  const [facilityRefreshKey, setFacilityRefreshKey] = useState(0);
  const [isLocationListOpen, setIsLocationListOpen] = useState(false);
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
    if (mapMode === "dc") {
      params.set("type", "DC");
      if (facilityBranch) params.set("branch", facilityBranch);
      if (facilityStatus) params.set("status", facilityStatus);
      if (facilityMapping) params.set("mapping", facilityMapping);
    }
    if (viewport) {
      Object.entries(viewport).forEach(([key, value]) => params.set(key, String(value)));
    }

    setFacilityFetchError(false);
    fetch(`/api/locations/facilities?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok) throw new Error(payload.error || "Gagal memuat fasilitas");
        setFacilities(payload.data || []);
        setFacilityFetchError(false);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          // Retain last known facilities if network fails; do not silently
          // present an empty map as if there were no facilities.
          setFacilityFetchError(true);
        }
      });

    return () => controller.abort();
  }, [facilityBranch, facilityMapping, facilityStatus, facilityType, mapMode, viewport, facilityRefreshKey]);

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
    // A manually focused earthquake should only remain on the map if it
    // falls within the selected time window.
    if (selectedEarthquake && activeQuakes.some(eq => eq.id === selectedEarthquake.id)) {
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

  // Each category has its own marker set: no mixed Store/DC results.
  // Event mode intentionally includes both to evaluate risk geographically.
  const displayedLocations = useMemo<Store[]>(() => {
    const isValid = (loc: Store) =>
      Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude)) &&
      Math.abs(Number(loc.latitude)) <= 90 && Math.abs(Number(loc.longitude)) <= 180;
    const inBranch = (loc: Store) =>
      !facilityBranch || (loc.cabang || "").toLowerCase() === facilityBranch.toLowerCase();
    const realStores = computedStores.filter(loc => isValid(loc) && inBranch(loc));
    const dcs = locationModeStores.filter(loc =>
      isValid(loc) && loc.fr_type === "FACILITY_DC" && inBranch(loc)
    );
    let list = mapMode === "store" ? realStores
      : mapMode === "dc" ? dcs
      : [...realStores, ...dcs];

    if (mapMode !== "event" && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(loc =>
        (loc.kode_toko || "").toLowerCase().includes(q) ||
        (loc.nama_toko || "").toLowerCase().includes(q) ||
        (loc.cabang || "").toLowerCase().includes(q)
      );
    }
    if (mapMode === "dc") {
      if (facilityStatus) {
        list = list.filter(loc => facilities.some(f => "FACILITY:" + f.id === loc.id &&
          f.operational_status === facilityStatus));
      }
      if (facilityMapping) {
        list = list.filter(loc => facilities.some(f => "FACILITY:" + f.id === loc.id &&
          (facilityMapping === "mapped" ? Boolean(f.mapping_verified_at) : !f.mapping_verified_at)));
      }
    }
    return list;
  }, [mapMode, computedStores, locationModeStores, searchQuery, facilityBranch,
      facilityStatus, facilityMapping, facilities]);

  const facilityByStoreId = useMemo(
    () => new Map(facilities.map((facility) => [`FACILITY:${facility.id}`, facility])),
    [facilities]
  );

  const branchOptions = useMemo(
    () => [...new Set([
      ...facilities.map((facility) => facility.branch_id),
      ...computedStores.map((store) => store.cabang),
    ].filter((branch): branch is string => Boolean(branch)))].sort((a, b) => a.localeCompare(b, "id")),
    [facilities, computedStores]
  );

  // Selected item detail resolver
  const activeDetailStore = selectedStore;
  const activeDetailFacility = selectedFacility || (selectedStore ? facilityByStoreId.get(selectedStore.id) : null);

  const handleCloseDetail = () => {
    handleSelectStore(null as any);
    setSelectedFacility(null);
  };

  const handleCloseAllSheets = () => {
    setFilterOpen(false);
    setIsLocationListOpen(false);
    setIsEarthquakeModalOpen(false);
    setIsAffectedSheetOpen(false);
    handleCloseDetail();
  };

  const handleOpenFilter = () => {
    handleCloseAllSheets();
    setFilterOpen(true);
  };

  const handleOpenLocationList = () => {
    handleCloseAllSheets();
    setIsLocationListOpen(true);
  };

  const handleOpenEvaluated = () => {
    handleCloseAllSheets();
    setIsAffectedSheetOpen(true);
  };

  const handleOpenEarthquakes = () => {
    handleCloseAllSheets();
    setIsEarthquakeModalOpen(true);
  };

  const handleModeChange = (m: MapMode) => {
    setMapMode(m);
    setSearchQuery("");
    setFacilityBranch("");
    setFacilityStatus("");
    setFacilityMapping("");
    handleCloseAllSheets();
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
      {/* Context-aware map navigation. Separate Store and DC, not mixed. */}
      <div className="relative z-20 shrink-0 border-b border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:px-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto" role="tablist" aria-label="Jenis monitoring peta">
            {([
              { id: "event" as const, label: "Kejadian", icon: Activity },
              { id: "store" as const, label: "Toko", icon: StoreIcon },
              { id: "dc" as const, label: "DC", icon: Building2 },
            ]).map(tab => {
              const Icon = tab.icon;
              const selected = mapMode === tab.id;
              return (
                <button key={tab.id} type="button" role="tab" aria-selected={selected}
                  onClick={() => handleModeChange(tab.id)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${selected ? "bg-[#1D5AA6] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                  <Icon className="h-4 w-4" />{tab.label}
                </button>
              );
            })}
          </div>
          {mapMode === "event" ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {latestEq && <span className="min-w-0 max-w-[380px] truncate text-xs text-slate-600 dark:text-slate-300" title={latestEq.title || latestEq.place}>
                <span className="font-semibold">M {latestEq.magnitude}</span> · {latestEq.title || latestEq.place}
              </span>}
              <button type="button" onClick={handleOpenEarthquakes} className="map-ux-action">
                <List className="h-4 w-4" /> Gempa ({activeQuakes.length})
              </button>
              <button type="button" onClick={handleOpenEvaluated} className="map-ux-action">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Prioritas Pantau ({dangerCount})
              </button>
              {latestEq && <button type="button" onClick={() => handleFocusDisaster(latestEq)} className="map-ux-action">
                <MapPin className="h-4 w-4" /> Episentrum
              </button>}
            </div>
          ) : (
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:max-w-[730px] lg:justify-end">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
                <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
                  aria-label={mapMode === "store" ? "Cari nama toko atau kode toko" : "Cari nama DC atau kode DC"}
                  placeholder={mapMode === "store" ? "Cari nama atau kode toko..." : "Cari nama atau kode DC..."}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"/>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleOpenFilter} className="map-ux-action">
                  <Filter className="h-4 w-4"/> Filter {mapMode === "store" ? "Toko" : "DC"}
                </button>
                <button type="button" onClick={handleOpenLocationList} className="map-ux-action">
                  <List className="h-4 w-4"/> Daftar ({displayedLocations.length})
                </button>
                <button type="button" onClick={handleResetLocationFilters} className="map-ux-action">Reset</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {facilityFetchError && (
        <div className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="status">
          <span>Data fasilitas terbaru gagal dimuat. Peta mempertahankan data terakhir yang tersedia.</span>
          <button type="button" className="shrink-0 rounded border border-amber-300 px-2 py-1 font-semibold dark:border-amber-800" onClick={() => setFacilityRefreshKey((key) => key + 1)}>Coba lagi</button>
        </div>
      )}

      {/* 2. Interactive map with the classic floating control panel. */}
      <div className="flex-1 relative w-full h-full flex overflow-hidden">
        {/* INTERACTIVE MAP AREA (Takes maximum available space) */}
        <div className="flex-1 relative h-full w-full min-w-0 z-0">
          <MapView
            stores={displayedLocations}
            earthquakes={mapMode === "event" ? mapEarthquakes : []}
            floodReports={disasterData?.floodReports || []}
            basemap={basemap}
            incidentOnly={incidentOnly}
            statusFilter={statusFilter}
            selectedStore={selectedStore}
            onSelectStore={(store) => {
              setFilterOpen(false);
              setIsLocationListOpen(false);
              setIsEarthquakeModalOpen(false);
              setIsAffectedSheetOpen(false);
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
          {mapMode === "event" && (
            <MapControls
              latestEarthquake={latestEq}
              incidentOnly={incidentOnly}
              onToggleIncidentOnly={() => setIncidentOnly((prev) => !prev)}
              basemap={basemap}
              onChangeBasemap={setBasemap}
              onResetView={handleResetView}
              totalStoresCount={displayedLocations.length}
              affectedStoresCount={dangerCount}
              showRadar={showRadar}
              onToggleRadar={() => setShowRadar((prev) => !prev)}
              theme={theme}
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              mapTimeFilter={mapTimeFilter}
              onChangeMapTimeFilter={(value) => { setMapTimeFilter(value); clearEventFocus(); }}
              selectedEarthquake={selectedEarthquake}
              onClearEventFocus={clearEventFocus}
            />
          )}
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

      {/* 3. LOCATION LIST SHEET (List-First Alternative) */}
      <LocationListSheet
        isOpen={isLocationListOpen}
        onClose={() => setIsLocationListOpen(false)}
        locations={displayedLocations}
        onSelectLocation={(loc) => {
          const fac = facilityByStoreId.get(loc.id);
          setSelectedFacility(fac || null);
          handleSelectStore(loc);
        }}
        selectedLocationId={selectedStore?.id}
        mapMode={mapMode === "event" ? "event" : "location"}
        theme={theme}
      />

      {/* 4. EARTHQUAKE LIST MODAL */}
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

      {/* 5. FACILITY FILTER MODAL (Compatible with test selector) */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[3000] flex items-end sm:items-center sm:justify-center p-0 sm:p-5 bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Filter fasilitas"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFilterOpen(false);
          }}
        >
          <div className="w-full rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 text-slate-900 dark:text-white shadow-2xl sm:max-w-md border border-slate-200 dark:border-slate-800 pb-28 sm:pb-5 max-h-[85vh] overflow-y-auto">
            <div className="sm:hidden w-full flex justify-center pb-2">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-sm">{mapMode === "store" ? "Filter Toko" : "Filter DC"}</h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] grid place-items-center"
                aria-label="Tutup filter"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {mapMode === "dc" && <div>
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
              </div>}

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

              {mapMode === "dc" && <div>
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
              </div>}

              {mapMode === "dc" && <div>
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
              </div>}

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
