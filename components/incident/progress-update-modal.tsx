"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Wrench,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Calendar,
  Building,
  UploadCloud,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { IncidentRecord } from "@/types/incident";
import { UserIdentity } from "@/lib/identity";
import { ProgressUpdateRecord, WorkStage } from "@/lib/progress-service";
import { CameraCapture } from "./camera-capture";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface ProgressUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentRecord | null;
  latestProgress: number;
  onSuccess?: (updatedRecord: ProgressUpdateRecord) => void;
}

export function ProgressUpdateModal({
  isOpen,
  onClose,
  incident,
  latestProgress,
  onSuccess,
}: ProgressUpdateModalProps) {
  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [progressValue, setProgressValue] = useState<number>(latestProgress || 0);
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<WorkStage>("PENGERJAAN");
  const [photoType, setPhotoType] = useState<"PROGRESS" | "FINAL" | "HANDOVER">("PROGRESS");

  // Selected files & local preview
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<ProgressUpdateRecord | null>(null);

  useEffect(() => {
    if (isOpen && incident) {
      setProgressValue(Math.max(latestProgress || 0, incident.progress || 0));
      setDescription("");
      setSelectedFiles([]);
      setPreviewUrls([]);
      setErrorMessage(null);
      setSuccessResult(null);

      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setIdentity(data.user || data);
        })
        .catch(() => {});
    }
  }, [isOpen, incident, latestProgress]);

  // Adjust photo type suggestion when progress reaches 100%
  useEffect(() => {
    if (progressValue === 100 && photoType === "PROGRESS") {
      setPhotoType("FINAL");
    } else if (progressValue < 100 && photoType !== "PROGRESS") {
      setPhotoType("PROGRESS");
    }
  }, [progressValue]);

  if (!isOpen || !incident) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = Array.from(files);
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleCameraCapture = (file: File, previewUrl: string) => {
    setSelectedFiles((prev) => [...prev, file]);
    setPreviewUrls((prev) => [...prev, previewUrl]);
  };

  const handleRemovePhoto = (index: number) => {
    if (previewUrls[index]) URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validasi input
    if (progressValue < (latestProgress || 0)) {
      setErrorMessage(`Progress baru tidak boleh lebih kecil dari progress sebelumnya (${latestProgress}%).`);
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Keterangan pekerjaan progress wajib diisi.");
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage("Foto bukti progress wajib dilampirkan minimal 1 foto.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("progress_percentage", progressValue.toString());
      formData.append("description", description.trim());
      formData.append("stage", stage);
      formData.append("photo_type", photoType);

      selectedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const res = await fetch(`/api/incidents/${incident.id}/progress`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccessResult(json.data);
        if (onSuccess) onSuccess(json.data);
      } else {
        setErrorMessage(json.error || "Gagal memperbarui progress.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan sistem saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overscroll-none touch-none select-none">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh] sm:max-h-[85dvh] touch-auto select-text">
        {/* Header (Fixed) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#123B6D] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Update Progress Pekerjaan</h3>
              <p className="text-[11px] text-blue-200">
                {incident.storeName} ({incident.branch}) • Laporan #{incident.id}
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

        {/* Modal Body (Scrollable Internal Only) */}
        <div className="p-6 overflow-y-auto overscroll-contain space-y-5 flex-1 min-h-0">
          {successResult ? (
            /* SUKSES RESULT WITH WATERMARKED PHOTO PREVIEW */
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Progress Berhasil Diperbarui ({successResult.progressPercentage}%)!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  Catatan riwayat pekerjaan telah disimpan dan foto telah diberi watermark server otomatis.
                </p>
              </div>

              {/* Watermarked Photos Showcase */}
              {successResult.photos && successResult.photos.length > 0 && (
                <div className="space-y-2 text-left pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Foto Bukti Ber-Watermark Otomatis:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {successResult.photos.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-950"
                      >
                        <img
                          src={p.watermarkedPath}
                          alt="Watermarked Progress"
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-emerald-400">
                            {p.photoType}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {p.fileSize ? `${Math.round(p.fileSize / 1024)} KB` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {successResult.progressPercentage === 100 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-left text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <p className="text-[11px] leading-relaxed">
                    Pekerjaan fisik telah mencapai <strong>100%</strong>. Jika bukti akhir (FINAL / HANDOVER) lengkap, laporan siap ditutup oleh pengguna yang memiliki hak <strong>REPORT_CLOSE</strong>.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-[#1D5AA6] hover:bg-[#123B6D] text-white font-bold text-xs transition-colors shadow-sm"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            /* FORM UPDATE PROGRESS */
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. INFORMASI LAPORAN (READ-ONLY) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#123B6D] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    Informasi Laporan
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    Progress Terakhir: {latestProgress}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">No. Laporan</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {incident.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Toko</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {incident.storeName} ({incident.storeId || "-"})
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Cabang</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident.branch}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Tanggal Kejadian</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {incident.date || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. PROGRESS SAAT INI (0 - 100%) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Progress Saat Ini:
                  </label>
                  <span className="text-base font-extrabold text-[#1D5AA6] dark:text-blue-400">
                    {progressValue}%
                  </span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min={latestProgress || 0}
                  max={100}
                  step={5}
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#1D5AA6]"
                />

                {/* Quick Step Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {[25, 50, 75, 100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={step < (latestProgress || 0)}
                      onClick={() => setProgressValue(step)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        progressValue === step
                          ? "bg-[#1D5AA6] text-white border-[#1D5AA6] shadow-xs"
                          : step < (latestProgress || 0)
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 100% Milestone Notice */}
              {progressValue === 100 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-amber-600" />
                    Pekerjaan telah mencapai 100%
                  </p>
                  <p className="text-[11px] opacity-90">
                    Untuk finalisasi, lampirkan minimal 1 foto dengan tipe <strong>FINAL</strong> atau <strong>HANDOVER</strong> (Serah Terima).
                  </p>
                </div>
              )}

              {/* TAHAP PEKERJAAN (Section K) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tahap Pekerjaan:
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Konteks informasi
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(["PERSIAPAN", "PENGERJAAN", "FINISHING", "SELESAI", "SERAH_TERIMA"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStage(s)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all text-center truncate ${
                        stage === s
                          ? "bg-blue-50 dark:bg-blue-900/40 text-[#1D5AA6] dark:text-blue-300 border-[#1D5AA6] ring-1 ring-[#1D5AA6]"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {s === "PERSIAPAN"
                        ? "Persiapan"
                        : s === "PENGERJAAN"
                        ? "Pengerjaan"
                        : s === "FINISHING"
                        ? "Finishing"
                        : s === "SELESAI"
                        ? "Selesai"
                        : "Serah Terima"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. KLASIFIKASI FOTO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Klasifikasi Foto:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["PROGRESS", "FINAL", "HANDOVER"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPhotoType(type)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        photoType === type
                          ? "bg-blue-50 dark:bg-blue-900/40 text-[#1D5AA6] dark:text-blue-300 border-[#1D5AA6] ring-1 ring-[#1D5AA6]"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {type === "PROGRESS"
                        ? "Progress Rutin"
                        : type === "FINAL"
                        ? "Bukti Final"
                        : "Serah Terima"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. KETERANGAN PROGRESS */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Keterangan Progress <span className="text-red-500">*</span>:
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  required
                  placeholder="Contoh: Pembongkaran plafon rusak selesai, rangka pengganti siap dipasang..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1D5AA6] focus:outline-hidden"
                />
              </div>

              {/* 5. UPLOAD FOTO (WAJIB DENGAN WATERMARK SERVER) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#1D5AA6]" />
                    Upload Foto Bukti <span className="text-red-500">* (Wajib)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Otomatis Watermark Server
                  </span>
                </div>

                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    ref={fileInputRef}
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {previewUrls.length === 0 ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 h-20 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-[#1D5AA6] hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <Camera className="w-5 h-5 text-[#1D5AA6]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Kamera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 h-20 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-[#1D5AA6] hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <ImageIcon className="w-5 h-5 text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Galeri Foto</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {previewUrls.map((url, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group">
                            <img
                              src={url}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-24 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-md text-[10px]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[9px] font-mono">
                              Foto #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          + Tambah Foto Lain
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Server Watermark Notice */}
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[10px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    Watermark otomatis server mencakup: <strong>SPARTA SIAGA</strong>, Nomor Laporan: <strong>{incident.id}</strong>, Timestamp Terpercaya Server WIB, dan Progress <strong>{progressValue}%</strong>.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#1D5AA6] hover:bg-[#123B6D] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Menyimpan Progress...</span>
                  ) : (
                    <>
                      <span>Simpan Progress</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        storeName={incident.storeName}
        reporterName={identity?.name || "Petugas Lapangan"}
      />
    </div>
  );
}
