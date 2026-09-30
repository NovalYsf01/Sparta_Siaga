"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
import { DisasterAlertBar } from "@/components/disaster/disaster-alert-bar";
import { MapControls } from "@/components/map/map-controls";

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
  } = useSiaga();

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      {/* Top Disaster Alert Bar */}
      <DisasterAlertBar
        earthquakes={
          disasterData?.recentEarthquakes && disasterData.recentEarthquakes.length > 0
            ? disasterData.recentEarthquakes
            : disasterData?.latestBmkgEarthquake
            ? [disasterData.latestBmkgEarthquake]
            : []
        }
        latestEarthquake={disasterData?.latestBmkgEarthquake}
        affectedCount={dangerCount}
        onOpenAffectedSheet={() => setIsAffectedSheetOpen(true)}
        onFocusDisaster={handleFocusDisaster}
        theme={theme}
      />

      <div className="flex-1 relative w-full h-full overflow-hidden">
        {/* Map Area (Full Viewport) */}
        <div className="w-full h-full relative z-0">
          <MapView
            stores={computedStores}
            earthquakes={disasterData?.recentEarthquakes || []}
            floodReports={disasterData?.floodReports || []}
            basemap={basemap}
            incidentOnly={incidentOnly}
            statusFilter={statusFilter}
            selectedStore={selectedStore}
            onSelectStore={handleSelectStore}
            flyToTarget={flyToTarget}
            showRadar={showRadar}
            radarTileUrl={radarData?.tileUrl}
            activeLayer={activeLayer}
          />
          
          {/* Compact Map Controls inside Map */}
          <div className="absolute bottom-4 left-4 sm:bottom-auto sm:top-4 sm:left-4 z-[400] scale-90 sm:scale-100 origin-bottom-left sm:origin-top-left">
            <MapControls
              latestEarthquake={disasterData?.latestBmkgEarthquake}
              incidentOnly={incidentOnly}
              onToggleIncidentOnly={() => setIncidentOnly((prev) => !prev)}
              basemap={basemap}
              onChangeBasemap={(b) => setBasemap(b)}
              onResetView={handleResetView}
              totalStoresCount={computedStores.length}
              affectedStoresCount={dangerCount + warningCount}
              showRadar={showRadar}
              onToggleRadar={() => setShowRadar((prev) => !prev)}
              radarTimeString={radarData?.timeFormatted}
              theme={theme}
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
