"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Flame,
  UserX,
  Activity,
  Waves,
  Wind,
  Eye,
  Filter,
  Trash2,
  Pencil,
} from "lucide-react";
import { IncidentRecord, DisasterType, IncidentStatus } from "@/types/incident";

interface ActiveIncidentsTableProps {
  incidents: IncidentRecord[];
  onSelectIncident: (incident: IncidentRecord) => void;
  onCreateReportClick: () => void;
  onDeleteIncident?: (id: string) => void;
  hideAction?: boolean;
}

export function ActiveIncidentsTable({
  incidents,
  onSelectIncident,
  onCreateReportClick,
  onDeleteIncident,
  hideAction = false,
}: ActiveIncidentsTableProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<DisasterType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredIncidents = useMemo(() => {
    const now = new Date();
    
    return incidents.filter((inc) => {
      // Type Filter
      const matchType = filterType === "all" || inc.disasterType === filterType;
      
      // Status Filter
      const matchStatus = filterStatus === "all" || inc.status === filterStatus;
      
      // Date Filter
      let matchDate = true;
      if (startDate || endDate) {
        const incDateStr = inc.date; // e.g. "1 Sep 2026"
        const incDate = new Date(incDateStr);
        if (!isNaN(incDate.getTime())) {
          incDate.setHours(0, 0, 0, 0);

          if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (incDate < sDate) matchDate = false;
          }

          if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (incDate > eDate) matchDate = false;
          }
        }
      }

      return matchType && matchStatus && matchDate;
    });
  }, [incidents, filterType, filterStatus, startDate, endDate]);
  const getDisasterBadge = (type: DisasterType) => {
    switch (type) {
      case "flood":
        return { label: "Banjir", icon: Waves, color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "theft":
        return { label: "Kemalingan", icon: UserX, color: "bg-slate-100 text-slate-800 border-slate-200" };
      case "fire":
        return { label: "Kebakaran", icon: Flame, color: "bg-red-50 text-red-700 border-red-200" };
      case "earthquake":
        return { label: "Gempa Bumi", icon: Activity, color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "strong_wind":
        return { label: "Angin Kencang", icon: Wind, color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
      case "heavy_rain":
        return { label: "Hujan/Badai", icon: Waves, color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "severe_building_damage":
        return { label: "Bangunan Rusak", icon: Pencil, color: "bg-orange-50 text-orange-700 border-orange-200" };
      default:
        return { label: "Lainnya", icon: Pencil, color: "bg-slate-50 text-slate-600 border-slate-200" };
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "in_maintenance":
      case "investigating":
        return { label: "Dalam Penanganan", color: "bg-[#EAF2FB] text-[#1D5AA6]" };
      case "resolved":
        return { label: "Selesai", color: "bg-[#16A34A]/10 text-[#16A34A]" };
      case "verifying":
        return { label: "Verifikasi", color: "bg-[#F59E0B]/10 text-[#F59E0B]" };
      default:
        return { label: "Belum Ditangani", color: "bg-[#DC2626]/10 text-[#DC2626]" };
    }
  };

  const getProgressBarColor = (progress: number) => {
    if (progress >= 100) return "bg-[#16A34A]"; // Success green
    if (progress >= 60) return "bg-[#1D5AA6]";  // Action blue
    if (progress >= 40) return "bg-[#F59E0B]";  // Warning amber
    return "bg-[#DC2626]/80"; // Critical red
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-sm overflow-hidden transition-colors border border-slate-200 dark:border-slate-800">
      {/* Table Header with Title & Action Button */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Daftar Kejadian Terbaru</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar insiden aktif yang sedang dalam penanganan di seluruh gerai toko
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterType !== "all" || filterStatus !== "all" || startDate || endDate
                ? "bg-[#EAF2FB] dark:bg-blue-900/30 text-[#1D5AA6] dark:text-blue-400"
                : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter {(filterType !== "all" || filterStatus !== "all" || startDate || endDate) && "(Aktif)"}</span>
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-72 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Rentang Waktu
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute -top-2 left-2 bg-white dark:bg-slate-900 px-1 text-[9px] text-slate-400">Dari</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute -top-2 left-2 bg-white dark:bg-slate-900 px-1 text-[9px] text-slate-400">Sampai</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(""); setEndDate(""); }}
                      className="text-[10px] text-red-500 hover:text-red-600 mt-2 font-medium flex items-center justify-end w-full"
                    >
                      Reset Tanggal
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Jenis Kejadian
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as DisasterType | "all")}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">Semua Jenis</option>
                    <option value="earthquake">Gempa Bumi</option>
                    <option value="flood">Banjir</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Status Penanganan
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as IncidentStatus | "all")}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="verifying">Verifikasi</option>
                    <option value="investigating">Investigasi</option>
                    <option value="in_maintenance">Dalam Penanganan</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium tracking-wide text-xs border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 w-12 text-center">No</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Toko</th>
              <th className="px-4 py-3">Jenis Kejadian</th>
              <th className="px-4 py-3">Lokasi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 min-w-[140px]">Progress</th>
              {!hideAction && (
                <th className="px-4 py-3 text-right">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={hideAction ? 7 : 8} className="py-8 text-center text-slate-400">
                  Tidak ada kejadian aktif yang sesuai dengan filter Anda.
                </td>
              </tr>
            ) : (
              filteredIncidents.map((inc, index) => {
                const disaster = getDisasterBadge(inc.disasterType);
                const status = getStatusBadge(inc.status);
                const Icon = disaster.icon;

                return (
                  <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {inc.date}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      {inc.storeName}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${disaster.color}`}>
                        <Icon className="w-3 h-3 shrink-0" />
                        <span>{disaster.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {inc.locationCity}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(inc.progress)}`}
                            style={{ width: `${inc.progress}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] w-8">
                          {inc.progress}%
                        </span>
                      </div>
                    </td>
                    {!hideAction && (
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectIncident(inc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          {onDeleteIncident && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus laporan ${inc.id} (${inc.storeName})? Tindakan ini tidak dapat dibatalkan.`)) {
                                  onDeleteIncident(inc.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Hapus Laporan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
