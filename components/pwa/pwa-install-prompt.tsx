"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "banner" | "compact";
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone || installed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  // If neither beforeinstallprompt nor iOS guide available, hide
  if (!deferredPrompt && !isIos) {
    return null;
  }

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1D5AA6]/10 text-[#1D5AA6] dark:bg-blue-900/30 dark:text-blue-300 hover:bg-[#1D5AA6]/20 transition-colors min-h-[36px] ${className}`}
          title="Pasang Aplikasi SPARTA SIAGA di Perangkat"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Pasang App</span>
        </button>

        {showIosGuide && (
          <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center p-4 bg-slate-950/70">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Pasang di iPhone / iPad</h4>
                <button onClick={() => setShowIosGuide(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Untuk memasang SPARTA SIAGA di layar utama iOS:
              </p>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <li>Ketuk tombol <strong>Bagikan (Share)</strong> pada bilah bawah browser Safari.</li>
                <li>Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
              </ol>
              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full py-2 bg-[#1D5AA6] text-white text-xs font-bold rounded-xl"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#1D5AA6] text-white hover:bg-[#123B6D] transition-colors shadow-sm min-h-[44px] ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install SPARTA SIAGA</span>
      </button>

      {showIosGuide && (
        <div className="fixed inset-0 z-[4000] flex items-end sm:items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Pasang di iPhone / iPad</h4>
              <button onClick={() => setShowIosGuide(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Untuk memasang SPARTA SIAGA di layar utama iOS:
            </p>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <li>Ketuk tombol <strong>Bagikan (Share)</strong> pada bilah bawah browser Safari.</li>
              <li>Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</li>
              <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 bg-[#1D5AA6] text-white text-xs font-bold rounded-xl"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
