"use client";

import React from "react";
import {
  Wrench,
  Clock,
  User,
  Info,
  CheckCircle2,
  FileText,
  BadgeDollarSign,
  Calendar,
  Layers,
} from "lucide-react";
import { EstimationRouteRecord } from "@/lib/estimation-service";

interface EstimationStatusCardProps {
  route: EstimationRouteRecord | null;
  loading?: boolean;
}

export function EstimationStatusCard({ route, loading }: EstimationStatusCardProps) {
  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 animate-pulse text-xs text-slate-400">
        Memuat data estimasi...
      </div>
    );
  }

  if (!route) return null;

  const isBms = route.handlerType === "BMS";
  const isRekanan = route.handlerType === "REKANAN";

  // Check if actual completed estimation results are present
  const hasResults = Boolean(
    route.estimationNumber ||
      route.estimatedValue !== null ||
      route.status === "ESTIMATION_COMPLETED" ||
      route.status === "READY_FOR_WORK"
  );

  const getEstimationStatusBadge = () => {
    switch (route.status) {
      case "WAITING_ESTIMATION":
        return {
          label: "Menunggu Hasil Estimasi",
          color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          icon: Clock,
          summary: "Tiket telah dirutekan dan menunggu input hasil estimasi resmi.",
        };
      case "ESTIMATION_IN_PROCESS":
        return {
          label: "Estimasi Sedang Diproses",
          color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
          icon: Clock,
          summary: "Proses survei teknis dan estimasi biaya sedang berlangsung.",
        };
      case "ESTIMATION_COMPLETED":
        return {
          label: "Estimasi Selesai",
          color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          icon: CheckCircle2,
          summary: "Estimasi selesai tercatat. Kesiapan kerja bergantung pada pemicu resmi.",
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
          icon: Info,
          summary: "Proses estimasi dibatalkan.",
        };
      default:
        return {
          label: route.status === "NOT_CONFIGURED" ? "Menunggu Hasil Estimasi" : route.status,
          color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
          icon: Clock,
          summary: route.notes || "",
        };
    }
  };

  const getWorkStatusBadge = () => {
    switch (route.workStatus) {
      case "READY_FOR_WORK":
        return {
          label: "Siap Dikerjakan",
          color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      case "IN_PROGRESS":
        return {
          label: "Dalam Pengerjaan",
          color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "COMPLETED":
        return {
          label: "Pekerjaan Selesai",
          color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      case "NOT_READY":
      default:
        return {
          label: "Belum Siap Dikerjakan",
          color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
    }
  };

  const statusInfo = getEstimationStatusBadge();
  const workStatusInfo = getWorkStatusBadge();
  const StatusIcon = statusInfo.icon;

  const formattedSubmittedDate = new Date(route.createdAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  const formattedCompletedDate = route.completedAt
    ? new Date(route.completedAt).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      })
    : null;

  const dataSourceLabel =
    route.dataSource === "SPARTA_MAINTENANCE"
      ? "SPARTA Maintenance"
      : route.dataSource === "BNM_MANTRA"
      ? "BnM × MANTRA"
      : "MANUAL (Input Internal)";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      {/* Header Section ESTIMASI (Section F) */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1D5AA6] dark:text-blue-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              ESTIMASI
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {isBms ? "Handler: BMS" : isRekanan ? "Handler: Rekanan" : `Handler: ${route.handlerType}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusInfo.color}`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Grid Informasi Detail Estimasi (Section F, G & D) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* 1. Handler */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Handler
          </span>
          <span className="font-extrabold text-slate-900 dark:text-white">
            {isBms ? "BMS" : isRekanan ? "Rekanan" : route.handlerType}
          </span>
        </div>

        {/* 2. Status Estimasi */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Status Estimasi
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            {statusInfo.label}
          </span>
        </div>

        {/* 3. Status Pekerjaan (Decoupled dari Estimasi) */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Status Pekerjaan
          </span>
          <span className={`font-bold inline-block px-2 py-0.5 rounded text-[11px] border ${workStatusInfo.color}`}>
            {workStatusInfo.label}
          </span>
        </div>

        {/* 4. Sumber Data */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Sumber Data
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
            {dataSourceLabel}
          </span>
        </div>

        {/* 5. Nomor Estimasi */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Nomor Estimasi
          </span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {route.estimationNumber || "-"}
          </span>
        </div>

        {/* 6. Nilai Estimasi */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Nilai Estimasi
          </span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
            {route.estimatedValue !== null && route.estimatedValue !== undefined
              ? `Rp ${route.estimatedValue.toLocaleString("id-ID")}`
              : "-"}
          </span>
        </div>

        {/* 7. Tanggal Estimasi */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Tanggal Estimasi
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {formattedCompletedDate || formattedSubmittedDate}
          </span>
        </div>

        {/* 8. Diajukan Oleh */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Diajukan oleh
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {route.createdByName}
          </span>
        </div>
      </div>

      {/* Ringkasan / Keterangan Estimasi */}
      {route.estimationSummary ? (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Keterangan / Ringkasan Estimasi
          </span>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {route.estimationSummary}
          </p>
        </div>
      ) : (
        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Keterangan
          </span>
          {route.notes || "Belum ada catatan rincian estimasi."}
        </div>
      )}

      {/* Catatan / Keterangan Alur Internal */}
      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs flex items-start gap-2.5 text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-[11px]">{statusInfo.summary}</p>
          <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
            Target Sistem: <strong>{route.targetSystem === "SPARTA_MAINTENANCE" ? "SPARTA Maintenance" : "BnM × MANTRA"}</strong> (Sumber Data: {route.dataSource}).
          </p>
        </div>
      </div>
    </div>
  );
}
