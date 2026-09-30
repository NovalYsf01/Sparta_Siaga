"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
import { ActiveIncidentsTable } from "@/components/dashboard/active-incidents-table";

export default function AlertsPage() {
  const {
    activeIncidents,
    handleSelectIncidentForDetail,
    handleOpenReportModal,
    incidents,
    handleUpdateIncidents,
    theme
  } = useSiaga();

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
            Manajemen Laporan Kejadian Aktif
          </h2>
          <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            Pantau proses verifikasi store manager dan eskalasi perbaikan fisik ke Sparta Maintenance
          </p>
        </div>
        <button
          onClick={() => handleOpenReportModal()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1D5AA6] hover:bg-[#123B6D] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan Baru</span>
        </button>
      </div>

      <ActiveIncidentsTable
        incidents={activeIncidents}
        onSelectIncident={handleSelectIncidentForDetail}
        onCreateReportClick={handleOpenReportModal}
        onDeleteIncident={async (id) => {
          try {
            await fetch(`/api/incidents/${id}`, { method: "DELETE" });
            const updated = incidents.filter((inc) => inc.id !== id);
            handleUpdateIncidents(updated);
          } catch (err) {
            console.error("[Sparta Siaga] Failed to delete incident:", err);
          }
        }}
      />
    </div>
  );
}
