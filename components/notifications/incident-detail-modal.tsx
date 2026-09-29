"use client";

import React from "react";
import {
  X,
  Flame,
  CloudRain,
  MapPin,
  Building,
  Info,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { NotificationLog } from "@/types/notification";

interface IncidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: NotificationLog | null;
  onFlyToIncident?: (incident: NotificationLog) => void;
  theme?: "dark" | "light";
}

export function IncidentDetailModal({
  isOpen,
  onClose,
  incident,
  onFlyToIncident,
  theme = "dark",
}: IncidentDetailModalProps) {
  if (!isOpen || !incident) return null;

  const isDark = theme === "dark";
  const isEarthquake = incident.disaster_type === "earthquake";
  const stores = incident.affected_stores_sample || [];
  const totalStores = stores.length;

  const handleFlyToMap = () => {
    onClose();
    if (onFlyToIncident) {
      onFlyToIncident(incident);
    }
  };

  return (
    <div className="fixed inset-0 z-[850] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in duration-200">
      <div
        className={`border rounded-t-2xl sm:rounded-2xl w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? "bg-slate-900 border-slate-800 text-white"
            : "bg-white border-slate-200 text-slate-900 shadow-2xl"
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-5 py-4 border-b flex items-start justify-between gap-4 ${
            isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${isEarthquake ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-cyan-500"}`}>
              {isEarthquake ? <Flame className="w-5 h-5" /> : <CloudRain className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isDark
                      ? "bg-slate-800/50 text-slate-400 border-slate-700/50"
                      : "bg-slate-200/50 text-slate-600 border-slate-200"
                  }`}
                >
                  {incident.ticket_number || "LOG-NOTIF"}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                  <Clock className="w-3 h-3" />
                  {incident.sent_at ? new Date(incident.sent_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "Baru saja"}
                </span>
              </div>
              <h2 className={`text-sm sm:text-base font-bold leading-snug ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {incident.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              isDark
                ? "text-slate-500 hover:text-white hover:bg-slate-800"
                : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Incident Overview Card */}
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
              isDark
                ? "bg-slate-800/30 border-slate-700/50 text-slate-300"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className={`flex items-center gap-2 font-semibold mb-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              <Building className="w-4 h-4 text-cyan-500" />
              <span>Wilayah Terdampak: DC Cabang {incident.branch}</span>
            </div>
            <p className="opacity-90">{incident.message}</p>
          </div>

          {/* Store List (Read-Only) */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Daftar {totalStores} Gerai Terdampak (Read-Only)</span>
            </h3>
            
            <div
              className={`rounded-xl border overflow-hidden ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className={`border-b font-mono text-[10px] uppercase tracking-wider ${
                      isDark
                        ? "bg-slate-900/50 border-slate-800 text-slate-500"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    <th className="py-2.5 px-4 font-semibold">Toko</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Jarak</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Zona</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-slate-800/50" : "divide-slate-100"}`}>
                  {stores.length > 0 ? (
                    stores.map((store) => (
                      <tr
                        key={store.kode_toko}
                        className={isDark ? "bg-slate-900/20" : "bg-white"}
                      >
                        <td className="py-3 px-4">
                          <div className={`font-semibold flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            <span className={`font-mono text-[10px] px-1 py-0.5 rounded border ${isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                              {store.kode_toko}
                            </span>
                            {store.nama_toko}
                          </div>
                          {store.alamat && (
                            <div className={`text-[10px] mt-1 truncate max-w-[200px] sm:max-w-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                              {store.alamat}
                            </div>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-center font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {store.distance_km} km
                        </td>
                        <td className="py-3 px-4 text-right">
                          {store.status === "danger" ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                              BAHAYA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              WASPADA
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className={`py-6 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        Tidak ada data toko spesifik yang terdampak.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className={`flex items-center gap-2 text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Info className="w-4 h-4 text-cyan-500" />
            <span>Tindak lanjut dan verifikasi dilakukan di menu <strong>Laporan Kejadian</strong>.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleFlyToMap}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors border ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Sorot di Peta</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-600/20 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
