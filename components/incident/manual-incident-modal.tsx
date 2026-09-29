"use client";

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, FileText, UploadCloud, Building } from "lucide-react";
import { DisasterType } from "@/types/incident";

interface ManualIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: string;
  rawStores: any[];
  onConfirm: (data: any) => void;
}

const availableCategories = [
  "Dinding/Struktur",
  "Kaca/Pintu",
  "Rak Barang",
  "Kelistrikan/AC",
  "Plafon",
  "Brankas/Kasir",
];

export function ManualIncidentModal({
  isOpen,
  onClose,
  activeRole,
  rawStores,
  onConfirm,
}: ManualIncidentModalProps) {
  const [disasterType, setDisasterType] = useState<DisasterType>("other");
  const [storeId, setStoreId] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [severity, setSeverity] = useState("Sedang");
  const [operationalStatus, setOperationalStatus] = useState("Buka Normal");
  const [notes, setNotes] = useState("");

  const isAdmin = activeRole === "ho_admin";

  // Auto-select store if not admin
  useEffect(() => {
    if (isOpen && !isAdmin) {
      // Find a store that belongs to this store manager based on their role string (e.g. "store_manager_affected" -> find the affected one)
      // For simplicity in the prototype, we just grab the first one if not admin, 
      // or ideally the user's assigned store.
      const assignedStore = rawStores.find((s) => s.cabang !== "MANUAL"); 
      if (assignedStore) {
        setStoreId(assignedStore.id || assignedStore.kode_toko);
      }
    } else if (isOpen && isAdmin) {
      setStoreId("");
    }
  }, [isOpen, isAdmin, rawStores]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Buat Laporan Kejadian Baru
              </h3>
              <p className="text-xs text-slate-500">
                Formulir pelaporan insiden & kerusakan
              </p>
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const store = rawStores.find(
              (s) => s.kode_toko === storeId || s.id === storeId
            );
            if (!store && isAdmin) {
              alert("Pilih toko terlebih dahulu!");
              return;
            }
            onConfirm({
              disasterType,
              storeId,
              storeName: store?.nama_toko || "Toko Tidak Diketahui",
              branch: store?.cabang || "Unknown",
              locationCity: store?.kab_kota || "Unknown",
              categories,
              severity,
              operationalStatus,
              notes,
            });
            // Reset state
            setCategories([]);
            setNotes("");
            setSeverity("Sedang");
          }}
          className="p-6 space-y-5 overflow-y-auto"
        >
          {/* Toko Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Lokasi Toko:
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                disabled={!isAdmin}
                required
                className={`w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 ${
                  !isAdmin ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50"
                }`}
              >
                <option value="" disabled>Pilih Cabang / Toko...</option>
                {rawStores.map((s) => (
                  <option key={s.id || s.kode_toko} value={s.id || s.kode_toko}>
                    [{s.kode_toko}] {s.nama_toko} ({s.cabang})
                  </option>
                ))}
              </select>
            </div>
            {!isAdmin && (
              <p className="text-[10px] text-slate-500 mt-1">
                Lokasi otomatis terkunci sesuai akun Anda.
              </p>
            )}
          </div>

          {/* Jenis Kejadian */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Jenis Kejadian:
            </label>
            <select
              value={disasterType}
              onChange={(e) => setDisasterType(e.target.value as DisasterType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="earthquake">Gempa Bumi</option>
              <option value="flood">Banjir / Genangan</option>
              <option value="fire">Kebakaran</option>
              <option value="theft">Pencurian / Perampokan</option>
              <option value="wind">Angin Kencang / Puting Beliung</option>
              <option value="other">Lainnya (Kecelakaan, dll)</option>
            </select>
          </div>

          {/* Kategori Kerusakan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kategori Kerusakan Terdampak (Bisa pilih &gt; 1):
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
                        ? "bg-red-600 text-white border-red-600 font-semibold shadow-sm shadow-red-500/20"
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

          {/* Keparahan & Operasional */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tingkat Keparahan:
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="Ringan">Ringan (Struktur Aman)</option>
                <option value="Sedang">Sedang (Perlu Perbaikan Segera)</option>
                <option value="Berat">Berat (Berbahaya / Rusak Total)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Status Operasional:
              </label>
              <select
                value={operationalStatus}
                onChange={(e) => setOperationalStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="Buka Normal">Buka Normal</option>
                <option value="Tutup Sementara">Tutup Sementara</option>
              </select>
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Catatan & Detail Kronologi:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deskripsikan secara singkat kejadian dan dampaknya..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 resize-none focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Unggah Foto (UI Dummy) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Bukti Foto (Opsional):
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <UploadCloud className="w-6 h-6 mb-2 text-slate-400" />
              <span className="text-[10px] font-medium text-center">
                Klik atau seret foto kerusakan kesini
                <br />
                <span className="text-slate-400">(Maks 3 Foto, @5MB)</span>
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Kirim Laporan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
