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
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "all">("all");
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
  const isHoViewer = identity?.scope === "HO" && !isSystemAdmin;
  const canTriggerEstimation = !isSystemAdmin && Boolean(identity?.effectivePermissions?.ESTIMATION_TRIGGER);
  const canUpdateProgress = !isSystemAdmin && Boolean(identity?.effectivePermissions?.REPORT_UPDATE_PROGRESS);
  const canCreateReport = Boolean(identity) && !isSystemAdmin && !isHoViewer;

  // Entry Point D2 & O states
  const [selectReportPurpose, setSelectReportPurpose] = useState<"ESTIMATION" | "PROGRESS" | null>(null);
  const [selectedEstimationReport, setSelectedEstimationReport] = useState<IncidentRecord | null>(null);
  const [selectedProgressReport, setSelectedProgressReport] = useState<IncidentRecord | null>(null);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Exclude closed/resolved/archived permanently from active operational center
      if (!isHoViewer && (inc.status === "closed" || inc.status === "resolved" || inc.status === "archived")) return false;

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
  }, [incidents, searchQuery, filterStatus, filterType, isHoViewer]);

  const activeCount = incidents.filter(i => i.status !== "closed" && i.status !== "resolved" && i.status !== "archived").length;
  const pendingCount = incidents.filter(i => i.status === "pending_confirmation").length;
  const maintenanceCount = incidents.filter(i => i.status === "in_maintenance").length;
  const resolvedCount = incidents.filter(i => i.status === "closed" || i.status === "resolved" || i.status === "archived").length;

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "pending_confirmation":
        return { label: "Perlu Konfirmasi", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
      case "pending_bm_approval":
        return { label: "Menunggu Persetujuan BnM", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
      case "clarification_requested":
        return { label: "Perlu Klarifikasi", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" };
      case "confirmed_affected":
        return { label: "Disetujui BnM", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
      case "in_estimation":
        return { label: "Dalam Estimasi", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };
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
      
      {/* HO is a read-only monitoring workspace: not an operational work queue. */}
      {isHoViewer ? (
        <section className="space-y-4" aria-label="Monitoring Laporan Head Office">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Monitoring Laporan Nasional</h1>
              <p className="mt-1 text-xs text-slate-500">Ringkasan kejadian dan progres penanganan seluruh cabang. Akses pemantauan saja.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {filteredIncidents.length} laporan ditemukan
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              { label: "Total Laporan", value: incidents.length },
              { label: "Menunggu Persetujuan", value: incidents.filter(i => i.status === "pending_bm_approval" || i.status === "pending_final_approval").length },
              { label: "Dalam Penanganan", value: incidents.filter(i => i.status === "in_maintenance" || i.status === "in_construction").length },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
                <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Cari laporan, toko, DC, atau cabang..." aria-label="Cari laporan nasional"
                  className="min-h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"/>
              </div>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Filter status laporan" value={filterStatus} onChange={e => setFilterStatus(e.target.value as IncidentStatus | "all")}
                  className="min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="all">Semua Status</option>
                  <option value="pending_confirmation">Menunggu Pemeriksaan</option>
                  <option value="pending_bm_approval">Persetujuan BnM</option>
                  <option value="clarification_requested">Klarifikasi</option>
                  <option value="confirmed_affected">Kerusakan Disetujui</option>
                  <option value="in_estimation">Estimasi</option>
                  <option value="in_maintenance">Dalam Penanganan</option>
                  <option value="closed">Selesai</option>
                </select>
                <select aria-label="Filter jenis kejadian" value={filterType} onChange={e => setFilterType(e.target.value as "all" | DisasterType)}
                  className="min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="all">Semua Kejadian</option>
                  <option value="earthquake">Gempa</option>
                  <option value="flood">Banjir</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                  <tr><th className="px-4 py-3">Laporan / Lokasi</th><th className="px-4 py-3">Cabang</th><th className="px-4 py-3">Kejadian</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">PIC</th><th className="px-4 py-3">Target</th><th className="px-4 py-3 text-right">Detail</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="max-w-[240px] truncate font-semibold text-slate-900 dark:text-white">{inc.storeName}</div>
                        <div className="max-w-[240px] truncate text-[10px] text-slate-500">{inc.id}</div>
                      </td>
                      <td className="px-4 py-3">{inc.branch}</td>
                      <td className="px-4 py-3">{inc.disasterType}</td>
                      <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">{getStatusBadge(inc.status).label}</span></td>
                      <td className="px-4 py-3">{inc.primaryPicName || "—"}</td>
                      <td className="px-4 py-3">{inc.maintenanceTicket?.completedAt ? new Date(inc.maintenanceTicket.completedAt).toLocaleDateString("id-ID") : "—"}</td>
                      <td className="px-4 py-3 text-right"><button type="button" onClick={() => onSelectIncident(inc)}
                        className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300">Lihat</button></td>
                    </tr>
                  ))}
                  {!filteredIncidents.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Belum ada laporan yang sesuai.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {filteredIncidents.map(inc => (
                <article key={inc.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{inc.storeName}</p>
                      <p className="text-xs text-slate-500">{inc.branch} · {inc.disasterType}</p>
                    </div>
                    <button type="button" onClick={() => onSelectIncident(inc)} className="shrink-0 rounded-lg border px-3 py-2 text-xs text-blue-700 dark:text-blue-300">Lihat</button>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{getStatusBadge(inc.status).label} · PIC: {inc.primaryPicName || "Belum ada"}</p>
                  {inc.maintenanceTicket?.completedAt && <p className="mt-1 text-xs text-slate-500">Target: {new Date(inc.maintenanceTicket.completedAt).toLocaleDateString("id-ID")}</p>}
                </article>
              ))}
              {!filteredIncidents.length && <p className="py-8 text-center text-xs text-slate-500">Tidak ada laporan sesuai filter.</p>}
            </div>
          </div>
        </section>
      ) : (
        <>
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
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 min-h-[44px]"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto shrink-0 pb-1 sm:pb-0">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none min-h-[44px]"
          >
            <option value="all">Semua Aktif</option>
            <option value="pending_confirmation">Perlu Konfirmasi</option>
            <option value="pending_bm_approval">Menunggu Persetujuan BnM</option>
            <option value="clarification_requested">Perlu Klarifikasi</option>
            <option value="confirmed_affected">Disetujui BnM</option>
            <option value="in_estimation">Dalam Estimasi</option>
            <option value="investigating">Investigasi</option>
            <option value="in_maintenance">Penanganan</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none min-h-[44px]"
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
                    <th className="px-4 py-3">Status Penanganan</th>
                    <th className="px-4 py-3">PIC Otomatis</th>
                    <th className="px-4 py-3">Progres Fisik</th>
                    <th className="px-4 py-3">Target Selesai</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredIncidents.map((inc) => {
                    const s = (inc.status as string)?.toLowerCase() || "";
                    const handlingStatus = s === "resolved" || s === "closed"
                      ? { label: "Selesai", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" }
                      : s === "waiting_approval" || s === "verifying" || s === "pending_bm_approval"
                      ? { label: "Menunggu Approval", cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" }
                      : inc.primaryPicUserId || s === "in_maintenance" || s === "investigating"
                      ? { label: "On Progress", cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" }
                      : { label: "Belum Ditangani", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };

                    const targetDateStr = inc.maintenanceTicket?.completedAt
                      ? new Date(inc.maintenanceTicket.completedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Belum Ditentukan";

                    const isOverdue =
                      Boolean(inc.maintenanceTicket?.completedAt) &&
                      s !== "resolved" &&
                      s !== "closed" &&
                      new Date(inc.maintenanceTicket!.completedAt as string) < new Date();

                    return (
                      <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inc.maintenanceTicket?.ticketId || inc.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                          {inc.date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {inc.locationKind === "FACILITY" && (
                              <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">
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
                        <td className="px-4 py-3 whitespace-nowrap capitalize font-medium">
                          {inc.disasterType}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${handlingStatus.cls}`}>
                            {handlingStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[11px] font-semibold ${inc.primaryPicName ? "text-slate-900 dark:text-white" : "text-slate-400 italic"}`}>
                            {inc.primaryPicName || "Belum Ditugaskan"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1D5AA6] h-full rounded-full transition-all duration-300"
                                style={{ width: `${inc.progress ?? 0}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {inc.progress ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-medium ${isOverdue ? "text-rose-600 font-bold" : "text-slate-600 dark:text-slate-400"}`}>
                              {targetDateStr}
                            </span>
                            {isOverdue && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                Melewati Target
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => onSelectIncident(inc)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                              inc.status === "pending_confirmation" || inc.status === "pending_bm_approval"
                                ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200"
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {inc.status === "pending_confirmation" || inc.status === "pending_bm_approval" ? "Review" : "Detail"}
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
              const s = (inc.status as string)?.toLowerCase() || "";
              const handlingStatus = s === "resolved" || s === "closed"
                ? { label: "Selesai", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" }
                : s === "waiting_approval" || s === "verifying" || s === "pending_bm_approval"
                ? { label: "Menunggu Approval", cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" }
                : inc.primaryPicUserId || s === "in_maintenance" || s === "investigating"
                ? { label: "On Progress", cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" }
                : { label: "Belum Ditangani", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };

              const targetDateStr = inc.maintenanceTicket?.completedAt
                ? new Date(inc.maintenanceTicket.completedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Belum Ditentukan";

              const isOverdue =
                Boolean(inc.maintenanceTicket?.completedAt) &&
                s !== "resolved" &&
                s !== "closed" &&
                new Date(inc.maintenanceTicket!.completedAt as string) < new Date();

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
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${handlingStatus.cls}`}>
                      {handlingStatus.label}
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

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[10px] block">PIC Otomatis:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {inc.primaryPicName || "Belum Ditugaskan"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Target Selesai:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {targetDateStr}
                        {isOverdue && (
                          <span className="text-[9px] font-bold text-rose-600 block">Melewati Target</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {inc.date} • Progres: {inc.progress ?? 0}%
                    </div>
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-lg font-semibold text-xs transition-colors ${
                        inc.status === "pending_confirmation" || inc.status === "pending_bm_approval"
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200"
                          : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {inc.status === "pending_confirmation" || inc.status === "pending_bm_approval" ? "Review" : "Lihat Detail"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

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
