"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building,
  Building2,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  MapPin,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
  UserPlus,
  UserRoundX,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSiaga } from "@/components/layout/siaga-context";
import { IncidentKpiRow } from "@/components/dashboard/incident-kpi-row";
import { ActiveIncidentsTable } from "@/components/dashboard/active-incidents-table";
import { MobileIncidentHome } from "@/components/mobile/mobile-incident-home";

interface CurrentUser {
  id: string;
  name: string;
  role?: string;
  businessRole?: string;
  systemRole?: string;
  scope?: string;
  branch?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [queue, setQueue] = useState<
    Array<{ id: string; waiting_seconds: string; primary_pic_user_id: string | null; location_kind?: string }>
  >([]);

  const {
    incidentStats,
    selectedCategory,
    setSelectedCategory,
    disasterData,
    dangerCount,
    activeIncidents,
    handleSelectIncidentForDetail,
    handleOpenReportModal,
    theme,
  } = useSiaga();

  // Load Current User Profile
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      })
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
        else if (data?.id) setCurrentUser(data);
      })
      .catch((err) => console.error("Failed to load user profile:", err));
  }, []);

  // Load Queue Items
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/incidents/shared-queue", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return { data: [] };
        const text = await response.text();
        return text ? JSON.parse(text) : { data: [] };
      })
      .then((payload) => setQueue(payload.data || []))
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") setQueue([]);
      });
    return () => controller.abort();
  }, []);

  // Role Determination
  const roleInfo = useMemo(() => {
    const isAdmin = currentUser?.systemRole === "ADMIN";
    const isHO = currentUser?.scope === "HO" && !isAdmin;
    const r = (currentUser?.businessRole || currentUser?.role || "").toLowerCase();
    const isBMM = !isAdmin && !isHO && r === "bm";
    const isBES = !isAdmin && !isHO && r === "bes";
    const isBMS = !isAdmin && !isHO && !isBMM && !isBES;

    return { isAdmin, isHO, isBMM, isBES, isBMS, roleCode: r };
  }, [currentUser]);

  // Derived Metrics
  const storeReports = useMemo(
    () => activeIncidents.filter((incident) => incident.locationKind !== "FACILITY"),
    [activeIncidents]
  );
  const facilityReports = useMemo(
    () => activeIncidents.filter((incident) => incident.locationKind === "FACILITY"),
    [activeIncidents]
  );
  const unassigned = useMemo(
    () => queue.filter((item) => !item.primary_pic_user_id).length,
    [queue]
  );
  const myTasks = useMemo(
    () => (currentUser?.id ? queue.filter((item) => item.primary_pic_user_id === currentUser.id).length : 0),
    [queue, currentUser]
  );

  const oldestWaiting = queue.length ? Math.max(...queue.map((item) => Number(item.waiting_seconds))) : 0;
  const oldestLabel =
    oldestWaiting >= 86400
      ? `${Math.floor(oldestWaiting / 86400)} hari`
      : oldestWaiting >= 3600
      ? `${Math.floor(oldestWaiting / 3600)} jam`
      : `${Math.floor(oldestWaiting / 60)} menit`;

  return (
    <div className="w-full">
      {/* MOBILE DASHBOARD (< 1024px) */}
      <div className="block lg:hidden">
        <MobileIncidentHome
          currentUser={currentUser}
          myTasksCount={myTasks}
          unassignedCount={unassigned}
          incidents={
            roleInfo.isBES
              ? facilityReports
              : roleInfo.isBMS
              ? storeReports
              : activeIncidents
          }
          onSelectIncident={handleSelectIncidentForDetail}
          onCreateReportClick={handleOpenReportModal}
          onViewAllClick={() => router.push("/reports")}
          theme={theme}
        />
      </div>

      {/* DESKTOP DASHBOARD (>= 1024px) */}
      <div className="hidden lg:block p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Header: Contextual Role Welcome & Quick Actions */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#1D5AA6]/10 text-[#1D5AA6]">
                {roleInfo.isAdmin ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : roleInfo.isBMM ? (
                  <Users className="w-5 h-5" />
                ) : roleInfo.isBES ? (
                  <Building2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Store className="w-5 h-5" />
                )}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {roleInfo.isAdmin
                  ? "Pusat Kendali Administrasi & Audit Nasional"
                  : roleInfo.isHO
                  ? "Command Center Head Office (Nasional)"
                  : roleInfo.isBMM
                  ? `Panel Supervisi Cabang ${currentUser?.branch || ""}`
                  : roleInfo.isBES
                  ? `Dashboard Fasilitas & Gedung (BES) • Cabang ${currentUser?.branch || ""}`
                  : `Dashboard Operasional Toko (BMS) • Cabang ${currentUser?.branch || ""}`}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 ml-9">
              {roleInfo.isAdmin
                ? "Manajemen 67 fasilitas, rekonsiliasi data gempa, dan tata kelola hak akses cabang."
                : roleInfo.isHO
                ? "Pemantauan komprehensif seluruh gerai dan fasilitas nasional secara read-only."
                : roleInfo.isBMM
                ? "Distribusi penugasan PIC tim BMS/BES, verifikasi laporan, dan persetujuan penanganan."
                : roleInfo.isBES
                ? "Penanganan laporan insiden khusus DC, Warehouse, Depo, Bulky, dan Store Hub."
                : "Penanganan laporan insiden gerai toko resmi Alfamart di wilayah cabang Anda."}
            </p>
          </div>

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-3">
            {roleInfo.isBMM && (
              <Link
                href="/reports/shared-queue?tab=unassigned"
                className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Distribusi PIC ({unassigned})</span>
              </Link>
            )}

            {roleInfo.isAdmin && (
              <>
                <Link
                  href="/admin/facilities"
                  className="px-4 py-2.5 bg-[#1D5AA6] text-white rounded-xl text-xs font-bold hover:bg-[#123B6D] transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Building className="w-4 h-4" />
                  <span>Master Fasilitas</span>
                </Link>
                <Link
                  href="/admin/reconciliation"
                  className="px-4 py-2.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  <span>Rekonsiliasi</span>
                </Link>
              </>
            )}

            {(roleInfo.isBMS || roleInfo.isBES) && (
              <>
                <Link
                  href="/reports/shared-queue?tab=my"
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Tugas Saya ({myTasks})</span>
                </Link>

                <button
                  onClick={() => handleOpenReportModal()}
                  className="px-4 py-2.5 bg-[#1D5AA6] text-white rounded-xl text-xs font-bold hover:bg-[#123B6D] transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{roleInfo.isBES ? "Buat Laporan Fasilitas" : "Buat Laporan Toko"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* TOP SITUATION SUMMARY (4 KPI Cards) */}
        <IncidentKpiRow
          stats={incidentStats}
          dangerCount={dangerCount}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* ROLE-AWARE METRIC STRIP */}
        <section
          className="grid grid-cols-2 gap-3 xl:grid-cols-5"
          aria-label="Ringkasan lokasi dan PIC"
        >
          {roleInfo.isBES ? (
            /* BES Focused Strip */
            <>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Tugas PIC Saya</p>
                  <UserCheck className="h-4 w-4 text-[#1D5AA6]" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[#1D5AA6]">{myTasks}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Laporan Fasilitas</p>
                  <Building2 className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-700">
                  {facilityReports.length}
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Antrean Belum Ada PIC</p>
                  <UserRoundX className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-amber-600">{unassigned}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Waktu Tunggu Terlama</p>
                  <Clock3 className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{oldestLabel}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Kategori Fasilitas</p>
                  <Building className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-600">DC, Depo, Gudang, Hub</p>
              </article>
            </>
          ) : roleInfo.isBMS ? (
            /* BMS Focused Strip */
            <>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Tugas PIC Saya</p>
                  <UserCheck className="h-4 w-4 text-[#1D5AA6]" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[#1D5AA6]">{myTasks}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Laporan Toko Aktif</p>
                  <Store className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                  {storeReports.length}
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Antrean Bebas (Bisa Diambil)</p>
                  <UserRoundX className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-amber-600">{unassigned}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Waktu Tunggu Terlama</p>
                  <Clock3 className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{oldestLabel}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Peta & Episentrum</p>
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <Link href="/monitoring" className="mt-3 block text-xs font-bold text-[#1D5AA6] hover:underline">
                  Buka Peta Monitoring →
                </Link>
              </article>
            </>
          ) : (
            /* BMM, Admin, HO Strip */
            [
              { label: "Laporan Toko", value: storeReports.length, icon: Store },
              { label: "Laporan Fasilitas", value: facilityReports.length, icon: Building2 },
              { label: "Total Antrean Penugasan", value: queue.length, icon: Activity },
              { label: "Belum Ditugaskan PIC", value: unassigned, icon: UserRoundX },
              { label: "Waktu Tunggu Terlama", value: oldestLabel, icon: Clock3 },
            ].map((item) => (
              <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                  <item.icon className="h-4 w-4 text-[#1D5AA6]" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{item.value}</p>
              </article>
            ))
          )}
        </section>

        {/* MAIN HERO: ACTIVE SITUATION PANEL */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#123B6D] dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Situasi Gempa & Kebencanaan Terkini</span>
              </h3>
              <Link
                href="/monitoring"
                className="text-xs font-bold text-[#1D5AA6] hover:text-[#123B6D] flex items-center gap-1"
              >
                <span>Lihat Peta Spasial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

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
                      {disasterData.latestBmkgEarthquake.time} • Kedalaman{" "}
                      {disasterData.latestBmkgEarthquake.depth}
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
                    <div className="text-[10px] text-slate-500">
                      Tidak ada peringatan bencana aktif saat ini.
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Laporan Baru */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {roleInfo.isBES
                      ? "Laporan Fasilitas Terbaru"
                      : roleInfo.isBMS
                      ? "Laporan Toko Terbaru"
                      : "Laporan Baru Masuk"}
                  </h4>
                  <Link
                    href="/reports"
                    className="text-[11px] font-bold text-[#1D5AA6] hover:underline"
                  >
                    Semua Laporan →
                  </Link>
                </div>

                {(roleInfo.isBES ? facilityReports : roleInfo.isBMS ? storeReports : activeIncidents)
                  .slice(0, 3)
                  .map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => handleSelectIncidentForDetail(inc)}
                      className="group cursor-pointer p-3 mb-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[#1D5AA6]/30 hover:bg-[#EAF2FB] dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] flex items-center gap-1.5">
                          {inc.locationKind === "FACILITY" && (
                            <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">
                              DC
                            </span>
                          )}
                          <span className="truncate">{inc.storeName}</span>
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            inc.status === "verifying" || inc.status === "pending_confirmation"
                              ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                              : "bg-[#EAF2FB] text-[#1D5AA6]"
                          }`}
                        >
                          {inc.status === "verifying" || inc.status === "pending_confirmation"
                            ? "Verifikasi"
                            : "Penanganan"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {inc.disasterType === "flood"
                          ? "Banjir"
                          : inc.disasterType === "earthquake"
                          ? "Gempa"
                          : inc.disasterType}{" "}
                        • {inc.branch} • {inc.date}
                      </div>
                    </div>
                  ))}

                {(roleInfo.isBES ? facilityReports : roleInfo.isBMS ? storeReports : activeIncidents)
                  .length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-8">
                    Belum ada laporan aktif dalam kategori ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY SECTION: REPORTS REQUIRING ATTENTION */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {roleInfo.isBES
                  ? "Daftar Laporan Fasilitas Memerlukan Perhatian"
                  : roleInfo.isBMS
                  ? "Daftar Laporan Gerai Toko Memerlukan Perhatian"
                  : "Laporan Memerlukan Perhatian Operasional"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {roleInfo.isBES
                  ? "Menampilkan insiden aktif di Distribution Center, Warehouse, Depo, dan Bulky."
                  : roleInfo.isBMS
                  ? "Menampilkan insiden aktif di Gerai Toko Alfamart cabang Anda."
                  : "Menampilkan seluruh insiden aktif yang memerlukan konfirmasi, verifikasi, atau perbaikan."}
              </p>
            </div>

            <Link
              href="/reports/shared-queue"
              className="px-3.5 py-2 text-xs font-bold text-[#1D5AA6] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              Buka Penugasan Cabang →
            </Link>
          </div>

          <ActiveIncidentsTable
            incidents={
              roleInfo.isBES
                ? facilityReports
                : roleInfo.isBMS
                ? storeReports
                : activeIncidents
            }
            onSelectIncident={handleSelectIncidentForDetail}
            onCreateReportClick={handleOpenReportModal}
            hideAction={false}
          />
        </div>
      </div>
    </div>
  );
}
