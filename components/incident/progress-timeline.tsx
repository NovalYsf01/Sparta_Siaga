"use client";

import React, { useState } from "react";
import {
  Clock,
  User,
  CheckCircle2,
  Calendar,
  Image as ImageIcon,
  Eye,
  X,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { ProgressUpdateRecord, ProgressPhotoRecord } from "@/lib/progress-service";

interface ProgressTimelineProps {
  history: ProgressUpdateRecord[];
  loading?: boolean;
}

export function ProgressTimeline({ history, loading }: ProgressTimelineProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhotoRecord | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 animate-pulse text-xs text-slate-400">
        Memuat riwayat progress...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
        <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300">
          Belum Ada Riwayat Progress
        </h5>
        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
          Pembaruan persentase dan dokumentasi foto ber-watermark akan tercatat di sini secara kronologis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Stream (Section AB & AC) */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {history.map((item, index) => {
          const isLatest = index === history.length - 1;
          const is100 = item.progressPercentage === 100;

          const formattedDate = new Date(item.createdAt).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta",
          });

          return (
            <div key={item.id} className="relative group">
              {/* Bullet Node */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors ${
                  is100
                    ? "border-emerald-500 text-emerald-500"
                    : isLatest
                    ? "border-blue-600 text-blue-600 ring-4 ring-blue-50 dark:ring-blue-950/50"
                    : "border-slate-400 text-slate-400"
                }`}
              >
                {is100 ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isLatest ? "bg-blue-600" : "bg-slate-400"
                    }`}
                  />
                )}
              </div>

              {/* Content Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                {/* Header (Timestamp & Progress Badge) */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formattedDate} WIB
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                      is100
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    Progress {item.progressPercentage}%
                  </span>
                </div>

                {/* Description Text */}
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  &ldquo;{item.description}&rdquo;
                </p>

                {/* Additional Notes if any */}
                {item.notes && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    Catatan: {item.notes}
                  </div>
                )}

                {/* Photo Gallery Thumbnails */}
                {item.photos && item.photos.length > 0 && (
                  <div className="pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {item.photos.map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setShowOriginal(false);
                          }}
                          className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group/photo aspect-video bg-slate-950"
                        >
                          <img
                            src={photo.watermarkedPath}
                            alt="Bukti Foto"
                            className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                            <Eye className="w-4 h-4" />
                            <span>Lihat Foto</span>
                          </div>
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white rounded text-[9px] font-bold">
                            {photo.photoType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer (Petugas Pelapor) */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Petugas:{" "}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                      {item.createdByName}
                    </strong>
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {item.id}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal (Zoom Photo + Original vs Watermarked Toggle) */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-xs">
                  Dokumentasi Foto ({selectedPhoto.photoType})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Original vs Watermarked (Section Z) */}
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setShowOriginal(false)}
                    className={`px-3 py-1 rounded-md text-[11px] transition-colors ${
                      !showOriginal
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Watermark Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOriginal(true)}
                    className={`px-3 py-1 rounded-md text-[11px] transition-colors ${
                      showOriginal
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Foto Asli (Original)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Display */}
            <div className="p-4 bg-black flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={showOriginal ? selectedPhoto.originalPath : selectedPhoto.watermarkedPath}
                alt="Bukti Foto Full"
                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
              />
            </div>

            {/* Photo Info Details */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 text-[11px]">
                <span>
                  Tipe: <strong className="text-slate-900 dark:text-white">{selectedPhoto.photoType}</strong>
                </span>
                <span>
                  Format: <strong className="text-slate-900 dark:text-white">{selectedPhoto.mimeType}</strong>
                </span>
                <span>
                  Ukuran: <strong className="text-slate-900 dark:text-white">{Math.round(selectedPhoto.fileSize / 1024)} KB</strong>
                </span>
              </div>

              <div className="text-[11px] text-slate-500">
                Mode Tampil:{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {showOriginal ? "Foto Mentah Asli" : "Dilengkapi Watermark Server Resmi"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
