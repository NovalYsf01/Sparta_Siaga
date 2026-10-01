"use client";

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, FileText, Building, User, ChevronRight, CheckCircle2, Eye } from "lucide-react";
import { DisasterType } from "@/types/incident";
import { FieldPhotoUploader, PhotoData } from "./field-photo-uploader";

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

const emptyPhoto: PhotoData = { file: null, previewUrl: null, source: null, reporterRelation: null, capturedAt: null };

export function ManualIncidentModal({
  isOpen,
  onClose,
  activeRole,
  rawStores,
  onConfirm,
}: ManualIncidentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [disasterType, setDisasterType] = useState<DisasterType>("flood");
  const [tkpType, setTkpType] = useState<"Toko" | "DC">("Toko");
  const [storeId, setStoreId] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [severity, setSeverity] = useState("Sedang");
  const [operationalStatus, setOperationalStatus] = useState("Buka Normal");
  const [notes, setNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStoreObj, setSelectedStoreObj] = useState<any>(null);

  const isAdmin = activeRole === "ho_admin";

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Don't search if it's already selecting a store (the query contains '[' and ']')
    if (searchQuery.startsWith("[")) {
      return;
    }

    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/stores/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data || []);
        }
      } catch (err) {
        console.error("Failed to search stores:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  const [photos, setPhotos] = useState<{
    depan: PhotoData;
    dalam: PhotoData;
    kiri: PhotoData;
    kanan: PhotoData;
    detailDC: PhotoData;
  }>({
    depan: emptyPhoto,
    dalam: emptyPhoto,
    kiri: emptyPhoto,
    kanan: emptyPhoto,
    detailDC: emptyPhoto,
  });

  useEffect(() => {
    if (isOpen && !isAdmin) {
      const assignedStore = rawStores.find((s) => s.cabang !== "MANUAL"); 
      if (assignedStore) {
        setStoreId(assignedStore.id || assignedStore.kode_toko);
      }
    } else if (isOpen && isAdmin) {
      setStoreId("");
    }
    
    // reset state on open
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen, isAdmin, rawStores]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!storeId && isAdmin) {
        alert("Pilih lokasi terlebih dahulu!");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const requiredPhotos = photos.depan.file && photos.dalam.file && photos.kiri.file && photos.kanan.file;
      const isDCValid = tkpType === "DC" ? photos.detailDC.file : true;
      if (!requiredPhotos || !isDCValid) {
        alert("Laporan manual WAJIB melampirkan seluruh sisi foto yang diminta.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const store = selectedStoreObj || rawStores.find(
      (s) => s.kode_toko === storeId || s.id === storeId
    );

    // Generate dummy URLs or handle files in a real app
    const dummyPhotos = [
      photos.depan.previewUrl || "",
      photos.dalam.previewUrl || "",
      photos.kiri.previewUrl || "",
      photos.kanan.previewUrl || ""
    ];
    if (tkpType === "DC" && photos.detailDC.previewUrl) {
      dummyPhotos.unshift(photos.detailDC.previewUrl);
    }

    onConfirm({
      disasterType,
      reportOrigin: "manual",
      tkpType,
      storeId,
      storeName: store?.nama_toko || (tkpType === "DC" ? "Gudang Utama" : "Lokasi Tidak Diketahui"),
      branch: store?.cabang || "Unknown",
      locationCity: store?.kab_kota || "Unknown",
      categories,
      severity,
      operationalStatus,
      notes,
      photos: dummyPhotos
    });

    // Reset state after submit handled in parent, but clean up local urls
    if (photos.depan.previewUrl) URL.revokeObjectURL(photos.depan.previewUrl);
    if (photos.dalam.previewUrl) URL.revokeObjectURL(photos.dalam.previewUrl);
    if (photos.kiri.previewUrl) URL.revokeObjectURL(photos.kiri.previewUrl);
    if (photos.kanan.previewUrl) URL.revokeObjectURL(photos.kanan.previewUrl);
    if (photos.detailDC.previewUrl) URL.revokeObjectURL(photos.detailDC.previewUrl);
    
    setPhotos({
      depan: emptyPhoto,
      dalam: emptyPhoto,
      kiri: emptyPhoto,
      kanan: emptyPhoto,
      detailDC: emptyPhoto,
    });
  };

  if (!isOpen) return null;

  const store = selectedStoreObj || rawStores.find(s => s.kode_toko === storeId || s.id === storeId);

  return (
    <div className="fixed inset-0 z-[6000] flex md:items-center justify-center bg-slate-50 md:bg-slate-950/70 md:backdrop-blur-sm animate-in fade-in">
      {/* Full screen on mobile, large dialog on desktop */}
      <div className="bg-slate-50 md:bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-[24px] overflow-hidden md:shadow-2xl flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-200 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-[#123B6D] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                Pelaporan Insiden Operasional
              </h3>
              <p className="text-[10px] text-blue-200">
                Langkah {step} dari 3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-200 shrink-0">
          <div 
            className="h-full bg-[#D9272E] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* STEP 1: Pelapor & Lokasi & Kondisi */}
          {step === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> 1. Data Pelapor
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Nama</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                      Auto-filled (Session)
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Peran</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                      {activeRole.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4" /> 2. Lokasi TKP
                </h4>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button 
                    type="button"
                    onClick={() => setTkpType("Toko")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${tkpType === "Toko" ? "border-[#1D5AA6] bg-[#1D5AA6]/5 text-[#1D5AA6]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <Building className="w-6 h-6 mb-2" />
                    <span className="font-bold text-sm">Gerai / Toko</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTkpType("DC")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${tkpType === "DC" ? "border-[#1D5AA6] bg-[#1D5AA6]/5 text-[#1D5AA6]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <Building className="w-6 h-6 mb-2" />
                    <span className="font-bold text-sm">Gudang / DC</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Cari & Pilih Lokasi {tkpType}:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ketik nama atau kode toko..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1D5AA6] bg-slate-50"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-2.5 text-xs text-slate-400">Mencari...</div>
                    )}
                    {searchResults.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((s) => (
                          <li
                            key={s.id || s.kode_toko}
                            onClick={() => {
                              setStoreId(s.id || s.kode_toko);
                              setSelectedStoreObj(s);
                              setSearchQuery(`[${s.kode_toko}] ${s.nama_toko}`);
                              setSearchResults([]);
                            }}
                            className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                          >
                            <div className="font-bold">[{s.kode_toko}] {s.nama_toko}</div>
                            <div className="text-[10px] text-slate-500">{s.cabang} - {s.alamat}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> 3. Kategori Kejadian
                </h4>
                
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Jenis Kejadian Utama:
                  </label>
                  <select
                    value={disasterType}
                    onChange={(e) => setDisasterType(e.target.value as DisasterType)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1D5AA6]"
                  >
                    <option value="theft">KEMALINGAN</option>
                    <option value="fire">KEBAKARAN</option>
                    <option value="flood">KEBANJIRAN</option>
                    <option value="heavy_rain">HUJAN/BADAI</option>
                    <option value="strong_wind">ANGIN KENCANG</option>
                    <option value="earthquake">GEMPA BUMI</option>
                    <option value="severe_building_damage">BANGUNAN RUSAK PARAH</option>
                  </select>
                </div>


                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tingkat Keparahan</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="Ringan">Ringan (Struktur Aman)</option>
                      <option value="Sedang">Sedang (Perlu Perbaikan Segera)</option>
                      <option value="Berat">Berat (Rusak Total)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Status Operasional</label>
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

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Kronologi / Catatan</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Deskripsikan secara singkat kejadian..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 resize-none focus:outline-none focus:border-[#1D5AA6]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Foto Bukti */}
          {step === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4">
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-[#123B6D] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> 4. Bukti Foto Aktual
                </h4>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium">
                    Sesuai SOP Pelaporan, setiap insiden wajib melampirkan minimal 4 sisi foto aktual. Untuk DC, wajib tambah foto titik detail.
                  </p>
                </div>

                {tkpType === "DC" && (
                  <div className="mb-6">
                    <FieldPhotoUploader 
                      label="Titik Kejadian Spesifik (Detail)"
                      description="Fokus pada lokasi kerusakan utama di area Gudang/DC"
                      value={photos.detailDC}
                      onChange={(data) => setPhotos({ ...photos, detailDC: data })}
                      storeName={store?.nama_toko || "Lokasi Tidak Diketahui"}
                      reporterName="Noval"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldPhotoUploader 
                    label="Foto Tampak 1"
                    value={photos.depan}
                    onChange={(data) => setPhotos({ ...photos, depan: data })}
                    storeName={store?.nama_toko || "Lokasi Tidak Diketahui"}
                    reporterName="Noval"
                  />
                  <FieldPhotoUploader 
                    label="Foto Tampak 2"
                    value={photos.dalam}
                    onChange={(data) => setPhotos({ ...photos, dalam: data })}
                    storeName={store?.nama_toko || "Lokasi Tidak Diketahui"}
                    reporterName="Noval"
                  />
                  <FieldPhotoUploader 
                    label="Foto Tampak 3"
                    value={photos.kiri}
                    onChange={(data) => setPhotos({ ...photos, kiri: data })}
                    storeName={store?.nama_toko || "Lokasi Tidak Diketahui"}
                    reporterName="Noval"
                  />
                  <FieldPhotoUploader 
                    label="Foto Tampak 4"
                    value={photos.kanan}
                    onChange={(data) => setPhotos({ ...photos, kanan: data })}
                    storeName={store?.nama_toko || "Lokasi Tidak Diketahui"}
                    reporterName="Noval"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-[#123B6D] uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Eye className="w-5 h-5" /> 5. Review Laporan
                </h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs text-slate-500">TKP / Lokasi</span>
                    <span className="text-sm font-bold text-slate-800 text-right">{store?.nama_toko || "Tidak diketahui"} <br/> <span className="text-[10px] text-slate-400 font-normal">({store?.cabang})</span></span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Kategori Kejadian</span>
                    <span className="text-sm font-bold text-slate-800 capitalize">{disasterType}</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Status Operasional</span>
                    <span className="text-sm font-bold text-[#D9272E]">{operationalStatus}</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Bukti Foto</span>
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Lengkap ({tkpType === "DC" ? "5" : "4"} Foto)
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <p className="text-xs text-slate-600 leading-relaxed text-center font-medium">
                    Pastikan seluruh data dan foto yang dilampirkan adalah benar dan dapat dipertanggungjawabkan sesuai SOP Perusahaan.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 md:px-8 md:py-5 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep((step - 1) as 1 | 2);
              else onClose();
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {step === 1 ? "Batal" : "Kembali"}
          </button>
          
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1D5AA6] hover:bg-[#123B6D] transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
            >
              <span>Lanjut</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#D9272E] hover:bg-red-700 transition-all flex items-center gap-2 shadow-md shadow-red-500/20"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Kirim Laporan Resmi</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
