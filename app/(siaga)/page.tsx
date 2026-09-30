"use client";

import React from "react";
import { Activity } from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
import { IncidentKpiRow } from "@/components/dashboard/incident-kpi-row";
import { ActiveIncidentsTable } from "@/components/dashboard/active-incidents-table";
import { MobileIncidentHome } from "@/components/mobile/mobile-incident-home";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const {
    incidentStats,
    selectedCategory,
    setSelectedCategory,
    disasterData,
    dangerCount,
    activeIncidents,
    handleSelectIncidentForDetail,
    handleOpenReportModal,
    theme
  } = useSiaga();

  return (
    <div className="w-full">
      {/* Mobile view only on small screens */}
      <div className="block lg:hidden">
        <MobileIncidentHome
          incidents={activeIncidents}
          onSelectIncident={handleSelectIncidentForDetail}
          onCreateReportClick={handleOpenReportModal}
          onCategoryClick={(cat) => setSelectedCategory(cat)}
          onViewAllClick={() => router.push("/alerts")}
          theme={theme}
        />
      </div>

      <div className="hidden lg:block p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Header: Title & Action */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard Pemantauan
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ringkasan situasi nasional dan laporan cabang terkini.
            </p>
          </div>
        </div>

        {/* TOP SITUATION SUMMARY (4 KPI Cards) */}
        <IncidentKpiRow
          stats={incidentStats}
          dangerCount={dangerCount}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* MAIN HERO: ACTIVE SITUATION PANEL (No Map) */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Active Situation Panel */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-sm">
            <h3 className="text-sm font-bold text-[#123B6D] dark:text-blue-400 mb-4 uppercase tracking-wider">
              Situasi Terkini
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Recent Alert */}
              <div>
                {disasterData?.latestBmkgEarthquake ? (
                  <div className="bg-[#D9272E]/10 border border-[#D9272E]/20 rounded-xl p-4 h-full">
                    <div className="flex items-center gap-2 text-[#D9272E] font-bold text-sm mb-2">
                      <Activity className="w-4 h-4" />
                      Gempa Terkini
                    </div>
                    <div className="text-2xl font-black text-[#D9272E] mb-1">
                      M {disasterData.latestBmkgEarthquake.magnitude}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      {disasterData.latestBmkgEarthquake.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mb-4">
                      {disasterData.latestBmkgEarthquake.time} • Kedalaman {disasterData.latestBmkgEarthquake.depth}
                    </div>
                    
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-xs border border-[#D9272E]/10">
                      <div className="text-slate-500 mb-1">Estimasi Area Dampak SPARTA</div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                        {dangerCount} Toko dalam pantauan
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-xl p-6 h-full flex flex-col justify-center text-center">
                    <div className="text-[#16A34A] font-bold text-sm mb-1">Kondisi Aman</div>
                    <div className="text-[10px] text-slate-500">Tidak ada peringatan bencana aktif saat ini.</div>
                  </div>
                )}
              </div>

              {/* Right Column: Laporan Baru */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Laporan Baru Masuk</h4>
                {activeIncidents.slice(0, 3).map(inc => (
                  <div key={inc.id} onClick={() => handleSelectIncidentForDetail(inc)} className="group cursor-pointer p-3 mb-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[#1D5AA6]/30 hover:bg-[#EAF2FB] dark:hover:bg-blue-900/10 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{inc.storeName}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        inc.status === "verifying" 
                          ? "bg-[#F59E0B]/10 text-[#F59E0B]" 
                          : "bg-[#EAF2FB] text-[#1D5AA6]"
                      }`}>{inc.status === "verifying" ? "Verifikasi" : "Penanganan"}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{inc.disasterType === "flood" ? "Banjir" : inc.disasterType === "earthquake" ? "Gempa" : inc.disasterType} • {inc.date}</div>
                  </div>
                ))}
                {activeIncidents.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-8">Belum ada laporan aktif.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY SECTION: REPORTS REQUIRING ATTENTION */}
        <div className="pt-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Laporan Memerlukan Perhatian</h3>
          <ActiveIncidentsTable
            incidents={activeIncidents}
            onSelectIncident={handleSelectIncidentForDetail}
            onCreateReportClick={handleOpenReportModal}
            hideAction={true}
          />
        </div>
      </div>
    </div>
  );
}
