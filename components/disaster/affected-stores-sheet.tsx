"use client";

import React, { useState } from "react";
import { Store } from "@/types/store";
import { Earthquake } from "@/types/disaster";
import {
  X,
  AlertOctagon,
  AlertTriangle,
  ChevronRight,
  Radio,
  Building,
  Navigation,
} from "lucide-react";

interface AffectedStoresSheetProps {
  isOpen: boolean;
  onClose: () => void;
  earthquake?: Earthquake;
  affectedStores: Store[];
  onSelectStore: (store: Store) => void;
  theme?: "dark" | "light";
}

export function AffectedStoresSheet({
  isOpen,
  onClose,
  earthquake,
  affectedStores,
  onSelectStore,
  theme = "dark",
}: AffectedStoresSheetProps) {
  const [filter, setFilter] = useState<"all" | "danger" | "warning">("all");

  if (!isOpen) return null;

  const isLight = theme === "light";
  const dangerStores = affectedStores.filter((s) => s.status === "danger");
  const warningStores = affectedStores.filter((s) => s.status === "warning");

  const filteredStores = affectedStores.filter((s) => {
    if (filter === "danger") return s.status === "danger";
    if (filter === "warning") return s.status === "warning";
    return true;
  });

  return (
    <div
      className={`fixed inset-y-0 left-0 w-full sm:w-[440px] z-[600] shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-left duration-300 ${
        isLight
          ? "bg-white/95 border-r border-slate-200 text-slate-800"
          : "bg-slate-900/95 border-r border-slate-800 text-slate-200"
      }`}
    >
      {/* Header */}
      <div className={`p-5 flex items-start justify-between gap-3 ${isLight ? "bg-white" : "bg-slate-900"}`}>
        <div>
          <h2 className={`text-base font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Toko Potensi Terdampak
          </h2>
          <p className={`text-[11px] font-medium mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {earthquake ? earthquake.title : "Pemantauan Radius Bencana"}
          </p>
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-full transition-colors ${
            isLight
              ? "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              : "hover:bg-slate-800 text-slate-500 hover:text-white"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter / Summary Tabs */}
      <div className={`px-5 pb-4 border-b flex gap-2 ${isLight ? "border-slate-100 bg-white" : "border-slate-800 bg-slate-900"}`}>
        <button
          onClick={() => setFilter(filter === "danger" ? "all" : "danger")}
          className={`flex-1 flex items-center justify-between p-2.5 rounded-xl border transition-all ${
            filter === "danger"
              ? isLight ? "border-red-500 bg-red-50 shadow-sm ring-1 ring-red-500/20" : "border-red-500 bg-red-950/40 shadow-sm ring-1 ring-red-500/20"
              : isLight ? "border-slate-200 bg-white hover:bg-slate-50 opacity-80" : "border-slate-700 bg-slate-900 hover:bg-slate-800 opacity-80"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${filter === "danger" ? "bg-red-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
            <span className={`text-[11px] font-semibold ${
              filter === "danger" 
                ? "text-red-600 dark:text-red-400" 
                : "text-slate-500 dark:text-slate-400"
            }`}>Bahaya</span>
          </div>
          <span className={`font-mono font-bold text-sm ${filter === "danger" ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
            {dangerStores.length}
          </span>
        </button>

        <button
          onClick={() => setFilter(filter === "warning" ? "all" : "warning")}
          className={`flex-1 flex items-center justify-between p-2.5 rounded-xl border transition-all ${
            filter === "warning"
              ? isLight ? "border-amber-500 bg-amber-50 shadow-sm ring-1 ring-amber-500/20" : "border-amber-500 bg-amber-950/40 shadow-sm ring-1 ring-amber-500/20"
              : isLight ? "border-slate-200 bg-white hover:bg-slate-50 opacity-80" : "border-slate-700 bg-slate-900 hover:bg-slate-800 opacity-80"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${filter === "warning" ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"}`} />
            <span className={`text-[11px] font-semibold ${
              filter === "warning" 
                ? "text-amber-600 dark:text-amber-400" 
                : "text-slate-500 dark:text-slate-400"
            }`}>Waspada</span>
          </div>
          <span className={`font-mono font-bold text-sm ${filter === "warning" ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`}>
            {warningStores.length}
          </span>
        </button>
      </div>

      {/* Stores List */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-2.5 ${isLight ? "bg-slate-50/50" : "bg-slate-950/30"}`}>
        {filteredStores.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className={`inline-flex p-3 rounded-full mb-3 ${isLight ? "bg-slate-100" : "bg-slate-800"}`}>
              <Navigation className={`w-6 h-6 ${isLight ? "text-slate-400" : "text-slate-500"}`} />
            </div>
            <p className={`text-sm font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Tidak ada hasil yang ditemukan
            </p>
            <p className={`text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>
              Coba ubah atau hapus filter zona di atas.
            </p>
          </div>
        ) : (
          filteredStores.map((store, index) => {
            const isDanger = store.status === "danger";

            return (
              <div
                key={store.id}
                onClick={() => onSelectStore(store)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 group ${
                  isLight
                    ? "bg-white border-slate-200 hover:border-slate-300"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDanger ? "bg-red-500" : "bg-amber-500"}`} />
                      <span className={`font-semibold text-xs truncate ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                        {store.nama_toko}
                      </span>
                    </div>
                    <div className={`text-[10px] flex items-center gap-1.5 font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      <span>{store.kode_toko}</span>
                      <span className="opacity-50">•</span>
                      <span>Cabang {store.cabang}</span>
                    </div>
                  </div>

                  <div className={`shrink-0 flex flex-col items-end gap-1.5`}>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isDanger 
                        ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400" 
                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                    }`}>
                      {store.distanceFromDisasterKm} km
                    </span>
                  </div>
                </div>

                <div className={`pt-2 flex items-center justify-between text-[10px] border-t ${isLight ? "border-slate-100" : "border-slate-800"}`}>
                  <span className={isLight ? "text-slate-400" : "text-slate-500"}>
                    {store.fr_type === "F" ? "Franchise" : "Reguler"}
                  </span>
                  
                  <span className={`font-semibold transition-transform group-hover:translate-x-1 flex items-center ${isLight ? "text-slate-400 group-hover:text-slate-700" : "text-slate-500 group-hover:text-slate-300"}`}>
                    Lihat Peta <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
