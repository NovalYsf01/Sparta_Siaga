"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, LogIn, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");
  const spartaLoginUrl = process.env.NEXT_PUBLIC_SPARTA_LOGIN_URL || "http://localhost:5173";

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white">SPARTA SIAGA</h1>
          <p className="text-xs text-slate-400">Disaster & Branch Monitoring</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Autentikasi Diperlukan</p>
            <p className="text-[11px] text-red-400 mt-0.5">
              {error === "sso_token_missing"
                ? "Token akses SSO tidak ditemukan. Silakan login melalui portal utama."
                : error === "sso_exchange_failed"
                ? "Sesi atau token SSO telah kedaluwarsa. Silakan login kembali."
                : "Akses modul ini memerlukan autentikasi SPARTA SSO."}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        Modul <strong>SPARTA Siaga</strong> terintegrasi penuh dengan Single Sign-On (SSO) Portal SPARTA Alfamart. Silakan login melalui Portal Utama untuk mengakses peta monitoring.
      </p>

      <div className="space-y-3 pt-2">
        <a
          href={spartaLoginUrl}
          className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:scale-[1.01]"
        >
          <LogIn className="w-4 h-4" />
          <span>Login Melalui Portal SPARTA</span>
        </a>

        <a
          href="/"
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard Utama</span>
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            <span>Memuat halaman login...</span>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
