"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  Plus,
  Calculator,
} from "lucide-react";
import { IncidentRecord, DisasterType, IncidentStatus } from "@/types/incident";
import { UserIdentity } from "@/lib/identity";
import { SelectReportModal } from "../incident/select-report-modal";
import { EstimationModal } from "../incident/estimation-modal";
import { ProgressUpdateModal } from "../incident/progress-update-modal";

interface OperationalReportCenterProps {
  incidents: IncidentRecord[];
  onSelectIncident: (inc: IncidentRecord) => void;
  onOpenReportModal: () => void;
}

export function OperationalReportCenter({
  incidents,
  onSelectIncident,
  onOpenReportModal,
}: OperationalReportCenterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending_confirmation" | "investigating" | "in_maintenance">("all");
  const [filterType, setFilterType] = useState<"all" | DisasterType>("all");

  const [identity, setIdentity] = useState<UserIdentity | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setIdentity(data.user || data);
      })
      .catch(() => {});
  }, []);

  const isSystemAdmin = identity?.systemRole === "ADMIN";
  const canTriggerEstimation = !isSystemAdmin && Boolean(identity?.effectivePermissions?.ESTIMATION_TRIGGER);
  const canUpdateProgress = !isSystemAdmin && Boolean(identity?.effectivePermissions?.REPORT_UPDATE_PROGRESS);
  const canCreateReport = Boolean(identity) && !isSystemAdmin;

  // Entry Point D2 & O states
  const [selectReportPurpose, setSelectReportPurpose] = useState<"ESTIMATION" | "PROGRESS" | null>(null);
  const [selectedEstimationReport, setSelectedEstimationReport] = useState<IncidentRecord | null>(null);
  const [selectedProgressReport, setSelectedProgressReport] = useState<IncidentRecord | null>(null);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Exclude resolved/archived permanently from active operational center
      if (inc.status === "resolved" || inc.status === "archived") return false;

      // Detailed active status filter
      if (filterStatus !== "all" && inc.status !== filterStatus) return false;

      // Type filter
      if (filterType !== "all" && inc.disasterType !== filterType) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ticketId = inc.maintenanceTicket?.ticketId?.toLowerCase() || inc.id.toLowerCase();
        if (
          !ticketId.includes(q) &&
          !inc.storeName.toLowerCase().includes(q) &&
          !inc.branch.toLowerCase().includes(q) &&
          !inc.locationCity.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, searchQuery, filterStatus, filterType]);

  const activeCount = incidents.filter(i => i.status !== "resolved").length;
  const pendingCount = incidents.filter(i => i.status === "pending_confirmation").length;
  const maintenanceCount = incidents.filter(i => i.status === "in_maintenance").length;
  const resolvedCount = incidents.filter(i => i.status === "resolved").length;

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "pending_confirmation":
        return { label: "Perlu Konfirmasi", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
      case "verifying":
        return { label: "Verifikasi", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
      case "investigating":
        return { label: "Investigasi", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
      case "in_maintenance":
        return { label: "Penanganan", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
      case "resolved":
        return { label: "Selesai", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
      default:
        return { label: "Unknown", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* ── Header & KPI ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Pusat Laporan Kejadian
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola dan pantau seluruh laporan insiden operasional.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canTriggerEstimation && (
            <button
              onClick={() => setSelectReportPurpose("ESTIMATION")}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Buat Estimasi
            </button>
          )}
          {canUpdateProgress && (
            <button
              onClick={() => setSelectReportPurpose("PROGRESS")}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Update Progress
            </button>
          )}
          {canCreateReport && (
            <button
              onClick={onOpenReportModal}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1D5AA6] hover:bg-[#123B6D] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buat Laporan
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Aktif / Berjalan", value: activeCount, icon: Clock, color: "text-blue-500" },
          { label: "Perlu Konfirmasi", value: pendingCount, icon: AlertTriangle, color: "text-red-500" },
          { label: "Dalam Penanganan", value: maintenanceCount, icon: Wrench, color: "text-amber-500" },
          { label: "Selesai (Arsip)", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-500" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              {kpi.label}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari No. Laporan, Toko, Cabang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto shrink-0 pb-1 sm:pb-0">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Semua Aktif</option>
            <option value="pending_confirmation">Perlu Konfirmasi</option>
            <option value="investigating">Investigasi</option>
            <option value="in_maintenance">Penanganan</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Semua Kejadian</option>
            <option value="earthquake">Gempa Bumi</option>
            <option value="flood">Banjir</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tidak ada laporan yang sesuai.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">No. Laporan</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Toko / Cabang</th>
                    <th className="px-4 py-3">Kejadian</th>
                    <th className="px-4 py-3">Asal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredIncidents.map((inc) => {
                    const status = getStatusBadge(inc.status);
                    return (
                      <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inc.maintenanceTicket?.ticketId || inc.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                          {inc.date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">{inc.storeName}</div>
                          <div className="text-[10px] text-slate-500">{inc.branch} • {inc.locationCity}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap capitalize font-medium">
                          {inc.disasterType}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                            inc.reportOrigin === "manual" 
                              ? "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                              : "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                          }`}>
                            {inc.reportOrigin === "manual" ? "Manual" : "Auto"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${status.color}`}>
                            {inc.status === "resolved" && <CheckCircle2 className="w-3 h-3" />}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => onSelectIncident(inc)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                              inc.status === "pending_confirmation"
                                ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {inc.status === "pending_confirmation" ? "Review & Konfirmasi" : "Detail"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW */}
          <div className="md:hidden space-y-3">
            {filteredIncidents.map((inc) => {
              const status = getStatusBadge(inc.status);
              return (
                <div key={inc.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                        {inc.maintenanceTicket?.ticketId || inc.id}
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white capitalize flex items-center gap-2">
                        {inc.disasterType}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                          inc.reportOrigin === "manual" 
                            ? "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            : "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400"
                        }`}>
                          {inc.reportOrigin === "manual" ? "Manual" : "Auto"}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {inc.storeName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {inc.branch} • {inc.locationCity}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {inc.date}
                    </div>
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                        inc.status === "pending_confirmation"
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {inc.status === "pending_confirmation" ? "Review & Konfirmasi" : "Lihat Detail"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Select Report Modal (Entry Point D2 & O) */}
      <SelectReportModal
        isOpen={selectReportPurpose !== null}
        onClose={() => setSelectReportPurpose(null)}
        purpose={selectReportPurpose || "ESTIMATION"}
        incidents={incidents}
        currentUser={identity}
        onSelectReport={(rep) => {
          if (selectReportPurpose === "ESTIMATION") {
            setSelectedEstimationReport(rep);
          } else if (selectReportPurpose === "PROGRESS") {
            setSelectedProgressReport(rep);
          }
          setSelectReportPurpose(null);
        }}
      />

      {/* Sub-modal: Buat / Status Estimasi */}
      <EstimationModal
        isOpen={selectedEstimationReport !== null}
        onClose={() => setSelectedEstimationReport(null)}
        incident={selectedEstimationReport}
        onRouteCreated={() => {}}
      />

      {/* Sub-modal: Update Progress */}
      <ProgressUpdateModal
        isOpen={selectedProgressReport !== null}
        onClose={() => setSelectedProgressReport(null)}
        incident={selectedProgressReport}
        latestProgress={selectedProgressReport?.progress || 0}
        onSuccess={() => {}}
      />
    </div>
  );
}
