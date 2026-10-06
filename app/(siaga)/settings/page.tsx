"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { Bell, Monitor, Moon, Sun, Smartphone, Server, Camera, Image as ImageIcon, Trash2, X, Loader2 } from "lucide-react";
import { getNotificationPermission, requestDesktopNotificationPermission, triggerDesktopPopup } from "@/lib/desktop-notification";

export default function SettingsPage() {
  const { theme, handleToggleTheme } = useSiaga();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  
  // Profile state
  const [identity, setIdentity] = useState<any>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPermission(getNotificationPermission());
    }
    fetchIdentity();
  }, []);

  const fetchIdentity = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setIdentity(data.user || data);
      }
    } catch (e) {
      console.error("Failed to fetch identity", e);
    }
  };

  const handleRequestDesktopPermission = async () => {
    const res = await requestDesktopNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      triggerDesktopPopup({
        id: "perm-settings-granted",
        title: "Izin Notifikasi Aktif",
        body: "Anda akan menerima peringatan darurat melalui pop-up desktop.",
        disasterType: "earthquake"
      });
    }
  };

  const isDark = theme === "dark";

  // -- Photo Handlers --
  const handleOpenPhotoModal = () => {
    setIsPhotoModalOpen(true);
  };

  const handleClosePhotoModal = () => {
    stopCamera();
    setIsPhotoModalOpen(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      alert("Gagal mengakses kamera. Pastikan Anda telah memberikan izin.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    // Target 512x512
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw and crop from center
    const video = videoRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 512, 512);
    
    canvas.toBlob((blob) => {
      if (blob) {
        uploadFile(blob, "camera.jpg");
        stopCamera();
      }
    }, "image/jpeg", 0.85);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File terlalu besar (Maks 5MB)");
      return;
    }

    // Client-side resize
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      ctx.drawImage(img, startX, startY, size, size, 0, 0, 512, 512);
      
      canvas.toBlob((blob) => {
        if (blob) {
          uploadFile(blob, file.name);
        }
      }, "image/jpeg", 0.85);
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const uploadFile = async (blob: Blob, filename: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, filename);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal upload foto");
      
      const data = await res.json();
      setIdentity({ ...identity, avatarUrl: data.avatarUrl });
      setIsPhotoModalOpen(false);
      
      // We also need to reload the page or update global context to reflect the header avatar.
      // For now, reload window so identity in app shell gets refreshed.
      window.location.reload();
      
    } catch (err) {
      alert("Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm("Hapus foto profil?")) return;
    setIsUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus foto");
      window.location.reload();
    } catch (e) {
      alert("Gagal menghapus foto.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-4 lg:p-8 space-y-8 pb-20 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
      <div>
        <h1 className={`text-2xl font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
          Pengaturan
        </h1>
        <p className="text-sm text-slate-500">
          Kelola preferensi aplikasi dan profil SPARTA Siaga.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* PROFIL PENGGUNA */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Profil Pengguna
            </h2>
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group shrink-0">
              {identity?.avatarUrl ? (
                <img src={identity.avatarUrl} alt="Avatar" className={`w-24 h-24 rounded-full object-cover shadow-sm border-4 ${isDark ? "border-slate-800" : "border-white"}`} />
              ) : (
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm border-4 ${isDark ? "border-slate-800 bg-[#1D5AA6]" : "border-white bg-[#1D5AA6]"}`}>
                  {identity?.name ? identity.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{identity?.name || "Memuat..."}</h3>
              <div className="text-sm font-mono text-slate-500 dark:text-slate-400">{identity?.nik || "-"}</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 inline-flex items-center mt-1">
                {identity?.systemRole === "ADMIN" ? (
                  "System Administrator"
                ) : (
                  <>
                    {identity?.businessRole} 
                    <span className="mx-2">•</span> 
                    {identity?.scope === "HO" ? "Head Office" : (identity?.branch || "Cabang")}
                  </>
                )}
              </div>
              
              <div className="pt-3">
                <button 
                  onClick={handleOpenPhotoModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Ubah Foto
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* TAMPILAN / APLIKASI */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Tampilan / Aplikasi
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <div className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Tema Gelap (Dark Mode)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Ubah antarmuka aplikasi menjadi mode gelap</div>
                </div>
              </div>
              <button
                onClick={handleToggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDark ? "bg-[#1D5AA6]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDark ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* NOTIFIKASI */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Notifikasi
            </h2>
          </div>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Notifikasi Desktop (Pop-up)</div>
                  <div className="text-xs text-slate-500 mt-0.5">Tampilkan peringatan darurat walau aplikasi terminimalisir</div>
                </div>
              </div>
              {permission === "granted" ? (
                <span className="text-xs font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">Aktif</span>
              ) : (
                <button
                  onClick={handleRequestDesktopPermission}
                  className="px-4 py-2 bg-[#1D5AA6] hover:bg-[#123B6D] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Izinkan
                </button>
              )}
            </div>
          </div>
        </section>

        {/* INFORMASI SISTEM */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Informasi Sistem
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500">Versi Aplikasi</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">SPARTA Siaga v2.1.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500">Geospatial Engine</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Leaflet.js + Esri</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-500">Authentication</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Local Auth Ready</span>
            </div>
          </div>
        </section>
      </div>

      {/* Photo Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">Ubah Foto Profil</h2>
              <button onClick={handleClosePhotoModal} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              
              {isCameraActive ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95">
                  <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden border-4 border-slate-800 flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="absolute min-w-full min-h-full object-cover" />
                    {/* Viewfinder overlay */}
                    <div className="absolute inset-0 border-[40px] border-black/40 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.4)] pointer-events-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={stopCamera} className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors">Batal</button>
                    <button onClick={capturePhoto} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Camera className="w-4 h-4" /> Ambil Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={startCamera} disabled={isUploading} className="flex flex-col items-center justify-center gap-3 p-6 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group disabled:opacity-50">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Kamera</span>
                  </button>

                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex flex-col items-center justify-center gap-3 p-6 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group disabled:opacity-50">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Galeri</span>
                  </button>
                </div>
              )}

              {isUploading && (
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sedang memproses...
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              
              {!isCameraActive && identity?.avatarUrl && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button onClick={handleDeletePhoto} disabled={isUploading} className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> Hapus Foto Saat Ini
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
