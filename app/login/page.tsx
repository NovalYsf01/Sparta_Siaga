"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = "/";
      } else {
        setError(data.error || "Gagal masuk");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header Branding */}
        <div className="bg-[#123B6D] p-8 text-center flex flex-col items-center">
          <div className="flex gap-4 items-center mb-6">
            <div className="w-16 h-16 relative bg-white/10 rounded-xl p-2">
              <Image src="/brand/building_logo.png" alt="SPARTA Logo" fill className="object-contain" />
            </div>
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-widest mb-1">SPARTA SIAGA</h1>
          <p className="text-blue-200 text-xs font-medium tracking-wider uppercase">
            Sistem Integrasi Analisis & Peringatan Bencana
          </p>
          
          <div className="mt-8 pt-6 border-t border-white/20 w-full flex justify-center">
            <Image src="/brand/alfamart_logo.png" alt="Alfamart" width={100} height={30} className="opacity-90" />
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 text-center">Masuk ke Sistem</h2>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                NIK / Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D5AA6] focus:bg-white transition-all text-slate-800"
                placeholder="Masukkan NIK"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D5AA6] focus:bg-white transition-all text-slate-800"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#D9272E] hover:bg-[#b91e24] text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk"}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400">
            Pastikan Anda menggunakan kredensial internal yang valid.
            <br />
            Untuk bantuan, hubungi IT Helpdesk.
          </div>
        </div>
      </div>
    </div>
  );
}
