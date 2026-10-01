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
  Calculator,
} from "lucide-react";
import { IncidentRecord, RoleType } from "@/types/incident";
import { DistributionStatusViewer } from "./distribution-status-viewer";
import { EstimationModal } from "./estimation-modal";
import { FieldPhotoUploader, PhotoData } from "./field-photo-uploader";

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
  const [isEstimationOpen, setIsEstimationOpen] = useState(false);
  
  const [spkPhoto, setSpkPhoto] = useState<PhotoData>({ file: null, previewUrl: null, source: null, reporterRelation: null, capturedAt: null });
  const [progressPhoto, setProgressPhoto] = useState<PhotoData>({ file: null, previewUrl: null, source: null, reporterRelation: null, capturedAt: null });
  const [handoverPhoto, setHandoverPhoto] = useState<PhotoData>({ file: null, previewUrl: null, source: null, reporterRelation: null, capturedAt: null });

  if (!isOpen || !incident) return null;

  const canEditMaintenance =
    activeRole === "ho_admin" || activeRole === "sparta_maintenance";

  const handleApplyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProgress === 100) {
      if (!spkPhoto.file || !progressPhoto.file || !handoverPhoto.file) {
        alert("Untuk menutup laporan (100%), Anda wajib melampirkan Foto SPK, Foto Progres 100%, dan Foto Serah Terima.");
        return;
      }
    }
    onUpdateProgress(incident.id, selectedProgress, workNotes, technicianName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header (Sticky) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Detail Tracking Laporan
                </h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {incident.id}
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

        {/* Content Body (Scrollable) */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Current Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
              <span>Progress Laporan</span>
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

          {/* Actual Timeline Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Perjalanan Laporan</h4>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {incident.timeline.map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-4 md:justify-center">
                  <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-sm z-10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="ml-8 md:ml-0 md:w-1/2 md:pr-10 md:text-right w-full">
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-left">
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">
                        {item.stage}
                      </span>
                      <h5 className="text-xs font-bold text-slate-800 leading-tight">
                        {item.label}
                      </h5>
                      <span className="block text-[9px] text-slate-500 mt-1">
                        {item.timestamp} • {item.actor}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Future Step Indicator based on completion */}
              {incident.progress < 100 && (
                <div className="relative flex items-start gap-4 md:justify-center opacity-50">
                   <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center z-10">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  </div>
                  <div className="ml-8 md:ml-0 md:w-1/2 md:pr-10 md:text-right w-full">
                    <div className="bg-transparent p-3 rounded-lg border border-dashed border-slate-300 text-left">
                      <h5 className="text-xs font-bold text-slate-500">
                        {incident.status === 'in_estimation' ? 'Pengerjaan Fisik' : incident.status === 'in_maintenance' ? 'Penyelesaian' : 'Tahap Selanjutnya'}
                      </h5>
                      <span className="block text-[9px] text-slate-400 mt-1">Belum dilakukan</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DistributionStatusViewer reportId={incident.id} />

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

              {/* Estimation Trigger */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEstimationOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  Buat / Lihat Estimasi
                </button>
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

              {/* Required Uploads for Completion */}
              {selectedProgress === 100 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <h4 className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Dokumen Wajib Serah Terima (Close Laporan)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FieldPhotoUploader label="Foto SPK" value={spkPhoto} onChange={setSpkPhoto} />
                    <FieldPhotoUploader label="Foto Progres 100%" value={progressPhoto} onChange={setProgressPhoto} />
                    <FieldPhotoUploader label="Foto Serah Terima" value={handoverPhoto} onChange={setHandoverPhoto} />
                  </div>
                </div>
              )}

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
        <EstimationModal 
          isOpen={isEstimationOpen} 
          onClose={() => setIsEstimationOpen(false)} 
          incident={incident} 
        />
      </div>
    </div>
  );
}
