"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building,
  CheckCircle2,
  Clock3,
  History,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  UserRoundCheck,
  Users,
  X
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface QueueItem {
  id: string;
  canonical_event_id?: string | null;
  location_kind: "STORE" | "FACILITY" | null;
  location_id?: string | null;
  location_name: string;
  branch: string;
  status: string;
  progress: number;
  primary_pic_user_id: string | null;
  primary_pic_name?: string | null;
  primary_pic_claimed_at?: string | null;
  created_at: string;
  waiting_seconds: string;
}

interface EligibleUser {
  id: string;
  name: string;
  business_role: string;
}

interface PicHistoryEntry {
  id: string;
  action: "CLAIM" | "ASSIGN" | "TRANSFER" | "RELEASE" | string;
  actor_name: string | null;
  from_user_name: string | null;
  to_user_name: string | null;
  reason: string | null;
  created_at: string;
}

interface PicDetails {
  id: string;
  branch: string;
  location_kind: "STORE" | "FACILITY" | null;
  primary_pic_user_id: string | null;
  primary_pic_name: string | null;
  eligibleUsers: EligibleUser[];
  history: PicHistoryEntry[];
}

interface CurrentUser {
  id: string;
  name: string;
  role?: string;
  businessRole?: string;
  systemRole?: string;
  scope?: string;
  branch?: string;
}

function waitingLabel(seconds: string | number) {
  const sec = Number(seconds) || 0;
  const hours = Math.floor(sec / 3600);
  if (hours >= 24) return `${Math.floor(hours / 24)} hari`;
  if (hours > 0) return `${hours} jam`;
  return `${Math.max(1, Math.floor(sec / 60))} menit`;
}

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "pending_confirmation":
    case "draft":
      return { label: "Menunggu Konfirmasi", color: "bg-amber-100 text-amber-800 border-amber-200" };
    case "field_inspection_required":
    case "field_inspection_in_progress":
      return { label: "Perlu Pemeriksaan", color: "bg-blue-100 text-blue-800 border-blue-200" };
    case "preliminary_unverified":
      return { label: "Pra-Verifikasi", color: "bg-amber-100 text-amber-900 border-amber-300" };
    case "awaiting_manager_confirmation":
      return { label: "Menunggu BnM Manajer", color: "bg-purple-100 text-purple-800 border-purple-200" };
    case "in_progress":
    case "repair_in_progress":
      return { label: "Penanganan", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
    case "resolved":
    case "completed":
      return { label: "Selesai", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    default:
      return { label: status.replace(/_/g, " "), color: "bg-slate-100 text-slate-700 border-slate-200" };
  }
}

