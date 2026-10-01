"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Camera as CameraIcon, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  storeName: string;
  reporterName?: string;
}

export function CameraCapture({ isOpen, onClose, onCapture, storeName, reporterName = "Unknown" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      getLocation();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setError(err.message || "Gagal mengakses kamera");
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
        (err) => setLocError("Lokasi tidak tersedia")
      );
    } else {
      setLocError("Geolokasi tidak didukung browser");
    }
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
    
    const locText = location ? `Lat: ${location.lat.toFixed(5)}, Long: ${location.lng.toFixed(5)}` : (locError ? "Lokasi tidak tersedia" : "Menunggu lokasi...");
    ctx.fillText(locText, 20, height - 30);
    
    ctx.textAlign = "right";
    ctx.fillText(`Pelapor: ${reporterName}`, width - 20, height - 30);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[7000] bg-black flex flex-col items-center justify-center animate-in fade-in">
      <div className="absolute top-4 right-4 z-10 flex gap-4">
        <button onClick={() => { startCamera(); getLocation(); }} className="p-3 bg-slate-800/80 rounded-full text-white">
          <RefreshCw className="w-6 h-6" />
        </button>
        <button onClick={() => { stopCamera(); onClose(); }} className="p-3 bg-red-500 rounded-full text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {error ? (
        <div className="text-white text-center p-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-bold">Kamera Gagal</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : (
        <div className="relative w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-auto max-h-[80vh] object-contain bg-black"
          />
          
          {/* Virtual Viewfinder UI (Not saved, just for user info) */}
          <div className="absolute bottom-[20%] left-4 right-4 text-white text-shadow-sm pointer-events-none">
            <p className="font-bold text-lg">SPARTA SIAGA</p>
            <p className="text-sm">{storeName}</p>
            <p className="text-xs mt-1 text-slate-300">
              {location ? `Lat: ${location.lat.toFixed(5)}, Long: ${location.lng.toFixed(5)}` : (locError ? "Lokasi tidak tersedia" : "Mengambil lokasi...")}
            </p>
          </div>

          <div className="absolute bottom-6 left-0 right-0 flex justify-center pb-4">
            <button 
              onClick={handleCapture}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/30 flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-white rounded-full" />
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// SVG AlertTriangle component needed above
import { AlertTriangle } from "lucide-react";
