import React from "react";
import { Activity, Database, ShieldCheck } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Admin Dashboard</h2>
        <p className="text-slate-500 mt-1">Kelola master data, hak akses, dan pantau kesehatan integrasi SPARTA SIAGA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">Master Data</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Kelola ribuan data Toko, DC, dan Area/Cabang dari sistem HRIS Alfamart.</p>
          <button className="text-sm text-blue-600 font-medium">Buka Master Data &rarr;</button>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">Manajemen Akses</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Konfigurasi role pengguna dan mapping akses antar cabang/DC.</p>
          <button className="text-sm text-purple-600 font-medium">Atur Role Akses &rarr;</button>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">Integration Health</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Pantau API BMKG, USGS, Petabencana, dan WA Gateway real-time.</p>
          <button className="text-sm text-emerald-600 font-medium">Lihat Status &rarr;</button>
        </div>
      </div>
    </div>
  );
}
