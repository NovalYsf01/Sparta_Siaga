import React from "react";
import Link from "next/link";
import { Database, ShieldCheck, Activity, Terminal } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <h1 className="font-bold text-sm">SPARTA System Admin</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <Link href="/admin/master" className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <Database className="w-4 h-4 text-slate-500" /> Master Data
          </Link>
          <Link href="/admin/access" className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <ShieldCheck className="w-4 h-4 text-slate-500" /> Manajemen Akses
          </Link>
          <Link href="/admin/health" className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <Activity className="w-4 h-4 text-slate-500" /> Integration Health
          </Link>
          <Link href="/admin/logs" className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <Terminal className="w-4 h-4 text-slate-500" /> System Logs
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="font-medium">Administrator</div>
          <Link href="/dashboard" className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">
            Kembali ke SPARTA
          </Link>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
