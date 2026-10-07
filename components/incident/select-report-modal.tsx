"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Calculator,
  Wrench,
  ArrowRight,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { IncidentRecord } from "@/types/incident";
import { UserIdentity } from "@/lib/identity";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface SelectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  purpose: "ESTIMATION" | "PROGRESS";
  incidents: IncidentRecord[];
  onSelectReport: (report: IncidentRecord) => void;
  currentUser?: UserIdentity | null;
}

export function SelectReportModal({
  isOpen,
  onClose,
  purpose,
  incidents,
  onSelectReport,
  currentUser,
}: SelectReportModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Lock background scrolling when modal is open
  useBodyScrollLock(isOpen);

  const isEstimation = purpose === "ESTIMATION";

  const filteredReports = useMemo(() => {
    return incidents.filter((inc) => {
      // Exclude resolved/archived
      if (inc.status === "resolved" || inc.status === "archived") return false;

      // When purpose is PROGRESS, exclude reports already at 100% completion
      if (purpose === "PROGRESS" && inc.progress === 100) {
        return false;
      }

      // Strict branch isolation for branch scoped actors
      if (currentUser?.scope === "BRANCH" && currentUser?.branch) {
        if (inc.branch?.toLowerCase() !== currentUser.branch.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = inc.id.toLowerCase().includes(q);
        const matchesStore = inc.storeName.toLowerCase().includes(q);
        const matchesBranch = inc.branch?.toLowerCase().includes(q);
        if (!matchesId && !matchesStore && !matchesBranch) return false;
      }

      return true;
    });
  }, [incidents, searchQuery, purpose, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overscroll-none touch-none select-none">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[85dvh] touch-auto select-text">
        {/* Header (Fixed) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#123B6D] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              {isEstimation ? <Calculator className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isEstimation ? "Pilih Laporan untuk Buat Estimasi" : "Pilih Laporan untuk Update Progress"}
              </h3>
              <p className="text-[11px] text-blue-200">
                Pilih laporan existing. Konteks laporan akan otomatis terisi tanpa input ulang data.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar (Fixed) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID Laporan, Nama Toko, atau Cabang..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1D5AA6] focus:outline-hidden text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Scrollable List of Reports (Internal Scroll Only) */}
        <div className="p-4 overflow-y-auto overscroll-contain space-y-2.5 flex-1 min-h-0">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tidak ada laporan aktif yang ditemukan.
            </div>
          ) : (
            filteredReports.map((report) => {
              const isToko = (report.tkpType || "toko").toLowerCase() === "toko";
              const isDc = !isToko;

              return (
                <div
                  key={report.id}
                  onClick={() => {
                    onSelectReport(report);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#1D5AA6] hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {report.id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {report.disasterType}
                      </span>
                      {isDc && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold">
                          TKP DC
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white truncate">
                      <span>{report.storeName}</span>
                      <span className="text-slate-400 font-normal">({report.branch})</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Tanggal: {report.date || "-"}</span>
                      <span>•</span>
                      <span>Progress Saat Ini: {report.progress || 0}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-[#1D5AA6] group-hover:bg-[#123B6D] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span>Pilih</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
