"use client";

import React from "react";
import { AlertTriangle, Clock, MapPin, Activity, Building, ShieldAlert } from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export function MonitoringDetailPanel() {
  const { disasterData, dangerCount, warningCount, theme } = useSiaga();
  const latestEq = disasterData?.latestBmkgEarthquake;
  const isDark = theme === "dark";

  return (
    <div className={`p-4 lg:p-6 space-y-6 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
      <div className="space-y-1">
        <h2 className={`text-lg font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
          Detail Pemantauan
        </h2>
        <p className="text-xs text-slate-500">Informasi spasial kejadian terkini</p>
      </div>

      {latestEq ? (
        <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-red-400" : "text-red-600"}`}>
                Gempa Bumi
              </div>
              <div className={`text-sm font-semibold mt-0.5 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                M {latestEq.magnitude} - {latestEq.title.includes('-') ? latestEq.title.split('-').slice(1).join('-').trim() : latestEq.title}
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-slate-400" />
              <div>
                <div className="text-[11px] font-bold text-slate-500">WAKTU KEJADIAN</div>
                <div className="text-xs font-medium mt-0.5">{latestEq.time}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(latestEq.timestamp || new Date(latestEq.time.replace(/ WIB| WITA| WIT/, ""))), { addSuffix: true, locale: id })}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
              <div>
                <div className="text-[11px] font-bold text-slate-500">KOORDINAT</div>
                <div className="text-xs font-medium mt-0.5">{latestEq.latitude}, {latestEq.longitude}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Kedalaman: {latestEq.depth}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-500" />
              <div>
                <div className="text-[11px] font-bold text-slate-500">POTENSI DAMPAK</div>
                <div className="text-xs font-medium mt-0.5">{latestEq.potensiText || (latestEq.potensiTsunami ? "Berpotensi Tsunami" : "Tidak berpotensi Tsunami")}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-6 text-center rounded-xl border ${isDark ? "bg-slate-800/30 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-400"}`}>
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">Tidak ada kejadian aktif saat ini.</p>
        </div>
      )}

      {/* Impact Summary */}
      <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          <Building className="w-4 h-4" /> Estimasi Area Dampak SPARTA
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${isDark ? "bg-red-900/10 border-red-900/30" : "bg-red-50 border-red-100"}`}>
            <div className="text-[10px] font-bold text-red-500 uppercase">Cabang Terindikasi</div>
            <div className={`text-2xl font-black mt-1 ${isDark ? "text-red-400" : "text-red-600"}`}>{dangerCount}</div>
          </div>
          <div className={`p-3 rounded-lg border ${isDark ? "bg-amber-900/10 border-amber-900/30" : "bg-amber-50 border-amber-100"}`}>
            <div className="text-[10px] font-bold text-amber-600 uppercase">Waspada</div>
            <div className={`text-2xl font-black mt-1 ${isDark ? "text-amber-500" : "text-amber-600"}`}>{warningCount}</div>
          </div>
        </div>
        
        <p className="text-[10px] leading-relaxed mt-4 text-slate-500 italic">
          * Catatan: Data di atas adalah estimasi spasial berdasarkan radius kejadian. Tidak merepresentasikan kerusakan fisik aktual sebelum konfirmasi dari cabang.
        </p>
      </div>

    </div>
  );
}
