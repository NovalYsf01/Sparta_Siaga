"use client";

import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Upload,
  Camera,
  Store,
  Lock,
  ArrowRight,
} from "lucide-react";
import { IncidentRecord, RoleType, DamageReport } from "@/types/incident";
import { checkClientPermission } from "@/lib/client-permissions";
import { UserIdentity } from "@/lib/identity";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface StoreVerificationModalProps {
  incident: IncidentRecord | null;
  activeRole: RoleType;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVerification: (
    incidentId: string,
    isDamaged: boolean,
    report?: Partial<DamageReport>
  ) => void;
}

export function StoreVerificationModal({
  incident,
  isOpen,
  onClose,
  onConfirmVerification,
}: StoreVerificationModalProps) {
  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  const [selectedCondition, setSelectedCondition] = useState<"safe" | "damaged">("safe");
  const [categories, setCategories] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"Ringan" | "Sedang" | "Berat">("Sedang");
  const [operationalStatus, setOperationalStatus] = useState<"Buka Normal" | "Tutup Sementara">("Buka Normal");
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [permissionData, setPermissionData] = useState<{ canConfirm: boolean; confirmReason: string; scopeReason: string } | null>(null);

  React.useEffect(() => {
    if (isOpen && incident) {
      Promise.all([
        fetch("/api/auth/me").then((res) => (res.ok ? res.json() : null)),
        fetch(`/api/incidents/${incident.id}/permissions`).then((res) => (res.ok ? res.json() : null)),
      ])
        .then(([meData, permData]) => {
          if (meData) setIdentity(meData);
          if (permData?.data) {
            setPermissionData({
              canConfirm: permData.data.canConfirm,
              confirmReason: permData.data.confirmReason,
              scopeReason: permData.data.canConfirm ? "" : (permData.data.confirmReason || "Di luar cakupan akses akun Anda"),
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, incident]);

  if (!isOpen || !incident) return null;

  const clientCheck = checkClientPermission({
    identity,
    permission: "REPORT_CONFIRM",
    report: incident,
  });

  const canVerify = permissionData !== null ? permissionData.canConfirm : clientCheck.authorized;
  const blockedScopeReason = permissionData?.scopeReason || clientCheck.scopeReason || "Di luar cakupan akun Anda";

  const availableCategories = [
    "Dinding/Struktur",
    "Kaca/Pintu",
    "Rak Barang",
    "Kelistrikan/AC",
    "Plafon",
  ];

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleSimulatePhoto = () => {
    setPhotoPreview(
      "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&q=80&w=400"
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canVerify) return;

    const confirmedBy = identity?.name
      ? `${identity.name} (${identity.position || "Staff SPARTA"})`
      : `PIC ${incident.storeName}`;
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    if (selectedCondition === "safe") {
      onConfirmVerification(incident.id, false, {
        confirmedBy,
        confirmedAt: timestamp,
        isDamaged: false,
        operationalStatus: "Buka Normal",
        notes: notes || "Toko aman, tidak ada kerusakan fisik setelah guncangan/kejadian.",
      });
    } else {
      onConfirmVerification(incident.id, true, {
        confirmedBy,
        confirmedAt: timestamp,
        isDamaged: true,
        categories: categories.length > 0 ? categories : ["Rak Barang"],
        severity,
        operationalStatus,
        photos: photoPreview ? [photoPreview] : undefined,
        notes: notes || "Terjadi kerusakan fisik di area gerai, perlu tindakan Sparta Maintenance.",
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overscroll-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[85dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Konfirmasi Kondisi Toko Pasca Bencana
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{incident.storeName} • {incident.branch}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!canVerify ? (
          <div className="p-6 text-center space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Akses Konfirmasi Tidak Tersedia</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Anda tidak memiliki izin untuk melakukan konfirmasi pada laporan ini.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Akses ditentukan berdasarkan permission dan cakupan laporan yang dimiliki akun Anda.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Permission:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Konfirmasi Laporan (REPORT_CONFIRM)</span>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Cakupan (Scope):</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-right text-[11px]">
                  {blockedScopeReason}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
            {/* Condition Choice (Radio Toggle) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Kondisi Fisik Gerai:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setSelectedCondition("safe")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    selectedCondition === "safe"
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle className={`w-5 h-5 shrink-0 ${selectedCondition === "safe" ? "text-emerald-600" : "text-slate-400"}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Toko Aman</div>
                    <div className="text-[10px] text-slate-500">Tidak ada kerusakan fisik</div>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedCondition("damaged")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    selectedCondition === "damaged"
                      ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${selectedCondition === "damaged" ? "text-red-600" : "text-slate-400"}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Ada Kerusakan</div>
                    <div className="text-[10px] text-slate-500">Kirim tiket Maintenance</div>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM STANDAR CEPAT (When damaged is selected) */}
            {selectedCondition === "damaged" && (
              <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in">
                {/* 1. Kategori Kerusakan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kategori Kerusakan (Bisa pilih lebih dari satu):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat) => {
                      const isChecked = categories.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            isChecked
                              ? "bg-red-600 text-white border-red-600 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {isChecked ? "✓ " : "+ "}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Tingkat Keparahan & Status Operasional */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tingkat Keparahan:
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as "Ringan" | "Sedang" | "Berat")}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="Ringan">Ringan (Struktur Aman)</option>
                      <option value="Sedang">Sedang (Perlu Perbaikan Segera)</option>
                      <option value="Berat">Berat (Berbahaya untuk dimasuki)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status Operasional:
                    </label>
                    <select
                      value={operationalStatus}
                      onChange={(e) => setOperationalStatus(e.target.value as "Buka Normal" | "Tutup Sementara")}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="Buka Normal">Buka Normal</option>
                      <option value="Tutup Sementara">Tutup Sementara</option>
                    </select>
                  </div>
                </div>

                {/* 3. Upload Foto Bukti Kerusakan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Foto Bukti Kerusakan:
                  </label>
                  {photoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100">
                      <img
                        src={photoPreview}
                        alt="Bukti Kerusakan"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={handleSimulatePhoto}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/40 transition-colors flex flex-col items-center justify-center gap-1.5"
                    >
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-medium text-blue-600">
                        Klik untuk upload foto / Ambil dari Kamera Toko
                      </span>
                      <span className="text-[10px] text-slate-400">JPG, PNG maksimal 5 MB</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Catatan / Keterangan Tambahan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Catatan Kondisi Toko:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={
                  selectedCondition === "safe"
                    ? "Contoh: Seluruh staf aman, barang pajangan stabil, toko buka normal."
                    : "Jelaskan ringkas apa saja yang rusak untuk tim teknisi Sparta Maintenance..."
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all ${
                  selectedCondition === "safe"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                <span>
                  {selectedCondition === "safe"
                    ? "Konfirmasi Toko Aman"
                    : "Kirim Laporan & Tiket Maintenance"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
