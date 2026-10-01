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
  const [filterStatus, setFilterStatus] = useState<"all" | "pending_confirmation" | "investigating" | "in_maintenance" | "in_estimation">("all");

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (inc.status === "resolved" || inc.status === "archived") return false;
      if (filterStatus !== "all" && inc.status !== filterStatus) return false;

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
  }, [incidents, searchQuery, filterStatus]);

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "pending_confirmation":
        return { label: "Perlu Konfirmasi", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" };
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
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            Tracking Laporan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pantau perjalanan dan progress laporan secara mendetail.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-950/50 rounded-t-xl transition-colors">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID Laporan, Lokasi, Cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-500 transition-all dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 dark:text-white transition-colors"
            >
              <option value="all">Semua Status</option>
              <option value="pending_confirmation">Perlu Konfirmasi</option>
              <option value="investigating">Investigasi</option>
              <option value="in_estimation">Estimasi</option>
              <option value="in_maintenance">Penanganan Fisik</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold transition-colors">
              <tr>
                <th className="px-4 py-3">ID & LOKASI</th>
                <th className="px-4 py-3">KEJADIAN</th>
                <th className="px-4 py-3">STATUS TERKINI</th>
                <th className="px-4 py-3">PROGRESS</th>
                <th className="px-4 py-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-transparent transition-colors">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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
                        <span className={`px-2 py-1 rounded-full font-bold text-[10px] ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                              style={{ width: `${inc.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{inc.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onSelectIncident(inc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#1D5AA6] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-md transition-colors"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          Track
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
