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
  activeRole,
  isOpen,
  onClose,
  onConfirmVerification,
}: StoreVerificationModalProps) {
  const [selectedCondition, setSelectedCondition] = useState<"safe" | "damaged">("safe");
  const [categories, setCategories] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"Ringan" | "Sedang" | "Berat">("Sedang");
  const [operationalStatus, setOperationalStatus] = useState<"Buka Normal" | "Tutup Sementara">("Buka Normal");
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  // Permission Guard
  const canVerify = activeRole === "ho_admin" || activeRole === "store_manager_affected";

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
    // Simulated store damage proof image
    setPhotoPreview(
      "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&q=80&w=400"
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canVerify) return;

    if (selectedCondition === "safe") {
      onConfirmVerification(incident.id, false, {
        confirmedBy:
          activeRole === "ho_admin"
            ? "Admin HO Pusat"
            : `Manager ${incident.storeName}`,
        confirmedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        isDamaged: false,
        operationalStatus: "Buka Normal",
        notes: notes || "Toko aman, tidak ada kerusakan fisik setelah guncangan/kejadian.",
      });
    } else {
      onConfirmVerification(incident.id, true, {
        confirmedBy:
          activeRole === "ho_admin"
            ? "Admin HO Pusat"
            : `Manager ${incident.storeName}`,
        confirmedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Konfirmasi Kondisi Toko Pasca Bencana
              </h3>
              <p className="text-xs text-slate-500">{incident.storeName} • {incident.branch}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!canVerify ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Akses Konfirmasi Terkunci</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Anda sedang menggunakan peran <strong>Store Manager (Toko Normal/Aman)</strong>. 
                Konfirmasi laporan kerusakan fisik hanya dapat dilakukan oleh <strong>Store Manager {incident.storeName}</strong> atau <strong>Admin HO</strong>.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left">
              💡 <em>Tips Demo:</em> Silakan ubah peran pengguna di pojok kanan atas header menjadi <strong>Admin HO</strong> atau <strong>SM Toko Cibubur</strong> untuk menguji alur pengisian form ini.
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                      onChange={(e) => setSeverity(e.target.value as any)}
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
                      onChange={(e) => setOperationalStatus(e.target.value as any)}
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
