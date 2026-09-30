"use client";

import React, { useState, useMemo } from "react";
import {
  Download,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  Building,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { IncidentRecord, DisasterType } from "@/types/incident";

interface IncidentHistoryViewProps {
  archivedIncidents: IncidentRecord[];
  onSelectIncident: (incident: IncidentRecord) => void;
}

export function IncidentHistoryView({
  archivedIncidents,
  onSelectIncident,
}: IncidentHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredIncidents = useMemo(() => {
    return archivedIncidents.filter((inc) => {
      const matchType = selectedType === "all" || inc.disasterType === selectedType;
      const matchSearch =
        searchQuery === "" ||
        inc.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.locationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inc.maintenanceTicket?.ticketId &&
          inc.maintenanceTicket.ticketId.toLowerCase().includes(searchQuery.toLowerCase()));
      let matchDate = true;
      if (startDate || endDate) {
        const incDateStr = inc.date;
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

      return matchType && matchSearch && matchDate;
    });
  }, [archivedIncidents, selectedType, searchQuery, startDate, endDate]);

  const handleExportCSV = () => {
    if (filteredIncidents.length === 0) return;

    const headers = [
      "No Tiket",
      "Tanggal Kejadian",
      "Nama Toko",
      "Cabang",
      "Kota",
      "Jenis Bencana",
      "Status Verifikasi",
      "Tingkat Kerusakan",
      "Teknisi Penanggung Jawab",
      "Status Akhir",
    ];

    const rows = filteredIncidents.map((inc) => [
      inc.maintenanceTicket?.ticketId || inc.id,
      inc.date,
      inc.storeName,
      inc.branch,
      inc.locationCity,
      inc.disasterType.toUpperCase(),
      inc.verification?.isDamaged ? "Ada Kerusakan" : "Toko Aman",
      inc.verification?.severity || "-",
      inc.maintenanceTicket?.assignedTechnician || "-",
      "Selesai (Archived)",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `SPARTA_Siaga_Audit_History_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Riwayat Kejadian & Laporan Arsip
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data laporan kejadian yang telah selesai ditangani 100% dan siap digunakan untuk rapat evaluasi manajemen & audit klaim asuransi retail.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredIncidents.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-sm transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel / CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama toko, cabang, kota, atau nomor tiket..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 bg-white px-2 py-1.5 border border-slate-200 rounded-xl shrink-0 overflow-x-auto w-full sm:w-auto">
          <div className="relative flex items-center">
            <span className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold text-slate-400">Dari</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[110px] text-xs p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 focus:outline-none"
            />
          </div>
          <span className="text-slate-300">-</span>
          <div className="relative flex items-center">
            <span className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-bold text-slate-400">Sampai</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[110px] text-xs p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 focus:outline-none"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-[10px] text-red-500 hover:text-red-600 font-bold ml-1 px-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 shrink-0">
          {[
            { id: "all", label: "Semua" },
            { id: "flood", label: "Banjir" },
            { id: "earthquake", label: "Gempa" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedType === cat.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Views */}
      {filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 text-center">
           <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
           <p className="text-slate-500 font-medium">Belum ada data riwayat yang tersimpan atau sesuai pencarian.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold tracking-wider text-[11px] border-b border-slate-200/60">
                  <tr>
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3">No. Tiket</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Nama Toko & Cabang</th>
                    <th className="px-4 py-3">Jenis Bencana</th>
                    <th className="px-4 py-3">Tingkat Kerusakan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredIncidents.map((inc, index) => (
                    <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-blue-600">
                        {inc.maintenanceTicket?.ticketId || inc.id}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                        {inc.date}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{inc.storeName}</div>
                        <div className="text-[11px] text-slate-400">{inc.branch} • {inc.locationCity}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="capitalize font-semibold text-slate-700">
                          {inc.disasterType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {inc.verification?.severity || "Aman"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Selesai (100%)</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => onSelectIncident(inc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-3">
            {filteredIncidents.map((inc) => (
              <div key={inc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-[10px] font-bold text-blue-600 mb-1">
                      {inc.maintenanceTicket?.ticketId || inc.id}
                    </div>
                    <div className="font-bold text-sm text-slate-900 capitalize">
                      {inc.disasterType}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    Selesai
                  </span>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {inc.storeName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cabang {inc.branch} • {inc.locationCity}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="text-[10px] text-slate-400">
                    {inc.date}
                  </div>
                  <button
                    onClick={() => onSelectIncident(inc)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
