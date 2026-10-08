"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Building,
  Search,
  CheckCircle2,
  Loader2,
  XCircle,
  Info,
} from "lucide-react";
import {
  PermissionKey,
  PermissionEffect,
  ScopeType,
  PERMISSION_DEFINITIONS,
  getPermissionScopeRule,
} from "@/types/permission";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface AddOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole?: string | null;
  userScope?: string | null;
  userBranch?: string | null;
  onSuccess: () => void;
}

export function AddOverrideModal({
  isOpen,
  onClose,
  userId,
  userName,
  userRole,
  userScope,
  userBranch,
  onSuccess,
}: AddOverrideModalProps) {
  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  const [permissionKey, setPermissionKey] = useState<PermissionKey>("REPORT_FOLLOW_UP");
  const [effect, setEffect] = useState<PermissionEffect>("ALLOW");
  const [scopeType, setScopeType] = useState<ScopeType>("SPECIFIC_BRANCH");
  const [branchCode, setBranchCode] = useState("");
  const [branchDisplay, setBranchDisplay] = useState("");

  // Masa berlaku default: Sementara
  const [isTemporary, setIsTemporary] = useState(true);
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(18, 0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Branch search state
  const [branchQuery, setBranchQuery] = useState("");
  const [branchResults, setBranchResults] = useState<any[]>([]);
  const [isSearchingBranch, setIsSearchingBranch] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setReason("");
      setBranchCode("");
      setBranchDisplay("");
      setBranchQuery("");
      setEffect("ALLOW");

      const defaultKey: PermissionKey = "REPORT_FOLLOW_UP";
      setPermissionKey(defaultKey);
      const rule = getPermissionScopeRule(defaultKey);
      setScopeType(rule.defaultScope);
      setIsTemporary(true);

      const now = new Date();
      setStartsAt(
        new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      );

      const exp = new Date();
      exp.setDate(exp.getDate() + 3);
      exp.setHours(18, 0, 0, 0);
      setExpiresAt(
        new Date(exp.getTime() - exp.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      );
    }
  }, [isOpen]);

  // Click outside to close branch dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for branches/stores
  useEffect(() => {
    if (!branchQuery.trim() || branchQuery.length < 2) {
      setBranchResults([]);
      setIsSearchingBranch(false);
      return;
    }

    if (branchDisplay && branchQuery.includes(branchCode)) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingBranch(true);
      try {
        const res = await fetch(`/api/stores/search?q=${encodeURIComponent(branchQuery)}&limit=10`);
        if (res.ok) {
          const json = await res.json();
          setBranchResults(json.data || []);
          setIsBranchDropdownOpen(true);
        }
      } catch (err) {
        console.error("Failed to search branch:", err);
      } finally {
        setIsSearchingBranch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [branchQuery, branchCode, branchDisplay]);

  // Canonical permission change handler (auto-derives and synchronizes scope)
  const handlePermissionChange = (newKey: PermissionKey) => {
    setPermissionKey(newKey);
    const rule = getPermissionScopeRule(newKey);

    if (rule.policy === "FIXED_NATIONAL") {
      setScopeType("ALL_BRANCHES");
      setBranchCode("");
      setBranchDisplay("");
      setBranchQuery("");
      setIsBranchDropdownOpen(false);
    } else if (rule.policy === "FIXED_OWN") {
      setScopeType("OWN_SCOPE");
      setBranchCode("");
      setBranchDisplay("");
      setBranchQuery("");
      setIsBranchDropdownOpen(false);
    } else {
      // BRANCH_SCOPED
      if (scopeType === "ALL_BRANCHES") {
        setScopeType(rule.defaultScope);
      }
    }
  };

  const handleSelectBranch = (loc: any) => {
    const code = loc.kode_toko || loc.cabang;
    const label = `${code} — ${loc.nama_toko || loc.cabang || "Cabang"}`;
    setBranchCode(code);
    setBranchDisplay(label);
    setBranchQuery(label);
    setIsBranchDropdownOpen(false);
  };

  const currentScopeRule = getPermissionScopeRule(permissionKey);
  const selectedDef = PERMISSION_DEFINITIONS.find((d) => d.key === permissionKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Alasan Wajib
    if (!reason.trim()) {
      setError("Alasan wajib diisi untuk setiap pemberian akses khusus.");
      return;
    }

    // Resolve final scope based on policy
    let finalScopeType: ScopeType = scopeType;
    if (currentScopeRule.policy === "FIXED_NATIONAL") {
      finalScopeType = "ALL_BRANCHES";
    } else if (currentScopeRule.policy === "FIXED_OWN") {
      finalScopeType = "OWN_SCOPE";
    }

    if (finalScopeType === "SPECIFIC_BRANCH" && !branchCode.trim()) {
      setError("Silakan pilih branch target.");
      return;
    }

    let finalStartsAt: string | null = null;
    let finalExpiresAt: string | null = null;

    if (isTemporary) {
      if (!expiresAt) {
        setError("Silakan tentukan tanggal berakhir masa berlaku akses sementara.");
        return;
      }
      const expDate = new Date(expiresAt);
      if (expDate <= new Date()) {
        setError("Tanggal berakhir harus lebih besar dari waktu sekarang.");
        return;
      }
      finalStartsAt = startsAt ? new Date(startsAt).toISOString() : new Date().toISOString();
      finalExpiresAt = expDate.toISOString();
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/permissions/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissionKey,
          effect,
          scopeType: finalScopeType,
          branchCode: finalScopeType === "SPECIFIC_BRANCH" ? branchCode : null,
          reason: reason.trim(),
          startsAt: finalStartsAt,
          expiresAt: finalExpiresAt,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Gagal menambahkan akses khusus user");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menambahkan akses khusus.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categories = ["LAPORAN", "NOTIFIKASI", "MANAGEMENT", "ESTIMASI"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overscroll-none touch-none select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[88vh] overflow-hidden touch-auto select-text">
        {/* Header (Stable) */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 pb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tambah Akses Khusus User
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                User: <span className="font-semibold text-slate-700 dark:text-slate-200">{userName}</span> • {userRole || "Tanpa Role"} ({userScope || "N/A"}{userBranch ? ` • ${userBranch}` : ""})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 pt-3 space-y-3.5 overflow-y-auto overscroll-contain flex-1 min-h-0">
            {/* Section 1: Hak Akses */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                1. Hak Akses
              </label>
              <select
                value={permissionKey}
                onChange={(e) => handlePermissionChange(e.target.value as PermissionKey)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {categories.map((cat) => {
                  const defs = PERMISSION_DEFINITIONS.filter((d) => d.category === cat);
                  if (defs.length === 0) return null;
                  return (
                    <optgroup key={cat} label={`Kategori ${cat}`}>
                      {defs.map((def) => (
                        <option key={def.key} value={def.key}>
                          {def.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {selectedDef && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {selectedDef.description}
                </p>
              )}
            </div>

            {/* Section 2: Jenis Pengaturan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Jenis Pengaturan
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEffect("ALLOW")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    effect === "ALLOW"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Izinkan
                </button>
                <button
                  type="button"
                  onClick={() => setEffect("DENY")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    effect === "DENY"
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-500" />
                  Tolak
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {effect === "ALLOW"
                  ? "Memberikan hak akses khusus tambahan kepada user ini."
                  : "Membatasi / menolak hak akses user ini (pengecualian eksplisit)."}
              </p>
            </div>

            {/* Section 3: Cakupan (Smart Scope Resolution - No Redundant Dropdown) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                3. Cakupan
              </label>

              {/* Case A: Fixed National Scope */}
              {currentScopeRule.policy === "FIXED_NATIONAL" && (
                <div className="space-y-1.5">
                  <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <Building className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        Cakupan: <strong className="text-blue-900 dark:text-blue-300">Seluruh Cabang (Nasional)</strong>
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                      Nasional Read-Only
                    </span>
                  </div>
                  {effect === "ALLOW" && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>Catatan Kebijakan:</strong> Visibilitas seluruh laporan nasional bersifat baca (Read-Only). Tindakan operasional (perbaikan, konfirmasi, penyelesaian) tetap dibatasi pada cabang asal pengguna.
                    </div>
                  )}
                </div>
              )}

              {/* Case B: Fixed Own Branch Scope */}
              {currentScopeRule.policy === "FIXED_OWN" && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Cakupan: <strong className="text-slate-900 dark:text-white">{currentScopeRule.scopeSummary({ branch: userBranch, scope: userScope })}</strong>
                  </span>
                </div>
              )}

              {/* Case C: Branch Scoped (Selectable between Specific Branch & Own Scope) */}
              {currentScopeRule.policy === "BRANCH_SCOPED" && (
                <div className="space-y-2">
                  <select
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value as ScopeType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="SPECIFIC_BRANCH">Branch Tertentu (Penugasan Backup)</option>
                    <option value="OWN_SCOPE">
                      Cabang Pengguna ({userBranch || userScope || "Scope User"})
                    </option>
                  </select>

                  {/* Branch Autocomplete when SPECIFIC_BRANCH is selected */}
                  {scopeType === "SPECIFIC_BRANCH" && (
                    <div className="space-y-1 relative" ref={dropdownRef}>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Pilih Branch Target <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={branchQuery}
                          onChange={(e) => {
                            setBranchQuery(e.target.value);
                            if (!e.target.value.trim()) {
                              setBranchCode("");
                              setBranchDisplay("");
                            }
                          }}
                          placeholder="Ketik kode/nama branch (contoh: Cikokol, G001, Bandung...)"
                          className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        {isSearchingBranch && (
                          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute right-2.5 top-2.5" />
                        )}
                      </div>

                      {/* Dropdown Results */}
                      {isBranchDropdownOpen && branchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-700">
                          {branchResults.map((b) => (
                            <div
                              key={b.kode_toko || b.cabang}
                              onClick={() => handleSelectBranch(b)}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {b.kode_toko || b.cabang}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                                    {b.nama_toko || b.cabang}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {b.cabang || "Cabang"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {branchCode && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terpilih: {branchDisplay || branchCode}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Masa Berlaku */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  4. Masa Berlaku
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setIsTemporary(true)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      isTemporary
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Sementara
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTemporary(false)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      !isTemporary
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Permanen
                  </button>
                </div>
              </div>

              {isTemporary ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                        Tanggal Mulai
                      </label>
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                        Tanggal Berakhir <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Akses khusus akan otomatis kadaluarsa setelah tanggal berakhir.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Akses berlaku permanen sampai dicabut secara manual oleh Administrator.
                </p>
              )}
            </div>

            {/* Section 5: Alasan (Wajib diisi) */}
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                5. Alasan <span className="text-red-500">* (Wajib diisi)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Contoh: Penugasan pemantauan nasional sesuai mandat manajemen / Backup PIC cabang."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Actions (Fixed Footer) */}
          <div className="flex items-center justify-end gap-2.5 p-3.5 px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Akses Khusus</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
