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
    <div className="fixed inset-0 z-[850] bg-black/50 backdrop-blur-sm flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-5 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl flex flex-col overflow-hidden transition-colors ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        } rounded-t-2xl sm:rounded-xl sm:border shadow-2xl h-[90vh] sm:h-auto sm:max-h-[85vh]`}
      >
        {/* Header Bar */}
        <div
          className={`px-5 py-4 flex items-start justify-between gap-4 ${
            isDark ? "bg-slate-900 border-b border-slate-800" : "bg-white border-b border-slate-100"
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 shrink-0 ${isEarthquake ? "text-red-500" : "text-blue-500"}`}>
              {isEarthquake ? <Flame className="w-5 h-5" /> : <CloudRain className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`font-mono text-[11px] font-bold tracking-wider ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {incident.ticket_number || "LOG-NOTIF"}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">·</span>
                <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {incident.sent_at ? new Date(incident.sent_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "Baru saja"}
                </span>
              </div>
              <h2 className={`text-base font-bold leading-snug ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                {incident.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              isDark
                ? "text-slate-400 hover:text-white hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Incident Overview */}
          <div>
            <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              <Building className="w-4 h-4 text-blue-500" />
              <span>Wilayah Terdampak: DC Cabang {incident.branch}</span>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {incident.message}
            </p>
          </div>

          {/* Store List (Read-Only) */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Daftar {totalStores} Gerai Terdampak
            </h3>
            
            <div
              className={`rounded-lg border overflow-hidden ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr
                    className={`border-b text-xs ${
                      isDark
                        ? "bg-slate-900/50 border-slate-800 text-slate-400"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <th className="py-2.5 px-4 font-medium">Toko</th>
                    <th className="py-2.5 px-4 text-center font-medium">Jarak</th>
                    <th className="py-2.5 px-4 text-right font-medium">Zona</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                  {stores.length > 0 ? (
                    stores.map((store) => (
                      <tr
                        key={store.kode_toko}
                        className={isDark ? "bg-transparent hover:bg-slate-800/30 transition-colors" : "bg-transparent hover:bg-slate-50 transition-colors"}
                      >
                        <td className="py-3 px-4">
                          <div className={`font-semibold text-xs flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            <span className={`font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {store.kode_toko}
                            </span>
                            <span>{store.nama_toko}</span>
                          </div>
                          {store.alamat && (
                            <div className={`text-[11px] mt-1 truncate max-w-[200px] sm:max-w-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                              {store.alamat}
                            </div>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-center font-mono text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {store.distance_km} km
                        </td>
                        <td className="py-3 px-4 text-right">
                          {store.status === "danger" ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                              BAHAYA
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                              WASPADA
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className={`py-8 text-center text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
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
          className={`p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          }`}
        >
          <div className={`flex items-center gap-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Tindak lanjut dan verifikasi dilakukan di menu <strong>Laporan Kejadian</strong>.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleFlyToMap}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors border ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Sorot di Peta</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2 rounded-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
