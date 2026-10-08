"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Camera as CameraIcon, RefreshCw, AlertTriangle, Image as ImageIcon, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  storeName: string;
  reporterName?: string;
}

type PermissionState = 'IDLE' | 'REQUESTING' | 'GRANTED' | 'ERROR';

export function CameraCapture({ isOpen, onClose, onCapture, storeName, reporterName = "Unknown" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('IDLE');
  const [errorDetails, setErrorDetails] = useState<{ title: string, message: string } | null>(null);
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermissionState('IDLE');
      setErrorDetails(null);
      getLocation();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

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
        title: "Akses Kamera Ditolak (NotAllowedError)",
        message: "Izin kamera belum aktif. Periksa: (1) Izin kamera pada situs ini di browser (klik ikon gembok/setelan pada bar alamat URL), (2) Privasi Windows (Settings > Privacy & Security > Camera > nyalakan 'Let desktop apps access your camera'), dan (3) Pastikan tidak ada ekstensi pemblokir."
      };
    }
    if (name.includes("NotFoundError") || name.includes("DevicesNotFoundError")) {
      return {
        title: "Kamera Tidak Ditemukan (NotFoundError)",
        message: "Perangkat keras kamera tidak terdeteksi. Pastikan webcam terpasang, terhubung, dan driver aktif."
      };
    }
    if (name.includes("NotReadableError") || name.includes("TrackStartError")) {
      return {
        title: "Kamera Sedang Digunakan (NotReadableError)",
        message: "Kamera sedang digunakan oleh aplikasi lain (Zoom, Teams, Skype, atau Privacy Mode Lenovo Vantage), atau switch penutup fisik kamera sedang tertutup."
      };
    }
    if (name.includes("OverconstrainedError")) {
      return {
        title: "Kendala Konfigurasi (OverconstrainedError)",
        message: "Resolusi atau mode kamera yang diminta tidak dapat dipenuhi oleh sensor webcam ini."
      };
    }
    if (name.includes("SecurityError")) {
      return {
        title: "Pembatasan Keamanan (SecurityError)",
        message: "Browser membatasi akses kamera karena kebijakan keamanan (Permissions Policy atau konteks halaman tidak aman)."
      };
    }
    return {
      title: "Gagal Mengakses Kamera",
      message: msg || "Terjadi kesalahan sistem saat mencoba mengakses kamera."
    };
  };

  const startCamera = async () => {
    setErrorDetails(null);
    setPermissionState('REQUESTING');
    try {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error("Aplikasi dibuka melalui protokol tidak aman (Insecure Context). Akses kamera hanya didukung via HTTPS atau localhost.");
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Perangkat atau browser ini tidak mendukung API kamera (navigator.mediaDevices).");
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
      } catch (primaryErr: any) {
        if (primaryErr.name === 'OverconstrainedError' || primaryErr.name === 'NotFoundError') {
          // Fallback to any available video track on desktop/laptops with single user camera
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } else {
          throw primaryErr;
        }
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setPermissionState('GRANTED');
    } catch (err: any) {
      setErrorDetails(getErrorFeedback(err));
      setPermissionState('ERROR');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const getLocation = () => {
    setLocError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => setLocError("Lokasi tidak dapat diperoleh")
      );
    } else {
      setLocError("Geolokasi tidak didukung browser");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPermissionState('REQUESTING'); // Reuse requesting state for loading

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      drawWatermark(ctx, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const watermarkedFile = new File([blob], `sparta_upload_${Date.now()}.jpg`, { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(blob);
          onCapture(watermarkedFile, previewUrl);
          stopCamera();
          onClose();
        }
      }, "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to video feed dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Draw Watermark
    drawWatermark(ctx, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sparta_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        const previewUrl = URL.createObjectURL(blob);
        onCapture(file, previewUrl);
        stopCamera();
        onClose();
      }
    }, "image/jpeg", 0.85);
  };

  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Semi-transparent dark overlay at bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, height - 140, width, 140);
    
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.fillText("SPARTA SIAGA", 20, height - 110);
    
    ctx.font = "18px Arial";
    ctx.fillText(storeName || "Unknown Location", 20, height - 85);
    
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("id-ID") + " WIB";
    
    ctx.font = "16px Arial";
    ctx.fillText(`${dateStr} | ${timeStr}`, 20, height - 55);
    
    const locText = location ? `Lat: ${location.lat.toFixed(5)}, Long: ${location.lng.toFixed(5)}` : (locError ? locError : "Menunggu lokasi...");
    ctx.fillText(locText, 20, height - 30);
    
    ctx.textAlign = "right";
    ctx.fillText(`Pelapor: ${reporterName}`, width - 20, height - 30);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[7000] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in">
      <div className="absolute top-4 right-4 z-10 flex gap-3">
        {permissionState === 'GRANTED' && (
          <button onClick={() => { startCamera(); getLocation(); }} className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-white transition-colors border border-slate-700/50">
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => { stopCamera(); onClose(); }} className="p-2.5 bg-slate-800/80 hover:bg-red-500 rounded-xl text-white transition-colors border border-slate-700/50">
          <X className="w-5 h-5" />
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      <div className="relative w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center">
        {permissionState === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-500 shadow-inner">
              <CameraIcon className="w-10 h-10" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold text-white">Gunakan Kamera</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                SPARTA SIAGA memerlukan akses kamera untuk mengambil foto bukti kejadian atau pekerjaan.
              </p>
            </div>
            <div className="flex flex-col w-full max-w-xs gap-3 pt-6">
              <button onClick={startCamera} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                <CameraIcon className="w-4 h-4" /> Aktifkan Kamera
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-800">
                <ImageIcon className="w-4 h-4" /> Unggah Foto
              </button>
            </div>
          </div>
        )}

        {permissionState === 'REQUESTING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-slate-400">Menyiapkan kamera...</p>
          </div>
        )}

        {permissionState === 'ERROR' && errorDetails && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-rose-950/30 border border-rose-900/50 flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold text-white">{errorDetails.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {errorDetails.message}
              </p>
            </div>
            <div className="flex flex-col w-full max-w-xs gap-3 pt-6">
              <button onClick={startCamera} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <RefreshCw className="w-4 h-4" /> Coba Lagi
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-800">
                <ImageIcon className="w-4 h-4" /> Unggah Foto
              </button>
            </div>
          </div>
        )}

        {permissionState === 'GRANTED' && (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-auto max-h-[85vh] object-contain bg-black rounded-lg"
            />
            
            {/* Virtual Viewfinder UI (Not saved, just for user info) */}
            <div className="absolute bottom-[20%] left-6 right-6 text-white pointer-events-none drop-shadow-md">
              <p className="font-black text-xl tracking-tight">SPARTA SIAGA</p>
              <p className="text-sm font-semibold opacity-90">{storeName}</p>
              <p className="text-xs mt-1.5 opacity-80 font-mono">
                {location ? `Lat: ${location.lat.toFixed(5)}, Long: ${location.lng.toFixed(5)}` : (locError ? locError : "Mengambil lokasi...")}
              </p>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pb-4">
              <button 
                onClick={handleCapture}
                className="w-16 h-16 rounded-full border-[3px] border-white/80 bg-white/20 flex items-center justify-center backdrop-blur-md active:scale-95 transition-all hover:bg-white/30"
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-sm" />
              </button>
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
