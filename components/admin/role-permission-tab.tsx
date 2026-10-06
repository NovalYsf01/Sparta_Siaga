"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
  X,
  FileText,
  Bell,
  Sliders,
  Calculator,
  Info,
} from "lucide-react";
import {
  PermissionKey,
  PermissionEffect,
  PermissionDefinition,
  ROLE_PERMISSION_CATALOG,
} from "@/types/permission";

interface RoleData {
  key: string;
  label: string;
  scope: string;
  userCount: number;
  catalog?: PermissionKey[];
  permissions: Record<PermissionKey, PermissionEffect>;
}

export function RolePermissionTab() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("bm");
  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [currentPermissions, setCurrentPermissions] = useState<Record<PermissionKey, PermissionEffect>>({} as any);
  const [originalPermissions, setOriginalPermissions] = useState<Record<PermissionKey, PermissionEffect>>({} as any);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchRolesData();
  }, []);

  const fetchRolesData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/permissions/roles");
      if (!res.ok) throw new Error("Gagal mengambil data hak akses role");
      const json = await res.json();
      setRoles(json.data.roles);
      setDefinitions(json.data.definitions);

      // Inisialisasi role terpilih
      const initialRole = json.data.roles.find((r: RoleData) => r.key === selectedRoleKey) || json.data.roles[0];
      if (initialRole) {
        setSelectedRoleKey(initialRole.key);
        setCurrentPermissions({ ...initialRole.permissions });
        setOriginalPermissions({ ...initialRole.permissions });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Gagal memuat hak akses role" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (roleKey: string) => {
    setSelectedRoleKey(roleKey);
    const role = roles.find((r) => r.key === roleKey);
    if (role) {
      setCurrentPermissions({ ...role.permissions });
      setOriginalPermissions({ ...role.permissions });
    }
  };

  const togglePermission = (key: PermissionKey) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [key]: prev[key] === "ALLOW" ? "DENY" : "ALLOW",
    }));
  };

  const selectedRole = roles.find((r) => r.key === selectedRoleKey);
  const selectedRoleCatalog: readonly PermissionKey[] =
    selectedRole?.catalog || ROLE_PERMISSION_CATALOG[selectedRoleKey] || [];

  const hasChanges = selectedRoleCatalog.some(
    (key) => currentPermissions[key] !== originalPermissions[key]
  );

  const handleSaveClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setNotification(null);

    // Only send permissions belonging to role catalog
    const permissionsToSave: Partial<Record<PermissionKey, PermissionEffect>> = {};
    for (const key of selectedRoleCatalog) {
      permissionsToSave[key] = currentPermissions[key] || "ALLOW";
    }

    try {
      const res = await fetch(`/api/admin/permissions/roles/${selectedRoleKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permissionsToSave }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Gagal menyimpan perubahan");
      }

      setOriginalPermissions({ ...currentPermissions });

      // Update di local roles list
      setRoles((prev) =>
        prev.map((r) => (r.key === selectedRoleKey ? { ...r, permissions: { ...currentPermissions } } : r))
      );

      setNotification({
        type: "success",
        message: `Hak akses bawaan untuk role ${selectedRole?.label} berhasil disimpan!`,
      });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Gagal menyimpan perubahan" });
    } finally {
      setSaving(false);
    }
  };

  // Group definitions by category
  const categories = ["LAPORAN", "NOTIFIKASI", "MANAGEMENT", "ESTIMASI"] as const;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "LAPORAN":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "NOTIFIKASI":
        return <Bell className="w-4 h-4 text-amber-500" />;
      case "MANAGEMENT":
        return <Sliders className="w-4 h-4 text-purple-500" />;
      case "ESTIMASI":
        return <Calculator className="w-4 h-4 text-emerald-500" />;
      default:
        return <Shield className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat hak akses bawaan role...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm font-medium animate-in fade-in ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar: Role Selection & Save Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Pilih Role
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedRoleKey}
              onChange={(e) => handleSelectRole(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} ({r.scope})
                </option>
              ))}
            </select>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Users className="w-3.5 h-3.5" />
              {selectedRole?.userCount || 0} user menggunakan role ini
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Ada perubahan belum disimpan
            </span>
          )}
          <button
            onClick={handleSaveClick}
            disabled={!hasChanges || saving}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              hasChanges && !saving
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Perubahan
          </button>
        </div>
      </div>

      {/* Info Dampak Role (Section E & Q) */}
      <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed space-y-1">
          <p className="font-bold">
            Hak Akses Bawaan {selectedRole?.label}
          </p>
          <p>
            Hak akses bawaan berlaku untuk seluruh user dengan role yang sama (<strong>{selectedRole?.userCount || 0} user</strong>).
            Pengaturan ini tidak mengatur masa berlaku atau cabang spesifik untuk satu orang tertentu.
          </p>
        </div>
      </div>

      {/* Category Groups (Only render categories that have catalog permissions for this role) */}
      <div className="space-y-5">
        {categories.map((category) => {
          // Hak Akses Role hanya menampilkan permission yang memang bawaan role tersebut
          const categoryDefs = definitions.filter(
            (d) => d.category === category && selectedRoleCatalog.includes(d.key)
          );
          // Section 10: Jika role tidak memiliki permission dalam kategori ini, sembunyikan section sepenuhnya
          if (categoryDefs.length === 0) return null;

          return (
            <div
              key={category}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
            >
              {/* Category Header */}
              <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                {getCategoryIcon(category)}
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs tracking-wider uppercase">
                  {category}
                </h3>
              </div>

              {/* Items List dengan Toggle ON / OFF */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryDefs.map((def) => {
                  const isAllowed = currentPermissions[def.key] === "ALLOW";
                  return (
                    <div
                      key={def.key}
                      onClick={() => togglePermission(def.key)}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer select-none"
                    >
                      <div className="space-y-0.5 max-w-xl pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {def.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {def.description}
                        </p>
                      </div>

                      {/* Toggle Switch ON / OFF (Section C & L: No ALLOW/DENY label) */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-extrabold w-8 text-right ${
                            isAllowed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {isAllowed ? "ON" : "OFF"}
                        </span>
                        <div
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isAllowed ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isAllowed ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog (Section E) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Konfirmasi Hak Akses Role
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Perubahan hak akses ini akan berlaku untuk <strong>{selectedRole?.userCount || 0} user</strong> dengan role{" "}
              <strong>{selectedRole?.label}</strong>. Lanjutkan?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Ya, Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
