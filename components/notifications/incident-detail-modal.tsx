"use client";

import React from "react";
import {
  X,
  Flame,
  CloudRain,
  MapPin,
  Building,
  Info,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { NotificationLog } from "@/types/notification";

interface IncidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: NotificationLog | null;
  onFlyToIncident?: (incident: NotificationLog) => void;
  onOpenReport?: (report: any) => void;
  relatedReport?: any;
  theme?: "dark" | "light";
}

export function IncidentDetailModal({
  isOpen,
  onClose,
  incident,
  onFlyToIncident,
  onOpenReport,
  relatedReport,
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

  // Honest Delivery Status Mapping (Requirement 25)
  const deliveryStatus = incident.delivery_status || "not_configured";
  const deliveryBadge = (() => {
    switch (deliveryStatus) {
      case "sent":
      case "delivered":
        return { text: "Terkirim", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "pending":
      case "queued":
        return { text: "Menunggu Pengiriman", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case "failed":
        return { text: "Gagal Dikirim", class: "bg-red-500/10 text-red-400 border-red-500/20" };
      case "not_configured":
      default:
        return { text: "Provider Belum Terhubung", class: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    }
  })();

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
              <div className="flex flex-wrap items-center gap-2 mb-1">
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
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${deliveryBadge.class}`}>
                  {deliveryBadge.text}
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
          {/* Status System Banner */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Status Sistem: <strong>Tercatat di Sistem</strong></span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Kanal: {deliveryBadge.text}
            </span>
          </div>

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
              Daftar {totalStores} Gerai di Zona Pantau
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
                          {store.status === "PRIORITY_MONITOR" ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                              PRIORITAS PANTAU
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                              PANTAU
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

        {/* Footer (Requirements 21 & 24: Awareness actions only) */}
        <div
          className={`p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          }`}
        >
          <div className={`flex items-center gap-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Notifikasi ini bersifat awareness. Pengelolaan lifecycle dilakukan di menu <strong>Laporan Kejadian</strong>.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Requirement 24: Only show Lihat Laporan Terkait if report exists */}
            {relatedReport && onOpenReport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReport(relatedReport);
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Lihat Laporan Terkait</span>
              </button>
            )}

            <button
              onClick={handleFlyToMap}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors border ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Lihat di Peta</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2 rounded-md text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
