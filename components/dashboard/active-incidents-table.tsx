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
import { toast } from "sonner";
import { IncidentRecord, DisasterType, IncidentStatus } from "@/types/incident";

interface ActiveIncidentsTableProps {
  incidents: IncidentRecord[];
  onSelectIncident: (incident: IncidentRecord) => void;
  onCreateReportClick: () => void;
  onDeleteIncident?: (id: string) => void;
  hideAction?: boolean;
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
    businessRole?: string;
    systemRole?: string;
    scope?: string;
    branch?: string;
  } | null;
  onClaimSuccess?: () => void;
}

export function ActiveIncidentsTable({
  incidents,
  onSelectIncident,
  onCreateReportClick,
  onDeleteIncident,
  hideAction = false,
  currentUser,
  onClaimSuccess,
}: ActiveIncidentsTableProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<DisasterType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach((i) => {
      if (i.branch) set.add(i.branch);
    });
    return Array.from(set).sort();
  }, [incidents]);

  const isHO = currentUser?.scope === "HO" && currentUser?.systemRole !== "ADMIN";
  const userRoleStr = (currentUser?.businessRole || currentUser?.role || "").toLowerCase();
  const isBMM = !isHO && currentUser?.systemRole !== "ADMIN" && userRoleStr === "bm";
  const canClaim = !isHO && (currentUser?.systemRole === "ADMIN" || ["bms", "bes"].includes(userRoleStr));

  const handleClaim = async (incId: string) => {
    setClaimingId(incId);
    try {
      const res = await fetch(`/api/incidents/${incId}/pic`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.claimed) {
        toast.success("Berhasil mengambil tugas. Anda telah ditugaskan sebagai PIC otomatis.");
        onClaimSuccess?.();
      } else if (res.status === 409) {
        toast.error("Laporan sudah diambil oleh petugas lain.");
      } else {
        toast.error(data.error || "Gagal mengambil tugas laporan.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setClaimingId(null);
    }
  };

  const filteredIncidents = useMemo(() => {
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

      const matchBranch = filterBranch === "all" || inc.branch?.toLowerCase() === filterBranch.toLowerCase();

      return matchType && matchStatus && matchDate && matchBranch;
    });
  }, [incidents, filterType, filterStatus, startDate, endDate, filterBranch]);

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

  const getHandlingStatus = (inc: IncidentRecord) => {
    if (inc.status === "closed" || inc.status === "resolved" || inc.status === "confirmed_safe") {
      return { label: "Selesai", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" };
    }
    if (inc.status === "pending_bm_approval" || inc.status === "pending_final_approval" || inc.status === "awaiting_st") {
      return { label: "Menunggu Approval", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" };
    }
    if (inc.primaryPicUserId || inc.status === "in_maintenance" || inc.status === "investigating" || inc.status === "in_estimation") {
      return { label: "On Progress", color: "bg-blue-50 text-[#1D5AA6] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" };
    }
    return { label: "Belum Ditangani", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" };
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

                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Cabang
                  </label>
                  <select
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">Semua Cabang</option>
                    {availableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium tracking-wide text-xs border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 w-10 text-center">No</th>
              <th className="px-4 py-3">No. Laporan</th>
              <th className="px-4 py-3">Waktu Mulai</th>
              <th className="px-4 py-3">Lokasi & Cabang</th>
              <th className="px-4 py-3">Kejadian</th>
              <th className="px-4 py-3">Status Penanganan</th>
              <th className="px-4 py-3">PIC Otomatis</th>
              <th className="px-4 py-3 min-w-[120px]">Progres Fisik</th>
              <th className="px-4 py-3">Target Selesai</th>
              {!hideAction && (
                <th className="px-4 py-3 text-right">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={hideAction ? 9 : 10} className="py-8 text-center text-slate-400">
                  Tidak ada kejadian aktif yang sesuai dengan filter Anda.
                </td>
              </tr>
            ) : (
              filteredIncidents.map((inc, index) => {
                const disaster = getDisasterBadge(inc.disasterType);
                const handling = getHandlingStatus(inc);
                const Icon = disaster.icon;
                const hasPic = Boolean(inc.primaryPicUserId);
                const picName = inc.primaryPicName || (hasPic ? "Petugas Ditugaskan" : "Belum Ditugaskan");
                const targetDate = inc.maintenanceTicket?.completedAt || "Belum Ditentukan";
                const isOverdue = Boolean(inc.maintenanceTicket?.completedAt && new Date(inc.maintenanceTicket.completedAt) < new Date() && inc.status !== "closed" && inc.status !== "resolved");

                return (
                  <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                      {inc.maintenanceTicket?.ticketId || inc.id}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {inc.date}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {inc.locationKind === "FACILITY" && (
                          <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1 py-0.5 rounded">
                            DC
                          </span>
                        )}
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {inc.locationKind === "FACILITY" || inc.tkpType === "dc" ? "Tim BES" : "Tim BMS"}
                        </span>
                        <span>{inc.storeName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{inc.branch} • {inc.locationCity}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${disaster.color}`}>
                        <Icon className="w-3 h-3 shrink-0" />
                        <span>{disaster.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${handling.color}`}>
                        {handling.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {picName}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(inc.progress)}`}
                            style={{ width: `${inc.progress}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                          {inc.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      <span>{targetDate}</span>
                      {isOverdue && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800 block mt-0.5 w-fit">
                          Melewati Target
                        </span>
                      )}
                    </td>
                    {!hideAction && (
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!hasPic && canClaim && !isHO && (
                            <button
                              type="button"
                              onClick={() => handleClaim(inc.id)}
                              disabled={claimingId === inc.id}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs disabled:opacity-50"
                            >
                              {claimingId === inc.id ? "Memproses..." : "Mulai Menangani"}
                            </button>
                          )}
                          <button
                            onClick={() => onSelectIncident(inc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isBMM && (inc.status === "pending_bm_approval" || inc.status === "pending_final_approval") ? "Review & Approval" : "Detail"}</span>
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

      {/* MOBILE CARD LIST VIEW (antislop-layoutmobile: adaptive, zero horizontal scroll) */}
      <div className="md:hidden space-y-2.5 p-3">
        {filteredIncidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Tidak ada kejadian aktif yang sesuai dengan filter Anda.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const disaster = getDisasterBadge(inc.disasterType);
            const handling = getHandlingStatus(inc);
            const Icon = disaster.icon;
            const hasPic = Boolean(inc.primaryPicUserId);
            const picName = inc.primaryPicName || (hasPic ? "Petugas Ditugaskan" : "Belum Ditugaskan");
            const targetDate = inc.maintenanceTicket?.completedAt || "Belum Ditentukan";
            const isOverdue = Boolean(inc.maintenanceTicket?.completedAt && new Date(inc.maintenanceTicket.completedAt) < new Date() && inc.status !== "closed" && inc.status !== "resolved");

            return (
              <div
                key={inc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                      {inc.maintenanceTicket?.ticketId || inc.id}
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      {inc.locationKind === "FACILITY" && (
                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">
                          DC
                        </span>
                      )}
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1 py-0.5 rounded">
                        {inc.locationKind === "FACILITY" || inc.tkpType === "dc" ? "BES" : "BMS"}
                      </span>
                      <span className="truncate">{inc.storeName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {inc.locationCity} • {inc.branch}
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${handling.color}`}>
                    {handling.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">PIC Otomatis:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{picName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Target Selesai:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300 truncate block">
                      {targetDate}
                      {isOverdue && <strong className="text-red-500 ml-1 text-[10px]">(Melewati Target)</strong>}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Progress Milestone</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {inc.progress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(inc.progress)}`}
                      style={{ width: `${inc.progress}%` }}
                    />
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  {!hasPic && canClaim && !isHO && (
                    <button
                      type="button"
                      onClick={() => handleClaim(inc.id)}
                      disabled={claimingId === inc.id}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors min-h-[44px] shadow-xs disabled:opacity-50"
                    >
                      <span>{claimingId === inc.id ? "..." : "Mulai Menangani"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onSelectIncident(inc)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors min-h-[44px] flex-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isBMM && (inc.status === "pending_bm_approval" || inc.status === "pending_final_approval") ? "Review & Approval" : "Lihat Detail"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

