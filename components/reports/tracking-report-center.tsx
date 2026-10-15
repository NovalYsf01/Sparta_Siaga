"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { IncidentRecord, DisasterType, IncidentStatus } from "@/types/incident";

interface TrackingReportCenterProps {
  incidents: IncidentRecord[];
  onSelectIncident: (inc: IncidentRecord) => void;
}

export function TrackingReportCenter({
  incidents,
  onSelectIncident,
}: TrackingReportCenterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (inc.status === "closed" || inc.status === "resolved" || inc.status === "archived") return false;
      if (filterStatus !== "all" && inc.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const ticketId = inc.maintenanceTicket?.ticketId?.toLowerCase() || inc.id.toLowerCase();
        if (
          !ticketId.includes(q) &&
          !inc.storeName.toLowerCase().includes(q) &&
          !inc.branch.toLowerCase().includes(q) &&
          !inc.locationCity.toLowerCase().includes(q) &&
          !inc.disasterType.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, searchQuery, filterStatus]);

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "pending_confirmation":
        return { label: "Perlu Konfirmasi", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" };
      case "pending_bm_approval":
        return { label: "Menunggu Persetujuan BnM", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
      case "clarification_requested":
        return { label: "Perlu Klarifikasi", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" };
      case "confirmed_affected":
        return { label: "Disetujui BnM", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
      case "confirmed_safe":
        return { label: "Dinyatakan Aman", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
      case "awaiting_spk":
        return { label: "Menunggu SPK", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" };
      case "spk_issued":
        return { label: "SPK Terbit", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };
      case "in_construction":
        return { label: "Perbaikan Berjalan", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };
      case "pending_final_approval":
        return { label: "Menunggu Approval Akhir", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
      case "verifying":
        return { label: "Verifikasi", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" };
      case "investigating":
        return { label: "Investigasi", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" };
      case "in_estimation":
        return { label: "Estimasi", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" };
      case "in_maintenance":
        return { label: "Penanganan Fisik", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" };
      case "resolved":
        return { label: "Selesai", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" };
      default:
        return { label: "Dalam Proses", color: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400" };
    }
  };

  return (
    <div className="sparta-report-page space-y-5 max-w-[1560px] mx-auto w-full px-4 sm:px-6 lg:px-0 pt-5 sm:pt-7 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="sparta-ui-title flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            Tracking Laporan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pantau pemeriksaan, persetujuan, dan pekerjaan setiap laporan pada satu tempat.
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{filteredIncidents.length} laporan ditampilkan</div>
      </div>

      <div className="sparta-ui-panel dark:bg-slate-900 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between transition-colors">
          <div className="relative flex-1 min-w-0 max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID Laporan, Lokasi, Cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sparta-ui-field w-full pl-9 pr-4 py-2.5 text-xs dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="sparta-ui-field w-full sm:w-auto text-xs px-3 py-2.5 dark:bg-slate-800 dark:text-white transition-colors"
            >
              <option value="all">Semua Status</option>
              <option value="pending_confirmation">Perlu Konfirmasi</option>
              <option value="pending_bm_approval">Menunggu Persetujuan BnM</option>
              <option value="clarification_requested">Perlu Klarifikasi</option>
              <option value="confirmed_affected">Disetujui BnM</option>
              <option value="verifying">Verifikasi</option>
              <option value="investigating">Investigasi</option>
              <option value="in_estimation">Estimasi</option>
              <option value="in_maintenance">Penanganan Fisik</option>
              <option value="in_construction">Perbaikan Konstruksi</option>
              <option value="awaiting_spk">Menunggu SPK</option>
              <option value="spk_issued">SPK Terbit</option>
              <option value="pending_final_approval">Menunggu Approval Akhir</option>
            </select>
          </div>
          <button type="button" onClick={() => { setSearchQuery(""); setFilterStatus("all"); }} className="sparta-ui-button">Reset</button>
        </div>

        <div className="overflow-x-auto">
          <table className="sparta-ui-table text-left">
            <thead className="dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 transition-colors">
              <tr>
                <th className="px-4 py-3">ID & LOKASI</th>
                <th className="px-4 py-3">KEJADIAN</th>
                <th className="px-4 py-3">STATUS TERKINI</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">PROGRES</th>
                <th className="px-4 py-3">TARGET SELESAI</th>
                <th className="px-4 py-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-transparent transition-colors">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Tidak ada laporan aktif untuk dilacak.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const badge = getStatusBadge(inc.status);
                  return (
                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] mb-1">
                          {inc.id}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 font-medium">
                          {inc.storeName}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {inc.branch} • {inc.locationCity}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                          {inc.disasterType.replace("_", " ")}
                        </span>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {inc.date}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`sparta-ui-status ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{inc.primaryPicName || "Belum ditugaskan"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                              style={{ width: `${inc.progress ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{inc.progress ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{inc.maintenanceTicket?.completedAt ? new Date(inc.maintenanceTicket.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Belum ditentukan"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onSelectIncident(inc)}
                          className="sparta-ui-button dark:bg-slate-800 dark:text-blue-300 whitespace-nowrap"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
