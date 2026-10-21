"use client";

import React from "react";
import {
  Plus,
  Activity,
  Waves,
  Building2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Store,
} from "lucide-react";
import Link from "next/link";
import { IncidentRecord, DisasterType } from "@/types/incident";

interface CurrentUser {
  id?: string;
  name?: string;
  role?: string;
  businessRole?: string;
  systemRole?: string;
  scope?: string;
  branch?: string;
}

interface MobileIncidentHomeProps {
  currentUser?: CurrentUser | null;
  myTasksCount?: number;
  unassignedCount?: number;
  incidents: IncidentRecord[];
  onSelectIncident: (incident: IncidentRecord) => void;
  onCreateReportClick: () => void;
  onViewAllClick?: () => void;
  theme?: "dark" | "light";
}

export function MobileIncidentHome({
  currentUser,
  myTasksCount = 0,
  unassignedCount = 0,
  incidents,
  onSelectIncident,
  onCreateReportClick,
  onViewAllClick,
  theme = "light",
}: MobileIncidentHomeProps) {
  const isDark = theme === "dark";

  // Role Determination
  const isAdmin = currentUser?.systemRole === "ADMIN";
  const isHO = currentUser?.scope === "HO" && !isAdmin;
  const roleStr = (currentUser?.businessRole || currentUser?.role || "").toLowerCase();
  const isBMM = !isAdmin && !isHO && roleStr === "bm";
  const isBES = !isAdmin && !isHO && roleStr === "bes";
  const isBMS = !isAdmin && !isHO && !isBMM && !isBES;

  // Counts for Actionable Items
  const needActionCount = incidents.filter(
    (i) => i.status === "pending_confirmation" || i.status === "verifying" || i.status === "clarification_requested"
  ).length;

  const needApprovalCount = incidents.filter(
    (i) => i.status === "pending_bm_approval" || i.status === "pending_final_approval" || i.status === "awaiting_st"
  ).length;

  const inProgressCount = incidents.filter(
    (i) => i.status === "in_maintenance" || i.status === "investigating" || i.status === "in_estimation" || ((i.progress ?? 0) > 0 && (i.progress ?? 0) < 100)
  ).length;

  const getDisasterIcon = (type: DisasterType) => {
    switch (type) {
      case "flood":
      case "heavy_rain":
        return <Waves className="w-4 h-4 text-blue-500" />;
      case "earthquake":
        return <Activity className="w-4 h-4 text-[#D9272E]" />;
      default:
        return <Building2 className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_confirmation":
      case "verifying":
        return {
          label: "Cek Fisik",
          color: "bg-amber-50 text-amber-800 border border-amber-200",
        };
      case "pending_bm_approval":
      case "pending_final_approval":
      case "awaiting_st":
        return {
          label: "Approval BnM Manajer",
          color: "bg-indigo-50 text-indigo-800 border border-indigo-200",
        };
      case "in_maintenance":
      case "investigating":
      case "in_estimation":
      case "confirmed_affected":
        return {
          label: "Penanganan",
          color: "bg-blue-50 text-[#1D5AA6] border border-blue-200",
        };
      case "closed":
      case "resolved":
      case "confirmed_safe":
        return {
          label: "Selesai",
          color: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        };
      default:
        return {
          label: "Laporan Baru",
          color: "bg-slate-100 text-slate-700 border border-slate-200",
        };
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto pb-24">
      {/* 1. HEADER RINGKAS & INFORMASI CABANG */}
      <section aria-label="Ringkasan operasional mobile" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              {isAdmin
                ? "System Administrator"
                : isHO
                ? "Head Office (Nasional)"
                : isBMM
                ? `BnM Manajer • Cabang ${currentUser?.branch || ""}`
                : isBES
                ? `Petugas BES • Cabang ${currentUser?.branch || ""}`
                : `Petugas BMS • Cabang ${currentUser?.branch || ""}`}
            </span>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
              {currentUser?.name || "Petugas SPARTA"}
            </h1>
          </div>
          <div className="shrink-0 px-2.5 py-1 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold text-blue-800 dark:text-blue-300">
            {currentUser?.branch || "Nasional"}
          </div>
        </div>

        {/* 2. MAKSIMAL 2-3 KPI UTAMA SESUAI ROLE (TIDAK BERULANG) */}
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          {isBMS && (
            <>
              <Link
                href="/reports"
                className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100/70 transition-colors"
              >
                <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Tugas Saya</p>
                <p className="text-2xl font-black text-[#1D5AA6] dark:text-blue-400 mt-0.5">{myTasksCount}</p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Laporan Toko</p>
              </Link>
              <Link
                href="/reports"
                className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Shared Queue</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{unassignedCount}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Belum Ada PIC</p>
              </Link>
            </>
          )}

          {isBES && (
            <>
              <Link
                href="/reports"
                className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100/70 transition-colors"
              >
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Tugas Saya</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{myTasksCount}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Fasilitas / DC</p>
              </Link>
              <Link
                href="/reports"
                className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Shared Queue</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{unassignedCount}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Belum Ada PIC</p>
              </Link>
            </>
          )}

          {isBMM && (
            <>
              <Link
                href="/reports"
                className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300">Belum Ada PIC</p>
                <p className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-0.5">{unassignedCount}</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">Butuh Alokasi</p>
              </Link>
              <Link
                href="/reports"
                className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300">Persetujuan BnM Manajer</p>
                <p className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-0.5">{needApprovalCount}</p>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">Menunggu Keputusan</p>
              </Link>
            </>
          )}

          {(isAdmin || isHO) && (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Laporan Toko</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {incidents.filter((i) => i.locationKind !== "FACILITY").length}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Laporan Fasilitas</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {incidents.filter((i) => i.locationKind === "FACILITY").length}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 3. TOMBOL BUAT LAPORAN / AKSI UTAMA (JELAS, MIN-H 48PX) */}
      <div>
        {isBMS && (
          <button
            type="button"
            onClick={onCreateReportClick}
            className="w-full min-h-[48px] px-4 py-3 bg-[#1D5AA6] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] touch-target-min"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Laporan Toko</span>
          </button>
        )}

        {isBES && (
          <button
            type="button"
            onClick={onCreateReportClick}
            className="w-full min-h-[48px] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] touch-target-min"
          >
            <Plus className="w-5 h-5" />
            <span>Buat Laporan Fasilitas / DC</span>
          </button>
        )}

        {isBMM && (
          <Link
            href="/reports"
            className="w-full min-h-[48px] px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] touch-target-min"
          >
            <UserPlus className="w-5 h-5" />
            <span>Pusat Laporan & Approval ({unassignedCount + needApprovalCount})</span>
          </Link>
        )}

        {(isAdmin || isHO) && (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={isAdmin ? "/admin/users" : "/reports"}
              className="min-h-[48px] px-3 py-2.5 bg-slate-800 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>{isAdmin ? "Manajemen User & Role" : "Monitoring Laporan"}</span>
            </Link>
            <Link
              href="/monitoring"
              className="min-h-[48px] px-3 py-2.5 bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5"
            >
              <Activity className="w-4 h-4" />
              <span>Peta Monitoring</span>
            </Link>
          </div>
        )}
      </div>

      {/* 4. DAFTAR PEKERJAAN TERBARU (MAKSIMAL 4-5 ITEM, BERSIH) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {isBES
              ? "Pekerjaan Fasilitas Terbaru"
              : isBMM
              ? "Laporan Cabang Terbaru"
              : "Pekerjaan Toko Terbaru"}
          </h2>
          <button
            type="button"
            onClick={onViewAllClick}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada laporan aktif</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Seluruh lokasi cabang aman terkendali.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.slice(0, 5).map((inc) => {
              const s = (inc.status as string)?.toLowerCase() || "";
              const handlingStatus = s === "resolved" || s === "closed"
                ? { label: "Selesai", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" }
                : s === "waiting_approval" || s === "verifying" || s === "pending_bm_approval"
                ? { label: "Menunggu Approval", cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" }
                : inc.primaryPicUserId || s === "in_maintenance" || s === "investigating"
                ? { label: "On Progress", cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" }
                : { label: "Belum Ditangani", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };

              const targetSelesai = inc.maintenanceTicket?.completedAt
                ? new Date(inc.maintenanceTicket.completedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Belum Ditentukan";

              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className="py-3.5 flex flex-col gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl px-2 transition-colors min-h-[44px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold border border-blue-200 dark:border-blue-900">
                          {inc.maintenanceTicket?.ticketId || inc.id}
                        </span>
                        {inc.locationKind === "FACILITY" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                            {inc.locationTypeSnapshot || "DC"}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {inc.storeName || inc.storeId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="capitalize">{inc.disasterType.replace(/_/g, " ")}</span>
                        <span> • </span>
                        <span>{inc.branch}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${handlingStatus.cls}`}>
                      {handlingStatus.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-50 dark:border-slate-800/50">
                    <div>
                      <span className="text-slate-400">PIC: </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {inc.primaryPicName || "Belum Ditugaskan"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Target: </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {targetSelesai}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
