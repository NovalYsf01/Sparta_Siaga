"use client";

import React, { useEffect, useState } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { Bell, Monitor, Moon, Sun, Smartphone, Server } from "lucide-react";
import { getNotificationPermission, requestDesktopNotificationPermission, triggerDesktopPopup } from "@/lib/desktop-notification";

export default function SettingsPage() {
  const { theme, handleToggleTheme } = useSiaga();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPermission(getNotificationPermission());
    }
  }, []);

  const handleRequestDesktopPermission = async () => {
    const res = await requestDesktopNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      triggerDesktopPopup({
        id: "perm-settings-granted",
        title: "Izin Notifikasi Aktif",
        body: "Anda akan menerima peringatan darurat melalui pop-up desktop.",
        disasterType: "earthquake"
      });
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 lg:p-8 space-y-8 pb-20 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
      <div>
        <h1 className={`text-2xl font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
          Pengaturan
        </h1>
        <p className="text-sm text-slate-500">
          Kelola preferensi aplikasi SPARTA Siaga.
        </p>
      </div>

      <div className="space-y-6">
        {/* TAMPILAN / APLIKASI */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Tampilan / Aplikasi
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <div className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Tema Gelap (Dark Mode)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Ubah antarmuka aplikasi menjadi mode gelap</div>
                </div>
              </div>
              <button
                onClick={handleToggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDark ? "bg-[#1D5AA6]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDark ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* NOTIFIKASI */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Notifikasi
            </h2>
          </div>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Notifikasi Desktop (Pop-up)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Tampilkan peringatan darurat walau aplikasi terminimalisir</div>
                </div>
              </div>
              {permission === "granted" ? (
                <span className="text-xs font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">Aktif</span>
              ) : (
                <button
                  onClick={handleRequestDesktopPermission}
                  className="px-4 py-2 bg-[#1D5AA6] hover:bg-[#123B6D] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Izinkan
                </button>
              )}
            </div>
          </div>
        </section>

        {/* INFORMASI SISTEM */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Informasi Sistem
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500">Versi Aplikasi</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">SPARTA Siaga v2.1.0</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-500">Geospatial Engine</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Leaflet.js + Esri</span>
            </div>
          </div>
        </section>

        {/* SUMBER DATA & API */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Sumber Data & API
            </h2>
          </div>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Primary official Indonesian seismic information</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md self-start sm:self-center border border-emerald-100 dark:border-emerald-800">Terkonfigurasi</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  USGS
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Secondary / redundant seismic information</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md self-start sm:self-center border border-emerald-100 dark:border-emerald-800">Terkonfigurasi</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  Open-Meteo
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Weather forecast / precipitation model</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md self-start sm:self-center border border-emerald-100 dark:border-emerald-800">Terkonfigurasi</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  RainViewer
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Radar observation / imagery</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md self-start sm:self-center border border-emerald-100 dark:border-emerald-800">Terkonfigurasi</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  GloFAS / Flood API
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Regional hydrological / river discharge model</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md self-start sm:self-center border border-emerald-100 dark:border-emerald-800">Terkonfigurasi</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  USGS
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Secondary / redundant seismic information</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md self-start sm:self-center border border-emerald-100 dark:border-emerald-800">Terkonfigurasi</span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  PetaBencana
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Field / community report source</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md self-start sm:self-center border border-emerald-100 dark:border-emerald-800">Terkonfigurasi</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
