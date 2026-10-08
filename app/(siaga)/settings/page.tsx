"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSiaga } from "@/components/layout/siaga-context";
import { Bell, Monitor, Moon, Sun, Smartphone, Server, Camera, Image as ImageIcon, Trash2, X, Loader2, MapPin, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { getNotificationPermission, requestDesktopNotificationPermission, triggerDesktopPopup } from "@/lib/desktop-notification";
import { toast } from "sonner";

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

  // Device Permissions State
  const [cameraPermission, setCameraPermission] = useState<string>("Belum Diperiksa");
  const [locationPermission, setLocationPermission] = useState<string>("Belum Diperiksa");
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [locationResult, setLocationResult] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Dedicated Camera Diagnostic State
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [cameraResult, setCameraResult] = useState<{
    type: 'success' | 'error';
    text: string;
    errorName?: string;
    details?: string;
    recommendation?: string;
  } | null>(null);
  const [testCameraStream, setTestCameraStream] = useState<MediaStream | null>(null);
  const testVideoRef = useRef<HTMLVideoElement>(null);

  const stopTestCamera = () => {
    if (testCameraStream) {
      testCameraStream.getTracks().forEach((track) => track.stop());
      setTestCameraStream(null);
    }
  };

  useEffect(() => {
    if (testCameraStream && testVideoRef.current) {
      testVideoRef.current.srcObject = testCameraStream;
    }
  }, [testCameraStream]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPermission(getNotificationPermission());
      checkDevicePermissions();
    }
    fetchIdentity();

    return () => {
      stopTestCamera();
    };
  }, []);

  const handleTestCamera = async () => {
    setIsTestingCamera(true);
    setCameraResult(null);
    stopTestCamera();

    const isSecure = typeof window !== "undefined" ? window.isSecureContext : false;
    if (!isSecure) {
      setIsTestingCamera(false);
      setCameraPermission('Akses Diblokir');
      setCameraResult({
        type: 'error',
        text: 'Konteks tidak aman (Insecure Context HTTP). Akses kamera browser diblokir.',
        errorName: 'SecurityError',
        details: 'window.isSecureContext bernilai false.',
        recommendation: 'Akses web melalui HTTPS atau http://localhost agar browser mengizinkan API MediaDevices.'
      });
      toast.error("Konteks Browser Tidak Aman", {
        description: "Gunakan HTTPS atau localhost agar browser mengizinkan kamera."
      });
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsTestingCamera(false);
      setCameraPermission('Browser tidak mendukung');
      setCameraResult({
        type: 'error',
        text: 'Browser ini tidak mendukung navigator.mediaDevices.getUserMedia.',
        errorName: 'NotSupportedError',
        recommendation: 'Gunakan browser modern (Chrome, Edge, Firefox, Safari).'
      });
      return;
    }

    try {
      // 1. Enumerate video devices
      let deviceCount = 0;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        deviceCount = devices.filter((d) => d.kind === 'videoinput').length;
      } catch {}

      // 2. Request userMedia with fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" } },
          audio: false
        });
      } catch (firstErr: any) {
        if (firstErr.name === 'OverconstrainedError' || firstErr.name === 'NotFoundError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw firstErr;
        }
      }

      setTestCameraStream(stream);
      setCameraPermission('Siap Digunakan');
      setCameraResult({
        type: 'success',
        text: `Kamera aktif dan berhasil diakses (${deviceCount > 0 ? `${deviceCount} perangkat video terdeteksi` : 'video stream aktif'}).`,
      });
      toast.success("Uji Kamera Berhasil", {
        description: "Sensor kamera terhubung dan stream video berfungsi normal."
      });
    } catch (err: any) {
      const errName = err.name || "UnknownError";
      const errMsg = err.message || "";
      let rec = "Periksa perizinan kamera pada perangkat Anda.";

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setCameraPermission('Akses Diblokir');
        rec = "Izin diblokir. Periksa: (1) Setelan izin situs pada browser (klik ikon gembok/setelan di sebelah URL), dan (2) Privasi Windows (Settings > Privacy & Security > Camera > nyalakan 'Let desktop apps access your camera').";
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setCameraPermission('Perangkat Tidak Ditemukan');
        rec = "Tidak ada hardware webcam yang terdeteksi. Pastikan webcam terpasang dan driver aktif.";
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setCameraPermission('Kamera Sibuk');
        rec = "Kamera sedang digunakan aplikasi lain (Zoom, Teams, Skype, atau Privacy Mode Lenovo Vantage), atau shutter penutup fisik kamera tertutup.";
      } else if (errName === "SecurityError") {
        setCameraPermission('Akses Diblokir');
        rec = "Kebijakan keamanan (Permissions Policy) atau frame membatasi akses kamera.";
      }

      setCameraResult({
        type: 'error',
        text: `Uji kamera gagal: ${errName}`,
        errorName: errName,
        details: errMsg,
        recommendation: rec
      });
      toast.error("Uji Kamera Gagal", { description: `${errName}: ${rec}` });
    } finally {
      setIsTestingCamera(false);
    }
  };

  const checkDevicePermissions = async () => {
    if (navigator.permissions) {
      try {
        const camStatus = await navigator.permissions.query({ name: 'camera' as any });
        setCameraPermission(camStatus.state === 'granted' ? 'Siap Digunakan' : camStatus.state === 'prompt' ? 'Perlu Izin' : 'Akses Diblokir');
        camStatus.onchange = () => {
          setCameraPermission(camStatus.state === 'granted' ? 'Siap Digunakan' : camStatus.state === 'prompt' ? 'Perlu Izin' : 'Akses Diblokir');
        };
      } catch {
        setCameraPermission('Status belum dapat dipastikan');
      }

      try {
        const locStatus = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(locStatus.state === 'granted' ? 'Siap Digunakan' : locStatus.state === 'prompt' ? 'Perlu Izin' : 'Akses Diblokir');
        locStatus.onchange = () => {
          setLocationPermission(locStatus.state === 'granted' ? 'Siap Digunakan' : locStatus.state === 'prompt' ? 'Perlu Izin' : 'Akses Diblokir');
        };
      } catch {
        setLocationPermission('Status belum dapat dipastikan');
      }
    } else {
      setCameraPermission('Browser tidak mendukung');
      setLocationPermission('Browser tidak mendukung');
    }
  };

  const handleTestLocation = () => {
    setIsTestingLocation(true);
    setLocationResult(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationResult({ type: 'success', text: `Akses lokasi berhasil (Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)})` });
          setIsTestingLocation(false);
          toast.success("Akses lokasi berhasil", { description: "Sistem berhasil mendapatkan koordinat." });
        },
        (err) => {
          setLocationResult({ type: 'error', text: "Lokasi tidak dapat diperoleh. Periksa izin perangkat." });
          setIsTestingLocation(false);
          toast.error("Lokasi tidak dapat diperoleh", { description: err.message });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationResult({ type: 'error', text: "Geolokasi tidak didukung browser" });
      setIsTestingLocation(false);
      toast.error("Geolokasi tidak didukung browser");
    }
  };

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

        {/* PERANGKAT & IZIN AKSES */}
        <section className={`rounded-2xl border overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50/50"}`}>
            <Smartphone className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Perangkat & Izin Akses
            </h2>
          </div>
          <div className="p-5 space-y-6">
            
            {/* Kamera */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Kamera</div>
                    <div className="text-xs text-slate-500 mt-0.5">Izin kamera untuk pengambilan bukti kejadian.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    cameraPermission === "Siap Digunakan" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" :
                    cameraPermission === "Akses Diblokir" ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" :
                    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  }`}>
                    {cameraPermission}
                  </span>
                  <button
                    onClick={handleTestCamera}
                    disabled={isTestingCamera}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isTestingCamera ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Uji Kamera
                  </button>
                </div>
              </div>

              {/* Camera Result Diagnostic Box */}
              {cameraResult && (
                <div className={`p-3.5 rounded-xl text-xs space-y-2 border ${
                  cameraResult.type === 'success'
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
                    : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300"
                }`}>
                  <div className="flex items-start gap-2">
                    {cameraResult.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold">{cameraResult.text}</div>
                      {cameraResult.details && (
                        <div className="text-[11px] opacity-90 font-mono">
                          Detail: {cameraResult.details}
                        </div>
                      )}
                      {cameraResult.recommendation && (
                        <div className="text-[11px] font-sans opacity-95 pt-1 border-t border-rose-200/50 dark:border-rose-900/40">
                          <strong>Solusi:</strong> {cameraResult.recommendation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Test Camera Preview */}
                  {testCameraStream && (
                    <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-36 h-28 bg-black rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-800 relative shadow-inner">
                        <video
                          ref={testVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-600/80 text-[9px] text-white font-bold rounded">
                          LIVE
                        </div>
                      </div>
                      <div className="flex-1 text-[11px] space-y-2 text-center sm:text-left">
                        <p className="text-emerald-700 dark:text-emerald-300">
                          Stream video aktif. Kamera siap digunakan untuk pelaporan insiden & foto bukti.
                        </p>
                        <button
                          onClick={stopTestCamera}
                          className="px-2.5 py-1 bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-md hover:bg-slate-800 transition-colors"
                        >
                          Hentikan Uji Kamera
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className={`border-t ${isDark ? "border-slate-800" : "border-slate-100"}`} />

            {/* Lokasi */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>Lokasi (GPS)</div>
                    <div className="text-xs text-slate-500 mt-0.5">Izin lokasi untuk memastikan keaslian laporan.</div>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      locationPermission === "Siap Digunakan" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" :
                      locationPermission === "Akses Diblokir" ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" :
                      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    }`}>
                      {locationPermission}
                    </span>
                    <button onClick={handleTestLocation} disabled={isTestingLocation} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      {isTestingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Uji Lokasi
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Location Result Box */}
              {locationResult && (
                <div className={`ml-12 p-3 mt-2 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                  locationResult.type === 'success' 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400"
                    : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400"
                }`}>
                  {locationResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{locationResult.text}</span>
                </div>
              )}
            </div>
            
            <div className={`p-3 rounded-xl flex items-start gap-3 text-xs leading-relaxed ${isDark ? "bg-blue-950/30 text-blue-300" : "bg-blue-50 text-blue-800"}`}>
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <div>
                <strong>Catatan:</strong> SPARTA SIAGA tidak dapat memaksa mengaktifkan izin dari aplikasi. Jika status &quot;Akses Diblokir&quot;, Anda harus mengaktifkannya secara manual melalui pengaturan izin situs (Site Settings) pada browser Anda.
              </div>
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
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Ambil Foto / Uji Kamera</span>
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