export default function SharedQueuePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  // Filter & Navigation
  const [activeTab, setActiveTab] = useState<"unassigned" | "my" | "all">("unassigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationTypeFilter, setLocationTypeFilter] = useState<"all" | "store" | "facility">("all");

  // Modal State
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [details, setDetails] = useState<PicDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [nextUserId, setNextUserId] = useState("");
  const [actionReason, setActionReason] = useState("");

  // Load Current User
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
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/incidents/shared-queue", { cache: "no-store" });
      const text = await response.text();
      let payload: any = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Respon server tidak valid (${response.status})`);
      }
      if (!response.ok) {
        throw new Error(payload.error || `Gagal memuat antrean penugasan (HTTP ${response.status})`);
      }
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat antrean penugasan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load Modal Details
  const loadDetails = useCallback(async (item: QueueItem) => {
    setSelected(item);
    setDetails(null);
    setNextUserId("");
    setActionReason("");
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/incidents/${item.id}/pic`, { cache: "no-store" });
      const text = await response.text();
      let payload: any = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Respon detail PIC tidak valid");
      }
      if (!response.ok) throw new Error(payload.error || "Gagal memuat PIC");
      setDetails(payload.data);
    } catch (detailError) {
      toast.error(detailError instanceof Error ? detailError.message : "Gagal memuat detail PIC");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Mutations: Claim, Assign/Transfer, Release
  async function mutate(id: string, method: "POST" | "PATCH" | "DELETE", body?: object) {
    setWorking(id);
    try {
      const response = await fetch(`/api/incidents/${id}/pic`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      let payload: any = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Respon aksi PIC tidak valid");
      }

      if (!response.ok) {
        if (response.status === 409 && method === "POST") {
          throw new Error("Laporan sudah diambil atau ditugaskan ke petugas lain");
        }
        throw new Error(payload.error || "Gagal memperbarui status PIC");
      }

      if (method === "POST") {
        toast.success("Anda berhasil mengambil tugas sebagai PIC utama");
      } else if (method === "PATCH") {
        toast.success("PIC berhasil ditetapkan / dialihkan");
      } else {
        toast.success("PIC berhasil dilepas kembali ke antrean");
      }

      await load();
      if (selected && selected.id === id) {
        await loadDetails({
          ...selected,
          primary_pic_user_id: method === "DELETE" ? null : (payload.data?.currentPicUserId ?? selected.primary_pic_user_id),
        });
      }
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Perubahan PIC gagal");
    } finally {
      setWorking(null);
    }
  }

  // Role permissions
  const isBmmOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.businessRole || currentUser.role || "").toLowerCase();
    return currentUser.systemRole === "ADMIN" || r === "bm";
  }, [currentUser]);

  const canClaim = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.businessRole || currentUser.role || "").toLowerCase();
    return r === "bms" || r === "bes";
  }, [currentUser]);

  // Tab Item Counts
  const counts = useMemo(() => {
    const unassignedCount = items.filter((i) => !i.primary_pic_user_id).length;
    const myCount = currentUser?.id
      ? items.filter((i) => i.primary_pic_user_id === currentUser.id).length
      : 0;
    return {
      unassigned: unassignedCount,
      my: myCount,
      all: items.length,
    };
  }, [items, currentUser]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === "unassigned" && item.primary_pic_user_id) return false;
      if (activeTab === "my" && item.primary_pic_user_id !== currentUser?.id) return false;

      // Location type filter
      if (locationTypeFilter === "store" && item.location_kind === "FACILITY") return false;
      if (locationTypeFilter === "facility" && item.location_kind !== "FACILITY") return false;

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.location_name?.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesBranch = item.branch?.toLowerCase().includes(q);
        const matchesPic = item.primary_pic_name?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesBranch && !matchesPic) return false;
      }

      return true;
    });
  }, [items, activeTab, locationTypeFilter, searchQuery, currentUser]);

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#1D5AA6]/10 text-[#1D5AA6]">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Shared Queue &bull; Penugasan
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Pengelolaan PIC dan alokasi tim operasional (BMS untuk Toko, BES untuk Fasilitas/DC).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={load}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 touch-target-min"
            >
              <Clock3 className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900">
              Cabang: <span className="font-extrabold">{currentUser?.branch || "Nasional"}</span>
            </div>
          </div>
        </header>

        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("unassigned")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all touch-target-min ${
              activeTab === "unassigned"
                ? "bg-[#1D5AA6] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>Belum Ditugaskan</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === "unassigned" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {counts.unassigned}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("my")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all touch-target-min ${
              activeTab === "my"
                ? "bg-[#1D5AA6] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Tugas Saya</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === "my" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
              }`}
            >
              {counts.my}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all touch-target-min ${
              activeTab === "all"
                ? "bg-[#1D5AA6] text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Semua Tugas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {counts.all}
            </span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode/nama lokasi, nomor laporan, atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D5AA6]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={locationTypeFilter}
              onChange={(e) => setLocationTypeFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#1D5AA6]"
            >
              <option value="all">Semua Tipe Lokasi</option>
              <option value="store">Gerai / Toko (BMS)</option>
              <option value="facility">Fasilitas / DC (BES)</option>
            </select>
          </div>
        </div>

        {/* Content Section: Loading, Error, Empty, Cards & Table */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-[#1D5AA6] animate-spin" />
            <span className="text-sm font-semibold text-slate-600">Memuat antrean laporan...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-50/70 border border-red-200 rounded-2xl space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-bold text-red-900">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-xs"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <UserRoundCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm md:text-base font-bold text-slate-700">
              {activeTab === "unassigned"
                ? "Tidak ada laporan yang belum ditugaskan"
                : activeTab === "my"
                ? "Anda belum memiliki tugas laporan aktif"
                : "Tidak ada laporan ditemukan"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeTab === "unassigned"
                ? "Seluruh laporan operasional di cabang Anda telah memiliki PIC atau sedang diproses."
                : activeTab === "my"
                ? "Ambil tugas dari tab 'Belum Ditugaskan' atau tunggu penunjukan PIC oleh BnM Manajer cabang."
                : "Coba sesuaikan kata kunci pencarian atau filter lokasi."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< 768px) */}
            <div className="grid grid-cols-1 gap-3.5 md:hidden">
              {filteredItems.map((item) => {
                const statusBadge = getStatusBadge(item.status);
                const isMyTask = item.primary_pic_user_id === currentUser?.id;
                const isFacility = item.location_kind === "FACILITY";

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isFacility ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isFacility ? "FASILITAS / DC" : "TOKO"}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1 truncate">
                          {item.location_name}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.id} • Cabang: <span className="font-semibold text-slate-700">{item.branch}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{waitingLabel(item.waiting_seconds)}</span>
                      </div>
                    </div>

                    {/* PIC Status Bar */}
                    <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Status PIC:</span>
                      {item.primary_pic_user_id ? (
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>{item.primary_pic_name || "Ditugaskan"}</span>
                          {isMyTask && (
                            <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-extrabold">
                              Saya
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded text-[11px]">
                          Belum Ada PIC
                        </span>
                      )}
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="pt-1 flex items-center gap-2">
                      {!item.primary_pic_user_id && canClaim && (
                        <button
                          onClick={() => mutate(item.id, "POST")}
                          disabled={working === item.id}
                          className="flex-1 py-2.5 px-3 bg-[#1D5AA6] text-white rounded-xl text-xs font-bold hover:bg-[#123B6D] transition-colors flex items-center justify-center gap-1.5 touch-target-min"
                        >
                          {working === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          <span>Ambil Tugas</span>
                        </button>
                      )}

                      {!item.primary_pic_user_id && isBmmOrAdmin && !canClaim && (
                        <button
                          onClick={() => loadDetails(item)}
                          className="flex-1 py-2.5 px-3 bg-[#1D5AA6] text-white rounded-xl text-xs font-bold hover:bg-[#123B6D] transition-colors flex items-center justify-center gap-1.5 touch-target-min"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Tunjuk PIC</span>
                        </button>
                      )}

                      <button
                        onClick={() => loadDetails(item)}
                        className="flex-1 py-2.5 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 touch-target-min"
                      >
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span>Kelola PIC</span>
                      </button>

                      <Link
                        href={`/reports?incidentId=${encodeURIComponent(item.id)}`}
                        className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center touch-target-min"
                        title="Lihat Detail Laporan"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-5">Lokasi & Laporan</th>
                    <th className="py-3.5 px-4">Tipe</th>
                    <th className="py-3.5 px-4">Status Laporan</th>
                    <th className="py-3.5 px-4">Waktu Tunggu</th>
                    <th className="py-3.5 px-4">PIC Ditugaskan</th>
                    <th className="py-3.5 px-5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const statusBadge = getStatusBadge(item.status);
                    const isMyTask = item.primary_pic_user_id === currentUser?.id;
                    const isFacility = item.location_kind === "FACILITY";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-sm text-slate-900">
                            {item.location_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {item.id} • Cabang {item.branch}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isFacility ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isFacility ? "Fasilitas / DC" : "Gerai Toko"}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                            <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                            {waitingLabel(item.waiting_seconds)}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {item.primary_pic_user_id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">
                                {item.primary_pic_name || "Ditugaskan"}
                              </span>
                              {isMyTask && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-extrabold">
                                  Saya
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              Belum Ditugaskan
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {!item.primary_pic_user_id && canClaim && (
                              <button
                                onClick={() => mutate(item.id, "POST")}
                                disabled={working === item.id}
                                className="px-3 py-1.5 bg-[#1D5AA6] text-white rounded-lg text-xs font-bold hover:bg-[#123B6D] transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                {working === item.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <UserPlus className="w-3.5 h-3.5" />
                                )}
                                <span>Ambil Tugas</span>
                              </button>
                            )}

                            {!item.primary_pic_user_id && isBmmOrAdmin && !canClaim && (
                              <button
                                onClick={() => loadDetails(item)}
                                className="px-3 py-1.5 bg-[#1D5AA6] text-white rounded-lg text-xs font-bold hover:bg-[#123B6D] transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Tunjuk PIC</span>
                              </button>
                            )}

                            <button
                              onClick={() => loadDetails(item)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              <span>Kelola PIC</span>
                            </button>

                            <Link
                              href={`/reports?incidentId=${encodeURIComponent(item.id)}`}
                              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold"
                            >
                              Detail →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Modal: Kelola & Histori PIC */}
        {selected && (
          <div
            className="fixed inset-0 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pic-modal-title"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
          >
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
                <div>
                  <h3 id="pic-modal-title" className="font-bold text-sm md:text-base text-slate-900">
                    Kelola PIC Laporan
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs md:max-w-sm">
                    {selected.location_name} • {selected.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 text-xs">
                {loadingDetails ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1D5AA6]" />
                    <span className="text-slate-500">Memuat rincian PIC...</span>
                  </div>
                ) : (
                  <>
                    {/* Current PIC Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        PIC Aktif Saat Ini
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="font-extrabold text-sm text-slate-800">
                          {details?.primary_pic_name || "Belum Ditetapkan (Antrean Bebas)"}
                        </div>
                        {details?.primary_pic_user_id && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Form */}
                    {isBmmOrAdmin ? (
                      <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                        <div className="font-bold text-blue-950 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-blue-700" />
                          <span>{details?.primary_pic_user_id ? "Alihkan PIC Laporan" : "Tunjuk PIC Laporan"}</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                            Pilih Petugas Berwenang ({selected.location_kind === "FACILITY" ? "Tim BES" : "Tim BMS"}):
                          </label>
                          <select
                            value={nextUserId}
                            onChange={(e) => setNextUserId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                          >
                            <option value="">-- Pilih Petugas PIC --</option>
                            {(details?.eligibleUsers || []).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.business_role?.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                            Alasan Penunjukan / Pengalihan (Opsional):
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Beban kerja toko, jadwal shift..."
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() =>
                              mutate(selected.id, "PATCH", {
                                nextUserId,
                                reason: actionReason,
                              })
                            }
                            disabled={!nextUserId || working === selected.id}
                            className="flex-1 py-2 px-3 bg-[#1D5AA6] text-white rounded-lg text-xs font-bold hover:bg-[#123B6D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            {working === selected.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            )}
                            <span>{details?.primary_pic_user_id ? "Alihkan PIC" : "Tugaskan Petugas"}</span>
                          </button>

                          {details?.primary_pic_user_id && (
                            <button
                              onClick={() =>
                                mutate(selected.id, "DELETE", {
                                  reason: actionReason || "Dilepas oleh BnM Manajer/Admin",
                                })
                              }
                              disabled={working === selected.id}
                              className="py-2 px-3 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Lepas PIC</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Petugas Standar (Self-Service Release jika sedang menjadi PIC) */
                      details?.primary_pic_user_id === currentUser?.id && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <div className="font-bold text-amber-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Lepaskan Tugas PIC Ini?</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Jika Anda melepaskan tugas ini, laporan akan kembali ke antrean &apos;Belum Ditugaskan&apos; dan dapat diambil oleh petugas cabang lainnya.
                          </p>
                          <button
                            onClick={() =>
                              mutate(selected.id, "DELETE", {
                                reason: "Dilepaskan mandiri oleh petugas",
                              })
                            }
                            disabled={working === selected.id}
                            className="w-full py-2 px-3 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Lepaskan Tugas Saya</span>
                          </button>
                        </div>
                      )
                    )}

                    {/* PIC History Timeline */}
                    <div className="space-y-3 pt-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-500" />
                        <span>Riwayat Penugasan</span>
                      </div>

                      {details?.history && details.history.length > 0 ? (
                        <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-2">
                          {details.history.map((h) => (
                            <div key={h.id} className="relative space-y-0.5 text-xs">
                              <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">
                                  {h.action === "CLAIM"
                                    ? "Diambil Sendiri"
                                    : h.action === "ASSIGN"
                                    ? "Ditugaskan"
                                    : h.action === "TRANSFER"
                                    ? "Dialihkan"
                                    : "Dilepaskan"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(h.created_at).toLocaleString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                Aktor: <span className="font-medium">{h.actor_name || "Sistem"}</span>
                                {h.to_user_name && ` → PIC: ${h.to_user_name}`}
                              </div>
                              {h.reason && (
                                <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                                  &quot;{h.reason}&quot;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-center text-xs">
                          Belum ada riwayat perubahan PIC untuk laporan ini.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-end">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
