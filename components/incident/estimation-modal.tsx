"use client";

import React, { useState, useEffect } from "react";
import { X, Calculator, Building, FileText, CheckCircle2, User } from "lucide-react";
import { IncidentRecord } from "@/types/incident";
import { UserIdentity } from "@/lib/identity";

interface EstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentRecord | null;
}

export function EstimationModal({ isOpen, onClose, incident }: EstimationModalProps) {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [tkpType, setTkpType] = useState<"toko" | "dc">("toko");
  const [estimationType, setEstimationType] = useState<string>("SPARTA_M");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/auth/me").then(res => res.json()).then(data => {
        if (!data.error) setIdentity(data);
      });
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !incident) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`/api/incidents/${incident.id}/estimations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterNik: identity?.nik,
          reporterName: identity?.name,
          tkpType,
          estimationType,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        alert("Gagal submit estimasi");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-[#123B6D] text-white">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-white" />
            <h3 className="font-bold">Buat Estimasi (MTC/BLD)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Estimasi Terkirim!</h2>
            <p className="text-sm text-slate-500">Estimasi telah masuk ke workflow approval.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4" /> Data Pelapor (Auto-filled)
              </p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">NIK:</span>
                <span className="font-bold text-slate-900">{identity?.nik || "Loading..."}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Nama:</span>
                <span className="font-bold text-slate-900">{identity?.name || "Loading..."}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">No. Laporan Referensi</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 font-mono">
                {incident.id}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Jenis TKP</label>
              <select
                value={tkpType}
                onChange={(e) => setTkpType(e.target.value as "toko" | "dc")}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1D5AA6]"
              >
                <option value="toko">Toko / Gerai</option>
                <option value="dc">Gudang / DC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Tipe Estimasi</label>
              <select
                value={estimationType}
                onChange={(e) => setEstimationType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1D5AA6]"
              >
                <optgroup label="Maintenance (MTC)">
                  <option value="SPARTA_M">SPARTA M (Standar)</option>
                  <option value="MANTRA">BnM x MANTRA (Khusus)</option>
                </optgroup>
                <optgroup label="Building (BLD)">
                  <option value="SPARTA_B">SPARTA B (Struktur)</option>
                </optgroup>
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#1D5AA6] text-white font-bold text-sm rounded-lg hover:bg-[#123B6D] disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Submit Estimasi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
