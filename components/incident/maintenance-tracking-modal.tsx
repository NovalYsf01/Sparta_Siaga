"use client";

import React, { useState } from "react";
import {
  X,
  Wrench,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { IncidentRecord, RoleType } from "@/types/incident";

interface MaintenanceTrackingModalProps {
  incident: IncidentRecord | null;
  activeRole: RoleType;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProgress: (
    incidentId: string,
    newProgress: number,
    notes?: string,
    technician?: string
  ) => void;
  isReadOnly?: boolean;
}

export function MaintenanceTrackingModal({
  incident,
  activeRole,
  isOpen,
  onClose,
  onUpdateProgress,
  isReadOnly = false,
}: MaintenanceTrackingModalProps) {
  const [selectedProgress, setSelectedProgress] = useState<number>(
    incident?.progress ?? 30
  );
  const [technicianName, setTechnicianName] = useState(
    incident?.maintenanceTicket?.assignedTechnician ?? "Tim Teknisi Sparta Regional"
  );
  const [workNotes, setWorkNotes] = useState("");

  if (!isOpen || !incident) return null;

  const canEditMaintenance =
    activeRole === "ho_admin" || activeRole === "sparta_maintenance";

  const handleApplyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProgress(incident.id, selectedProgress, workNotes, technicianName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Tracking Tiket Sparta Maintenance
                </h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {incident.maintenanceTicket?.ticketId || `#SPM-${incident.id.replace("INC-", "")}`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {incident.storeName} ({incident.locationCity}) • {incident.disasterType.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-500" />
                <span>Status Operasional Gerai:</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  incident.verification?.operationalStatus === "Tutup Sementara"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {incident.verification?.operationalStatus || "Buka Normal"}
              </span>
            </div>

            {incident.verification?.notes && (
              <p className="text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-100">
                "{incident.verification.notes}"
              </p>
            )}

            {/* Damage Tags */}
            {incident.verification?.categories && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-slate-500">Kerusakan:</span>
                {incident.verification.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Current Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
              <span>Progress Penanganan Fisik</span>
              <span className="text-blue-600 font-extrabold">{incident.progress}% Selesai</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  incident.progress >= 100 ? "bg-emerald-500" : "bg-blue-600"
                }`}
                style={{ width: `${incident.progress}%` }}
              />
            </div>
          </div>

          {/* Progression Stepper */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-800 text-[11px]">Laporan</span>
              <span className="text-[10px] text-slate-400">Masuk</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-800 text-[11px]">Verifikasi</span>
              <span className="text-[10px] text-slate-400">Selesai</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  incident.progress >= 60
                    ? "bg-emerald-500 text-white"
                    : incident.progress >= 30
                    ? "border-2 border-blue-600 text-blue-600 bg-blue-50"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {incident.progress >= 60 ? <CheckCircle2 className="w-4 h-4" /> : "3"}
              </div>
              <span className="font-semibold text-slate-800 text-[11px]">Perbaikan</span>
              <span className="text-[10px] text-slate-400">Fisik</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  incident.progress >= 100
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {incident.progress >= 100 ? <CheckCircle2 className="w-4 h-4" /> : "4"}
              </div>
              <span className="font-semibold text-slate-800 text-[11px]">Selesai</span>
              <span className="text-[10px] text-slate-400">Arsip History</span>
            </div>
          </div>

          {/* Form Update Progress (For Maintenance & Admin HO) */}
          {canEditMaintenance && incident.status !== "resolved" && !isReadOnly && (
            <form onSubmit={handleApplyUpdate} className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  <span>Update Status oleh Tim Sparta Maintenance</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">
                  Aksi Aktif
                </span>
              </div>

              {/* Progress Level Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ubah Tahap Pengerjaan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProgress(30)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      selectedProgress === 30
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    30% - Teknisi Meluncur
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProgress(60)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      selectedProgress === 60
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    60% - Sedang Dikerjakan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProgress(100)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      selectedProgress === 100
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    100% - Selesai & Arsip
                  </button>
                </div>
              </div>

              {/* Technician Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Teknisi Penanggung Jawab:
                </label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  placeholder="Contoh: Budi Santoso (Teknisi Wilayah)"
                />
              </div>

              {/* Work Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tindakan Teknis:
                </label>
                <textarea
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800"
                  placeholder="Contoh: Pengelasan rangka rak selesai, penggantian kaca etalase tuntas..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <span>Simpan Perubahan Progress</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Timeline History Log */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2">Riwayat Tindakan:</h4>
            <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-3">
              {incident.timeline.map((event, idx) => (
                <div key={idx} className="relative text-xs">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                  <div className="font-semibold text-slate-800">{event.label}</div>
                  <div className="text-[11px] text-slate-400">
                    {event.timestamp} • {event.actor}
                  </div>
                  {event.notes && (
                    <div className="text-[11px] text-slate-600 mt-0.5">{event.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
