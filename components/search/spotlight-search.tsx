"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Store, StoreStatus } from "@/types/store";
import {
  Search,
  X,
  MapPin,
  Building,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Store[];
  onSelectStore: (store: Store) => void;
  onSelectBranch?: (branch: string) => void;
  theme?: "dark" | "light";
}

export function SpotlightSearch({
  isOpen,
  onClose,
  stores,
  onSelectStore,
  onSelectBranch,
  theme = "dark",
}: SpotlightSearchProps) {
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StoreStatus>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"distance" | "name">("distance");

  const inputRef = useRef<HTMLInputElement>(null);

  // Extract unique branch list dynamically from stores
  const branchList = useMemo(() => {
    const branches = Array.from(new Set(stores.map((s) => s.cabang).filter(Boolean)));
    return branches.sort();
  }, [stores]);

  // Aggregate status counts
  const { dangerCount, warningCount } = useMemo(() => {
    let danger = 0;
    let warning = 0;
    for (const s of stores) {
      if (s.status === "danger") danger++;
      else if (s.status === "warning") warning++;
    }
    return { dangerCount: danger, warningCount: warning };
  }, [stores]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setStatusFilter("all");
      setSelectedBranch("all");
      setSortBy("distance");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const deferredQuery = React.useDeferredValue(query);

  // Search is only active when query is typed OR specific crisis filter/branch is selected
  const hasActiveQuery = deferredQuery.trim().length > 0;
  const hasCrisisFilter = statusFilter !== "all";
  const hasBranchFilter = selectedBranch !== "all";
  const isSearchActive = hasActiveQuery || hasCrisisFilter || hasBranchFilter;

  // Multi-criteria Filtering & Sorting (Only executes when searching or filtering)
  const filteredStores = useMemo(() => {
    if (!isSearchActive) {
      return []; // Do not load all 21,550 stores when idle! Keeps memory at 0 and UI butter-smooth.
    }

    const q = deferredQuery.toLowerCase().trim();
    const isDistanceSort = sortBy === "distance";

    const matches: Store[] = [];
    const MAX_RESULTS = 40; // Show top 40 most relevant stores to prevent DOM bloating

    for (let i = 0; i < stores.length; i++) {
      const s = stores[i];

      // 1. Risk Status Filter
      if (statusFilter !== "all" && s.status !== statusFilter) {
        continue;
      }

      // 2. Branch Filter
      if (selectedBranch !== "all" && s.cabang !== selectedBranch) {
        continue;
      }

      // 3. Fast Text Query Filter
      if (hasActiveQuery) {
        const matchName = s.nama_toko.toLowerCase().includes(q);
        const matchCode = s.kode_toko.toLowerCase().includes(q);
        const matchBranch = s.cabang.toLowerCase().includes(q);

        if (!matchName && !matchCode && !matchBranch) {
          continue;
        }
      }

      matches.push(s);
      if (matches.length >= MAX_RESULTS) {
        break; // Early exit once we have 40 matches
      }
    }

    // 4. Ultra-fast Sorting
    if (isDistanceSort) {
      matches.sort((a, b) => {
        const distA = a.distanceFromDisasterKm ?? 999999;
        const distB = b.distanceFromDisasterKm ?? 999999;
        return distA - distB;
      });
    } else {
      matches.sort((a, b) => (a.nama_toko > b.nama_toko ? 1 : -1));
    }

    return matches;
  }, [stores, isSearchActive, deferredQuery, hasActiveQuery, statusFilter, selectedBranch, sortBy]);

  const handleResetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setSelectedBranch("all");
    setSortBy("distance");
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-start justify-center pt-2 sm:pt-16 md:pt-20 px-2 sm:px-4 backdrop-blur-sm animate-in fade-in duration-200 ${
        isDark ? "bg-slate-950/80" : "bg-slate-900/30"
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl max-h-[95vh] sm:max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border ${
          isDark 
            ? "bg-slate-900 border-slate-700/90 shadow-black/50" 
            : "bg-white border-slate-200 shadow-slate-300/50"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Main Search Input Header */}
        <div className={`p-3 sm:p-3.5 border-b flex items-center gap-2.5 sm:gap-3 transition-colors ${
          isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <Search className={`w-5 h-5 shrink-0 ${isDark ? "text-red-500" : "text-red-600"}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari toko (misal: SUDIRMAN), kode, atau cabang..."
            className={`w-full bg-transparent text-xs sm:text-sm focus:outline-none ${
              isDark 
                ? "text-white placeholder-slate-500" 
                : "text-slate-900 placeholder-slate-400"
            }`}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {query && (
              <button
                onClick={() => setQuery("")}
                className={`p-1 rounded transition-colors ${
                  isDark 
                    ? "hover:bg-slate-800 text-slate-400 hover:text-white" 
                    : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                }`}
                title="Hapus teks pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className={`hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${
              isDark 
                ? "bg-slate-800 text-slate-400 border-slate-700" 
                : "bg-white text-slate-500 border-slate-300 shadow-sm"
            }`}>
              ESC
            </kbd>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors border border-transparent ${
                isDark 
                  ? "hover:bg-slate-800 text-slate-400 hover:text-white hover:border-slate-700" 
                  : "hover:bg-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
              title="Tutup Pencarian"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Focused Filter Bar (No 'Semua 21.550' pill to keep it lightweight) */}
        <div className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
          isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-100 border-slate-200"
        }`}>
          {/* Status Risk Pills - Only Bahaya & Waspada */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold hidden xs:flex items-center gap-1 mr-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              <Filter className={`w-3 h-3 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              Filter Zona:
            </span>

            <button
              onClick={() => setStatusFilter(statusFilter === "danger" ? "all" : "danger")}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 border ${
                statusFilter === "danger"
                  ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                  : isDark
                    ? "bg-slate-850 hover:bg-red-950/50 border-slate-750 text-red-400"
                    : "bg-white hover:bg-red-50 border-slate-300 text-red-600 hover:border-red-300"
              }`}
            >
              <AlertOctagon className="w-3 h-3" />
              <span>Bahaya ({dangerCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "warning" ? "all" : "warning")}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 border ${
                statusFilter === "warning"
                  ? "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/30"
                  : isDark
                    ? "bg-slate-850 hover:bg-amber-950/50 border-slate-750 text-amber-400"
                    : "bg-white hover:bg-amber-50 border-slate-300 text-amber-600 hover:border-amber-300"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Waspada ({warningCount})</span>
            </button>
          </div>

          {/* Branch Dropdown & Sort Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Branch Selector */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={`border text-[11px] rounded-md px-2 py-1 focus:outline-none focus:border-red-500 ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-slate-200" 
                  : "bg-white border-slate-300 text-slate-700"
              }`}
            >
              <option value="all">🏢 Semua Cabang ({branchList.length})</option>
              {branchList.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy(sortBy === "distance" ? "name" : "distance")}
              className={`px-2 py-1 border rounded-md text-[11px] flex items-center gap-1 transition-colors ${
                isDark 
                  ? "bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300" 
                  : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
              }`}
              title="Ganti Pengurutan"
            >
              <ArrowUpDown className={`w-3 h-3 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
              <span>{sortBy === "distance" ? "Terdekat" : "Nama A-Z"}</span>
            </button>

            {/* Reset Button */}
            {isSearchActive && (
              <button
                onClick={handleResetFilters}
                className={`p-1 border rounded-md transition-colors ${
                  isDark 
                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200" 
                    : "bg-white hover:bg-slate-100 border-slate-300 text-slate-500 shadow-sm hover:text-slate-800"
                }`}
                title="Reset Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Status Bar */}
        {isSearchActive && (
          <div className={`px-4 py-1.5 border-b flex items-center justify-between text-[11px] font-mono ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
          }`}>
            <span>
              Menampilkan <strong className={isDark ? "text-white" : "text-slate-800"}>{filteredStores.length}</strong> toko teratas
            </span>
            {statusFilter !== "all" && (
              <span className={`font-sans font-semibold ${
                statusFilter === "danger" ? "text-red-600" : "text-amber-600"
              }`}>
                Zona {statusFilter.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* 4. Results List / Empty Prompt State */}
        <div className="p-2 max-h-[380px] overflow-y-auto space-y-1.5">
          {/* Branch-level Quick Action: View All Branch Stores on Map */}
          {selectedBranch !== "all" && (
            <div className={`p-3 rounded-xl mb-2 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-sm border ${
              isDark 
                ? "bg-blue-950/60 border-blue-700/60" 
                : "bg-blue-50 border-blue-200"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg border shrink-0 ${
                  isDark 
                    ? "bg-blue-600/20 text-cyan-400 border-blue-500/30" 
                    : "bg-blue-100 text-blue-700 border-blue-300"
                }`}>
                  <Building className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={`font-bold text-xs truncate ${isDark ? "text-white" : "text-blue-900"}`}>Cabang {selectedBranch}</div>
                  <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-blue-700/80"}`}>
                    {stores.filter((s) => s.cabang === selectedBranch).length} Total Gerai Toko Cabang
                  </div>
                </div>
              </div>
              {onSelectBranch && (
                <button
                  onClick={() => {
                    onSelectBranch(selectedBranch);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/30 shrink-0"
                >
                  <span>🏢 Tampilkan di Peta</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {!isSearchActive ? (
            /* Clean Empty / Idle State when modal opens (0 stores rendered for zero lag) */
            <div className="py-10 px-4 text-center space-y-3">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-inner ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-slate-500" 
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}>
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className={`font-bold text-base ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                  Cari Toko atau Zona Bencana
                </p>
                <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Ketik nama gerai, kode toko (contoh: <code className={`font-mono px-1 rounded ${isDark ? "text-red-400 bg-red-950/50" : "text-red-600 bg-red-50"}`}>1A01</code>), atau pilih filter zona di atas.
                </p>
              </div>

              {/* Quick Jump Shortcuts */}
              <div className="flex justify-center gap-2 pt-4">
                {dangerCount > 0 && (
                  <button
                    onClick={() => setStatusFilter("danger")}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isDark 
                        ? "bg-red-950/60 hover:bg-red-900/80 border-red-700/60 text-red-200" 
                        : "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                    }`}
                  >
                    <AlertOctagon className="w-4 h-4 text-red-500" />
                    <span>{dangerCount} Toko Bahaya</span>
                  </button>
                )}

                {warningCount > 0 && (
                  <button
                    onClick={() => setStatusFilter("warning")}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isDark 
                        ? "bg-amber-950/60 hover:bg-amber-900/80 border-amber-700/60 text-amber-200" 
                        : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>{warningCount} Toko Waspada</span>
                  </button>
                )}
              </div>
            </div>
          ) : filteredStores.length === 0 ? (
            /* No Results Found State */
            <div className="p-8 text-center text-xs space-y-2">
              <Search className={`w-8 h-8 mx-auto ${isDark ? "text-slate-600" : "text-slate-400"}`} />
              <p className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Tidak Ada Toko yang Cocok</p>
              <p className={`text-[11px] max-w-sm mx-auto ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                Coba gunakan kata kunci lain atau bersihkan filter cabang/zona di atas.
              </p>
              <button
                onClick={handleResetFilters}
                className={`mt-2 px-3 py-1.5 border rounded-md transition-colors font-medium ${
                  isDark 
                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300" 
                    : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
                }`}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            /* Rendered Result Items (Max 40 items) */
            filteredStores.map((store) => {
              const isDanger = store.status === "danger";
              const isWarning = store.status === "warning";

              return (
                <div
                  key={store.id}
                  onClick={() => {
                    onSelectStore(store);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isDanger
                      ? isDark 
                        ? "bg-red-950/30 hover:bg-red-950/60 border-red-800/40" 
                        : "bg-red-50/50 hover:bg-red-50 border-red-200"
                      : isWarning
                      ? isDark 
                        ? "bg-amber-950/20 hover:bg-amber-950/40 border-amber-800/30" 
                        : "bg-amber-50/50 hover:bg-amber-50 border-amber-200"
                      : isDark 
                        ? "bg-slate-850 hover:bg-slate-800 border-slate-800/80 hover:border-slate-700"
                        : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 border ${
                        isDanger
                          ? isDark 
                            ? "bg-red-600/20 text-red-400 border-red-500/30 animate-pulse" 
                            : "bg-red-100 text-red-600 border-red-200 animate-pulse"
                          : isWarning
                          ? isDark 
                            ? "bg-amber-600/20 text-amber-400 border-amber-500/30" 
                            : "bg-amber-100 text-amber-600 border-amber-200"
                          : isDark 
                            ? "bg-slate-800 text-slate-300 border-slate-700/60"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                          {store.nama_toko}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                          isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {store.kode_toko}
                        </span>
                      </div>

                      <p className={`text-[11px] truncate flex items-center gap-1.5 mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <span className={`flex items-center gap-1 ${isDark ? "text-slate-300" : "text-slate-700 font-medium"}`}>
                          <Building className={`w-3 h-3 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                          Cabang {store.cabang}
                        </span>
                        <span>•</span>
                        <span className="truncate">{store.alamat}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {store.distanceFromDisasterKm !== undefined ? (
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isDanger
                            ? isDark 
                              ? "bg-red-600 text-white border-red-500 animate-pulse"
                              : "bg-red-600 text-white border-red-700 shadow-sm animate-pulse"
                            : isWarning
                            ? isDark 
                              ? "bg-amber-600/30 text-amber-300 border-amber-500/30"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                            : isDark 
                              ? "bg-slate-800 text-slate-400 border-slate-700"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {store.distanceFromDisasterKm} km
                      </span>
                    ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                        isDark 
                          ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50" 
                          : "text-emerald-700 bg-emerald-50 border-emerald-200"
                      }`}>
                        Aman
                      </span>
                    )}

                    <ArrowRight className={`w-4 h-4 transition-all ${
                      isDark ? "text-slate-600 group-hover:text-red-400" : "text-slate-400 group-hover:text-red-600"
                    } group-hover:translate-x-0.5`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
