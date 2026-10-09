"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Camera as CameraIcon,
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Check,
  RotateCcw,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  storeName: string;
  reporterName?: string;
}

type CameraState = "IDLE" | "REQUESTING" | "LIVE" | "CAPTURING" | "REVIEW" | "ERROR";

interface CapturedPhotoData {
  file: File;
  previewUrl: string;
}

export function CameraCapture({
  isOpen,
  onClose,
  onCapture,
  storeName,
  reporterName = "Unknown",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("IDLE");
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoSize, setVideoSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhotoData | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ title: string; message: string; recommendation?: string } | null>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  }, [stream]);

  // Clean up captured photo preview URL if not used
  const cleanupCapturedPhoto = useCallback(() => {
    if (capturedPhoto?.previewUrl) {
      URL.revokeObjectURL(capturedPhoto.previewUrl);
      setCapturedPhoto(null);
    }
  }, [capturedPhoto]);

  // Modal open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCameraState("IDLE");
      setErrorDetails(null);
      setIsVideoReady(false);
      getLocation();
    } else {
      stopCamera();
      cleanupCapturedPhoto();
      setCameraState("IDLE");
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Connect stream to video element whenever stream changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.muted = true; // Required by autoplay security policies
      
      const handleMetadata = () => {
        video.play().catch((err) => {
          console.warn("[CameraCapture] Video play warning:", err);
        });
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoSize({ width: video.videoWidth, height: video.videoHeight });
          setIsVideoReady(true);
        }
      };

      const handlePlaying = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoSize({ width: video.videoWidth, height: video.videoHeight });
          setIsVideoReady(true);
        }
      };

      video.addEventListener("loadedmetadata", handleMetadata);
      video.addEventListener("playing", handlePlaying);

      // In case metadata is already loaded
      if (video.readyState >= 2 && video.videoWidth > 0) {
        setVideoSize({ width: video.videoWidth, height: video.videoHeight });
        setIsVideoReady(true);
      }

      return () => {
        video.removeEventListener("loadedmetadata", handleMetadata);
        video.removeEventListener("playing", handlePlaying);
      };
    } else {
      video.srcObject = null;
      setIsVideoReady(false);
    }
  }, [stream]);

  const getLocation = () => {
    setLocError(null);
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocError("Lokasi tidak dapat diperoleh"),
        { timeout: 8000 }
      );
    } else {
      setLocError("Geolokasi tidak didukung browser");
    }
  };

  const getErrorFeedback = (err: any) => {
    const name = err.name || "";
    const msg = err.message || "";
    if (
      name.includes("NotAllowedError") ||
      name.includes("PermissionDeniedError") ||
      msg.includes("Permission denied") ||
      msg.includes("disallowed by permissions policy")
    ) {
      return {
        title: "Izin Kamera Belum Aktif (NotAllowedError)",
        message: "Browser atau perangkat memblokir akses ke hardware kamera.",
        recommendation: "Periksa: (1) Klik ikon setelan/gembok pada address bar browser untuk mengizinkan kamera situs ini, dan (2) Di Windows Settings > Privacy & Security > Camera, aktifkan 'Let desktop apps access your camera'.",
      };
    }
    if (name.includes("NotFoundError") || name.includes("DevicesNotFoundError")) {
      return {
        title: "Kamera Tidak Terdeteksi (NotFoundError)",
        message: "Perangkat keras webcam tidak ditemukan.",
        recommendation: "Pastikan kamera terpasang, driver aktif, atau gunakan opsi 'Unggah Foto'.",
      };
    }
    if (name.includes("NotReadableError") || name.includes("TrackStartError")) {
      return {
        title: "Kamera Sedang Digunakan (NotReadableError)",
        message: "Kamera dikunci oleh aplikasi lain atau penutup fisik tertutup.",
        recommendation: "Tutup Zoom, Teams, Skype, atau mode privasi Lenovo Vantage, lalu coba lagi.",
      };
    }
    if (name.includes("OverconstrainedError")) {
      return {
        title: "Kendala Konfigurasi (OverconstrainedError)",
        message: "Resolusi atau sensor kamera yang diminta tidak dapat dipenuhi.",
        recommendation: "Klik 'Coba Lagi' untuk menggunakan konfigurasi kamera standar.",
      };
    }
    if (name.includes("SecurityError")) {
      return {
        title: "Pembatasan Keamanan (SecurityError)",
        message: "Konteks halaman atau Permissions-Policy memblokir akses kamera.",
        recommendation: "Pastikan membuka web via HTTPS atau http://localhost.",
      };
    }
    return {
      title: "Gagal Mengakses Kamera",
      message: msg || "Terjadi kesalahan sistem saat mencoba mengakses kamera.",
      recommendation: "Gunakan opsi 'Unggah Foto' jika kendala hardware berlanjut.",
    };
  };

  const startCamera = async () => {
    setErrorDetails(null);
    setIsVideoReady(false);
    setCameraState("REQUESTING");

    try {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error("Aplikasi dibuka melalui protokol tidak aman (Insecure Context HTTP). Akses kamera hanya didukung via HTTPS atau localhost.");
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser ini tidak mendukung navigator.mediaDevices.getUserMedia.");
      }

      // Stop previous stream if running
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      let mediaStream: MediaStream;
      try {
        // Attempt primary constraint (environment camera if mobile/tablet, user-friendly fallback)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr: any) {
        // Fallback to any available video sensor (laptop front camera)
        if (firstErr.name === "OverconstrainedError" || firstErr.name === "NotFoundError") {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw firstErr;
        }
      }

      setStream(mediaStream);
      setCameraState("LIVE");
    } catch (err: any) {
      setErrorDetails(getErrorFeedback(err));
      setCameraState("ERROR");
    }
  };

  // Watermark generator on canvas
  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const bannerHeight = Math.max(110, Math.round(height * 0.14));
    
    // Dark gradient overlay at bottom
    const gradient = ctx.createLinearGradient(0, height - bannerHeight, 0, height);
    gradient.addColorStop(0, "rgba(2, 6, 23, 0.7)");
    gradient.addColorStop(1, "rgba(2, 6, 23, 0.95)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Accent line top of banner
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(0, height - bannerHeight, width, Math.max(3, Math.round(height * 0.005)));

    // Scale font sizes based on resolution
    const baseFontSize = Math.max(12, Math.round(width * 0.022));
    const titleFontSize = Math.max(14, Math.round(width * 0.028));

    // Left Column: Brand & Store & Time
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("SPARTA SIAGA • DOKUMENTASI RESMI", 20, height - bannerHeight + titleFontSize + 12);

    ctx.font = `bold ${baseFontSize}px Arial, sans-serif`;
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(storeName || "Lokasi Toko SPARTA", 20, height - bannerHeight + titleFontSize + baseFontSize + 20);

    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("id-ID") + " WIB";
    ctx.font = `normal ${Math.max(11, baseFontSize - 2)}px monospace`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`${dateStr} | ${timeStr}`, 20, height - 16);

    // Right Column: Location & Reporter
    ctx.textAlign = "right";
    const locText = location
      ? `GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
      : locError
      ? locError
      : "GPS: Menunggu koordinat...";
    ctx.font = `normal ${Math.max(11, baseFontSize - 2)}px monospace`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(locText, width - 20, height - bannerHeight + titleFontSize + 14);

    ctx.font = `bold ${baseFontSize}px Arial, sans-serif`;
    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(`Pelapor: ${reporterName}`, width - 20, height - 16);
  };

  // Shutter action
  const handleShutterCapture = () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) return;

    setCameraState("CAPTURING");
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const captureWidth = video.videoWidth || 1280;
    const captureHeight = video.videoHeight || 720;

    canvas.width = captureWidth;
    canvas.height = captureHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraState("LIVE");
      toast.error("Gagal menginisialisasi canvas rendering.");
      return;
    }

    try {
      // 1. Draw raw video frame
      ctx.drawImage(video, 0, 0, captureWidth, captureHeight);

      // 2. Overlay official watermark
      drawWatermark(ctx, captureWidth, captureHeight);

      // 3. Convert to image blob
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            setCameraState("LIVE");
            toast.error("Gagal menghasilkan file foto.");
            return;
          }

          const file = new File([blob], `sparta_capture_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          const previewUrl = URL.createObjectURL(blob);

          setCapturedPhoto({ file, previewUrl });
          setCameraState("REVIEW");

          // Pause video to conserve resources
          try {
            video.pause();
          } catch {}
        },
        "image/jpeg",
        0.88
      );
    } catch (e: any) {
      console.error("[CameraCapture] Capture exception:", e);
      setCameraState("LIVE");
      toast.error("Terjadi kesalahan saat memproses frame gambar.");
    }
  };

  // Retake action (Foto Ulang)
  const handleRetake = () => {
    cleanupCapturedPhoto();
    if (videoRef.current && stream) {
      videoRef.current.play().catch(() => {});
    }
    setCameraState("LIVE");
  };

  // Confirm photo action (Gunakan Foto)
  const handleUsePhoto = () => {
    if (!capturedPhoto) return;

    onCapture(capturedPhoto.file, capturedPhoto.previewUrl);
    stopCamera();
    onClose();
    toast.success("Foto bukti berhasil dilampirkan.");
  };

  // Manual file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraState("CAPTURING");
    const img = new Image();
    const tempUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCameraState("IDLE");
        toast.error("Gagal memproses gambar.");
        URL.revokeObjectURL(tempUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);
      drawWatermark(ctx, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const watermarkedFile = new File([blob], `sparta_upload_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            const previewUrl = URL.createObjectURL(blob);
            setCapturedPhoto({ file: watermarkedFile, previewUrl });
            setCameraState("REVIEW");
          }
        },
        "image/jpeg",
        0.88
      );

      URL.revokeObjectURL(tempUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      setCameraState("IDLE");
      toast.error("Format file foto tidak valid.");
    };

    img.src = tempUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[7000] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in select-none">
      {/* Top Controls Bar */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs text-slate-300 pointer-events-auto">
          <CameraIcon className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-white">SPARTA Camera</span>
          {cameraState === "LIVE" && isVideoReady && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold ml-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE {videoSize.width > 0 ? `(${videoSize.width}x${videoSize.height})` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {cameraState === "LIVE" && (
            <button
              onClick={() => {
                startCamera();
                getLocation();
              }}
              title="Muat Ulang Kamera"
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors border border-slate-800 shadow-md backdrop-blur-md"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              stopCamera();
              cleanupCapturedPhoto();
              onClose();
            }}
            title="Tutup Kamera"
            className="p-2.5 bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white rounded-full transition-colors border border-slate-800 shadow-md backdrop-blur-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden file input for gallery fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Center Viewport Container */}
      <div className="relative w-full h-full max-w-3xl flex flex-col items-center justify-center p-4">
        {/* Persistent Video Element to avoid ref mounting race conditions */}
        <div
          className={`relative w-full max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl ${
            cameraState === "LIVE" ? "block" : "hidden"
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full max-h-[80vh] object-contain"
          />

          {/* Virtual Viewfinder Guidelines overlay */}
          <div className="absolute inset-x-6 bottom-24 text-white pointer-events-none drop-shadow-lg">
            <div className="bg-slate-950/40 backdrop-blur-xs p-3 rounded-xl border border-white/10 max-w-sm">
              <p className="font-black text-sm tracking-wide text-white">SPARTA SIAGA • BUKTI LAPANGAN</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">{storeName}</p>
              <p className="text-[11px] font-mono text-cyan-300 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {location
                  ? `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`
                  : locError || "Mengambil titik GPS..."}
              </p>
            </div>
          </div>
        </div>

        {/* 1. State: INTRO */}
        {cameraState === "IDLE" && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in">
            <div className="w-20 h-20 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400 shadow-lg">
              <CameraIcon className="w-10 h-10" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold text-white tracking-tight">Dokumentasi Lapangan</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ambil foto bukti kondisi kejadian atau update pekerjaan langsung melalui kamera, lengkap dengan stempel digital SPARTA SIAGA.
              </p>
            </div>
            <div className="flex flex-col w-full max-w-xs gap-3 pt-4">
              <button
                onClick={startCamera}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 active:scale-98"
              >
                <CameraIcon className="w-4 h-4" /> Buka Kamera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-800"
              >
                <ImageIcon className="w-4 h-4" /> Unggah Dari Galeri
              </button>
            </div>
          </div>
        )}

        {/* 2. State: INITIALIZING / CAPTURING */}
        {(cameraState === "REQUESTING" || cameraState === "CAPTURING") && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 shadow-md">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {cameraState === "REQUESTING" ? "Menghubungkan ke sensor kamera..." : "Memproses foto & stempel watermark..."}
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Pastikan Anda telah menyetujui izin kamera pada peramban.
            </p>
          </div>
        )}

        {/* 3. State: ERROR */}
        {cameraState === "ERROR" && errorDetails && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-5 max-w-md animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-900/50 flex items-center justify-center text-rose-400 shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">{errorDetails.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{errorDetails.message}</p>
              {errorDetails.recommendation && (
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-300 text-left mt-2 leading-relaxed">
                  <strong className="text-amber-400">Petunjuk Solusi:</strong> {errorDetails.recommendation}
                </div>
              )}
            </div>
            <div className="flex flex-col w-full max-w-xs gap-2.5 pt-2">
              <button
                onClick={startCamera}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4" /> Coba Lagi
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-800"
              >
                <ImageIcon className="w-4 h-4" /> Unggah Dari File
              </button>
            </div>
          </div>
        )}

        {/* 4. State: REVIEW (Foto Ulang / Gunakan Foto) */}
        {cameraState === "REVIEW" && capturedPhoto && (
          <div className="w-full max-h-[85vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in">
            <div className="relative max-h-[72vh] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
              <img
                src={capturedPhoto.previewUrl}
                alt="Preview Bukti"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> Foto Siap Digunakan
              </div>
            </div>

            {/* Review Action Buttons */}
            <div className="flex items-center gap-3 w-full max-w-sm pt-1">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs transition-colors shadow-md"
              >
                <RotateCcw className="w-4 h-4" /> Foto Ulang
              </button>

              <button
                onClick={handleUsePhoto}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-lg shadow-emerald-700/25 active:scale-98"
              >
                <Check className="w-4 h-4" /> Gunakan Foto
              </button>
            </div>
          </div>
        )}

        {/* Shutter Capture Button (When in LIVE state) */}
        {cameraState === "LIVE" && (
          <div className="absolute bottom-6 inset-x-0 flex flex-col items-center justify-center gap-2 z-20">
            <button
              onClick={handleShutterCapture}
              disabled={!isVideoReady}
              title={isVideoReady ? "Tekan untuk Ambil Foto" : "Menunggu video siap..."}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center backdrop-blur-md transition-all ${
                isVideoReady
                  ? "border-white bg-white/20 active:scale-90 hover:bg-white/30 cursor-pointer shadow-2xl shadow-blue-500/20"
                  : "border-slate-600 bg-slate-800/40 opacity-50 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full shadow-md transition-transform ${
                  isVideoReady ? "bg-white hover:scale-105" : "bg-slate-600"
                }`}
              />
            </button>
            <span className="text-[11px] font-medium text-slate-300 drop-shadow-md">
              {isVideoReady ? "Klik untuk mengambil foto" : "Menyiapkan video..."}
            </span>
          </div>
        )}
      </div>

      {/* Hidden canvas for image rendering */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
