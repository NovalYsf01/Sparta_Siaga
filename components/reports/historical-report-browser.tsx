"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  Download,
  Filter,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { IncidentRecord, DisasterType, IncidentStatus } from "@/types/incident";
import { getReportSourceInfo } from "@/lib/display-formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface HistoricalReportBrowserProps {
  activeRole: string;
  onSelectIncident: (inc: IncidentRecord) => void;
}

export function HistoricalReportBrowser({ activeRole, onSelectIncident }: HistoricalReportBrowserProps) {
  const [data, setData] = useState<IncidentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [disasterType, setDisasterType] = useState("all");
  const [reportOrigin, setReportOrigin] = useState("all");
  
  const totalPages = Math.ceil(total / limit) || 1;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status,
        disasterType,
        reportOrigin,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });

      const res = await fetch(`/api/incidents/history?${params.toString()}`);
      const json = await res.json();
      
      if (json.data) {
        setData(json.data);
        setTotal(json.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, disasterType, reportOrigin, startDate, endDate]);

  useEffect(() => {
    // Debounce search
    const delay = setTimeout(() => {
      fetchHistory();
    }, 400);
    return () => clearTimeout(delay);
  }, [fetchHistory]);

  const handleExport = () => {
    const params = new URLSearchParams({
      search,
      status,
      disasterType,
      reportOrigin,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    });
    window.open(`/api/incidents/export?${params.toString()}`, '_blank');
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "pending_confirmation": return { label: "Perlu Konfirmasi", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
      case "verifying": return { label: "Verifikasi", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
      case "investigating": return { label: "Investigasi", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
      case "closed": return { label: "Ditutup (CLOSED)", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" };
      case "resolved": return { label: "Selesai", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
      case "archived": return { label: "Arsip", color: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
      case "expired_unhandled": return { label: "Tidak Ditindaklanjuti", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700" };
      case "confirmed_safe": return { label: "Dinyatakan Aman", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" };
      case "rejected_invalid": return { label: "Ditolak", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800" };
      default: return { label: "Unknown", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <History className="w-5 h-5 text-emerald-600" />
            Riwayat Laporan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Telusuri dan ekspor histori seluruh laporan kejadian bencana.
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-10 px-4 gap-1.5 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Data (CSV)
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Laporan, Toko, Cabang..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <Select
            value={status}
            onValueChange={(val) => {
              if (val) {
                setStatus(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter status riwayat"
              className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <SelectValue placeholder="Semua Status Riwayat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status Riwayat</SelectItem>
              <SelectItem value="closed">Ditutup (CLOSED)</SelectItem>
              <SelectItem value="resolved">Selesai (Resolved)</SelectItem>
              <SelectItem value="archived">Diarsipkan</SelectItem>
              <SelectItem value="expired_unhandled">Tidak Ditindaklanjuti</SelectItem>
              <SelectItem value="confirmed_safe">Dinyatakan Aman</SelectItem>
              <SelectItem value="rejected_invalid">Ditolak</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={disasterType}
            onValueChange={(val) => {
              if (val) {
                setDisasterType(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter jenis kejadian"
              className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <SelectValue placeholder="Semua Jenis Kejadian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis Kejadian</SelectItem>
              <SelectItem value="earthquake">Gempa Bumi</SelectItem>
              <SelectItem value="flood">Banjir</SelectItem>
              <SelectItem value="fire">Kebakaran</SelectItem>
              <SelectItem value="other">Lainnya</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={reportOrigin}
            onValueChange={(val) => {
              if (val) {
                setReportOrigin(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger
              aria-label="Filter asal laporan"
              className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <SelectValue placeholder="Semua Asal Laporan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Asal Laporan</SelectItem>
              <SelectItem value="manual">Manual (Cabang)</SelectItem>
              <SelectItem value="automatic_earthquake">Otomatis (Sistem)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 min-h-[300px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">No. Laporan</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Toko / Cabang</th>
                <th className="px-4 py-3">Kejadian</th>
                <th className="px-4 py-3">Asal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">Tidak ada data riwayat yang sesuai filter.</td>
                </tr>
              ) : (
                data.map((inc) => {
                  const stat = getStatusBadge(inc.status);
                  return (
                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                        {inc.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-500">
                        {new Date(inc.createdAt || inc.date).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{inc.storeName}</div>
                        <div className="text-[10px] text-slate-500">{inc.branch} • {inc.locationCity}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap capitalize font-medium">
                        {inc.disasterType}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const src = getReportSourceInfo(inc.reportOrigin);
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium tracking-wide ${src.badgeCls}`}>
                              {src.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${stat.color}`}>
                          {(inc.status === "closed" || inc.status === "resolved") && <CheckCircle2 className="w-3 h-3" />}
                          {stat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectIncident(inc)}
                          className="h-8 gap-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Data
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">
              Menampilkan <span className="font-bold text-slate-900 dark:text-white">{(page - 1) * limit + 1}</span> - <span className="font-bold text-slate-900 dark:text-white">{Math.min(page * limit, total)}</span> dari <span className="font-bold text-slate-900 dark:text-white">{total}</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                aria-label="Halaman berikutnya"
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
