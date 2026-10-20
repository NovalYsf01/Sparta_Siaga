"use client";

import React, { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X, UploadCloud, Info, Check, RefreshCw } from "lucide-react";
import { CameraCapture } from "./camera-capture";

export interface PhotoData {
  file: File | null;
  previewUrl: string | null;
  source: "camera" | "gallery" | null;
  reporterRelation: "self" | "received" | null;
  galleryReason?: string | null;
  sourceProvider?: string | null;
  receiptContext?: string | null;
  capturedAt: string | null;
}

interface FieldPhotoUploaderProps {
  label: string;
  description?: string;
  value: PhotoData;
  onChange: (data: PhotoData) => void;
  storeName?: string;
  reporterName?: string;
}

export function FieldPhotoUploader({
  label,
  description,
  value,
  onChange,
  storeName = "",
  reporterName = "",
}: FieldPhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow Modals
  const [isSourceChoiceOpen, setIsSourceChoiceOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

  // Temporary state for gallery photo metadata modal
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [relation, setRelation] = useState<"self" | "received">("self");
  const [reason, setReason] = useState("");
  const [sourceProvider, setSourceProvider] = useState("");
  const [receiptContext, setReceiptContext] = useState("");

  const handleOpenSourceChoice = () => {
    setIsSourceChoiceOpen(true);
  };

  const handleChooseCamera = () => {
    setIsSourceChoiceOpen(false);
    setIsCameraOpen(true);
  };

  const handleChooseGallery = () => {
    setIsSourceChoiceOpen(false);
    fileInputRef.current?.click();
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset temporary state
    setPendingFile(file);
    const tempUrl = URL.createObjectURL(file);
    setPendingPreview(tempUrl);
    setRelation("self");
    setReason("");
    setSourceProvider("");
    setReceiptContext("");
    setIsGalleryModalOpen(true);

    // Reset input value so same file can be chosen again if needed
    e.target.value = "";
  };

  const handleCancelGalleryModal = () => {
    if (pendingPreview) {
      URL.revokeObjectURL(pendingPreview);
    }
    setPendingFile(null);
    setPendingPreview(null);
    setIsGalleryModalOpen(false);
  };

  const handleConfirmGalleryPhoto = () => {
    if (!pendingFile || !pendingPreview) return;
    if (!reason.trim()) return;
    if (relation === "received" && (!sourceProvider.trim() || !receiptContext.trim())) return;

    // Clean up previous preview url if different
    if (value.previewUrl && value.previewUrl !== pendingPreview) {
      URL.revokeObjectURL(value.previewUrl);
    }

    onChange({
      file: pendingFile,
      previewUrl: pendingPreview,
      source: "gallery",
      reporterRelation: relation,
      galleryReason: reason.trim(),
      sourceProvider: relation === "received" ? sourceProvider.trim() : null,
      receiptContext: relation === "received" ? receiptContext.trim() : null,
      capturedAt: new Date().toISOString(),
    });

    setPendingFile(null);
    setPendingPreview(null);
    setIsGalleryModalOpen(false);
  };

  const handleCameraCapture = (file: File, previewUrl: string) => {
    if (value.previewUrl && value.previewUrl !== previewUrl) {
      URL.revokeObjectURL(value.previewUrl);
    }

    onChange({
      file,
      previewUrl,
      source: "camera",
      reporterRelation: "self",
      galleryReason: null,
      sourceProvider: null,
      receiptContext: null,
      capturedAt: new Date().toISOString(),
    });
  };

  const handleRemove = () => {
    if (value.previewUrl) {
      URL.revokeObjectURL(value.previewUrl);
    }
    onChange({
      file: null,
      previewUrl: null,
      source: null,
      reporterRelation: null,
      galleryReason: null,
      sourceProvider: null,
      receiptContext: null,
      capturedAt: null,
    });
  };

  // Validation for gallery confirmation button
  const isGalleryValid =
    reason.trim().length > 0 &&
    (relation === "self" ||
      (relation === "received" && sourceProvider.trim().length > 0 && receiptContext.trim().length > 0));

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{label}</h4>
        {description && <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>}
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFilePicked}
      />

      {/* ── Case 1: Slot is Empty ── */}
      {!value.previewUrl ? (
        <button
          type="button"
          onClick={handleOpenSourceChoice}
          className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#1D5AA6] hover:bg-[#EAF2FB]/50 dark:hover:bg-blue-900/20 text-slate-500 hover:text-[#1D5AA6] transition-all group"
        >
          <div className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-[#1D5AA6]/10 text-slate-600 dark:text-slate-400 group-hover:text-[#1D5AA6] transition-colors">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#1D5AA6] block">
              Upload Foto
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Ambil foto kamera langsung atau pilih dari galeri
            </span>
          </div>
        </button>
      ) : (
        /* ── Case 2: Photo is Attached ── */
        <div className="space-y-2.5">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950">
            <img
              src={value.previewUrl}
              alt={label}
              className="w-full h-36 md:h-44 object-cover"
            />

            {/* Badges Overlay */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
              {value.source === "camera" ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600/90 text-white backdrop-blur-sm flex items-center gap-1 shadow-xs">
                  <Camera className="w-3 h-3" />
                  <span>Kamera Langsung</span>
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm flex items-center gap-1 shadow-xs ${
                    value.reporterRelation === "received"
                      ? "bg-purple-600/90 text-white"
                      : "bg-blue-600/90 text-white"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>
                    {value.reporterRelation === "received"
                      ? `Galeri (Pihak Lain: ${value.sourceProvider || "Pemberi"})`
                      : "Galeri (Diambil Sendiri)"}
                  </span>
                </span>
              )}
            </div>

            {/* Delete Button */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2.5 right-2.5 p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-700 shadow-md backdrop-blur-sm transition-colors z-10"
              title="Hapus Foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metadata Display for Gallery Photos */}
          {value.source === "gallery" && (
            <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/80 dark:border-slate-700 text-xs space-y-1">
              <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 dark:text-white">Alasan Galeri: </span>
                  <span className="text-slate-700 dark:text-slate-300">{value.galleryReason || "-"}</span>
                </div>
              </div>

              {value.reporterRelation === "received" && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-blue-200/50 dark:border-slate-700 space-y-0.5 pl-5">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Sumber: </span>
                    <span>{value.sourceProvider || "-"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Konteks: </span>
                    <span>{value.receiptContext || "-"}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleOpenSourceChoice}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#1D5AA6] bg-white dark:bg-slate-800 border border-[#1D5AA6]/30 hover:bg-[#EAF2FB] dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ganti Foto</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 hover:bg-red-100 transition-colors"
            >
              Hapus
            </button>
          </div>
        </div>
      )}

      {/* ── Dialog 1: Pilih Sumber Foto ── */}
      {isSourceChoiceOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pilih Sumber Foto</h3>
              <button
                type="button"
                onClick={() => setIsSourceChoiceOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Unggah bukti foto untuk slot <strong>{label}</strong>:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleChooseCamera}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#1D5AA6] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center gap-3 transition-all text-left group"
              >
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Ambil Foto Langsung</div>
                  <div className="text-[11px] text-slate-400">Gunakan kamera perangkat dengan watermark otomatis</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleChooseGallery}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#1D5AA6] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center gap-3 transition-all text-left group"
              >
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Pilih dari Galeri Perangkat</div>
                  <div className="text-[11px] text-slate-400">Pilih berkas foto yang tersimpan di perangkat</div>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setIsSourceChoiceOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog 2: Mandatory Gallery Photo Metadata ── */}
      {isGalleryModalOpen && pendingPreview && (
        <div className="fixed inset-0 z-[1300] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Verifikasi Bukti Foto Galeri</span>
              </h3>
              <button
                type="button"
                onClick={handleCancelGalleryModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Preview */}
            <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 border border-slate-200 dark:border-slate-700">
              <img
                src={pendingPreview}
                alt="Pratinjau galeri"
                className="w-16 h-16 object-cover rounded-lg shrink-0"
              />
              <div className="min-w-0 text-xs">
                <span className="font-bold text-slate-800 dark:text-white block truncate">
                  {pendingFile?.name || "Foto Galeri"}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Slot target: <strong className="text-blue-600">{label}</strong>
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* 1. Sumber Foto: Diambil Sendiri vs Pihak Lain */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-white mb-1.5">
                  1. Kepemilikan Foto <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRelation("self")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      relation === "self"
                        ? "border-[#1D5AA6] bg-[#1D5AA6]/5 text-[#1D5AA6] font-bold"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Diambil oleh Saya</span>
                      {relation === "self" && <Check className="w-4 h-4 text-[#1D5AA6]" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 block">
                      Foto dokumentasi pribadi pelapor
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRelation("received")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      relation === "received"
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Diterima Pihak Lain</span>
                      {relation === "received" && <Check className="w-4 h-4 text-purple-600" />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 block">
                      Dari kepala toko, staf, atau pihak ketiga
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Alasan Penggunaan Galeri (Wajib untuk Kedua Pilihan!) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-white mb-1">
                  2. Alasan Penggunaan Foto Galeri <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                  Wajib dijelaskan untuk audit keaslian bukti dan verifikasi insiden operasional.
                </p>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Diambil sesaat setelah getaran gempa berhenti / Kendala sinyal internet saat di TKP..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#1D5AA6]"
                />
              </div>

              {/* 3. Conditional Fields if Received from Third Party */}
              {relation === "received" && (
                <div className="space-y-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-xl animate-in fade-in">
                  <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-purple-600" />
                    <span>Identitas & Konteks Penerimaan Foto</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sumber / Identitas Pemberi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sourceProvider}
                      onChange={(e) => setSourceProvider(e.target.value)}
                      placeholder="Misal: Budi (Kepala Toko) / Duty Officer DC / Polsek setempat"
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Konteks Penerimaan Foto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={receiptContext}
                      onChange={(e) => setReceiptContext(e.target.value)}
                      placeholder="Misal: Dikirim via grup WhatsApp operasional cabang pukul 08:35 WIB"
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelGalleryModal}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmGalleryPhoto}
                disabled={!isGalleryValid}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1D5AA6] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
              >
                Gunakan Foto Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Camera Capture Component ── */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        storeName={storeName}
        reporterName={reporterName}
      />
    </div>
  );
}
