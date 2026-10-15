"use client";

import React from "react";
import {
  ClipboardList,
  Activity,
  Clock,
  ShieldAlert,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { IncidentStats } from "@/types/incident";

interface IncidentKpiRowProps {
  stats: IncidentStats;
  dangerCount?: number;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}

export function IncidentKpiRow({
  stats,
  selectedCategory,
  onSelectCategory,
}: IncidentKpiRowProps) {
  const cards = [
    {
      id: "all",
      label: "Total Laporan",
      count: stats.total || 0,
      sublabel: "Seluruh kejadian",
      icon: ClipboardList,
      color: "text-[#123B6D] dark:text-blue-300",
      accent: "bg-[#EAF2FB] text-[#1D5AA6] dark:bg-blue-950/60 dark:text-blue-300",
      activeBorder: "border-[#1D5AA6] dark:border-blue-500",
    },
    {
      id: "auto",
      label: "Laporan Gempa",
      count: stats.autoEarthquake || 0,
      sublabel: "Deteksi otomatis",
      icon: Activity,
      color: "text-[#D9272E] dark:text-red-400",
      accent: "bg-red-50 text-[#D9272E] dark:bg-red-950/60 dark:text-red-300",
      activeBorder: "border-[#D9272E] dark:border-red-500",
    },
    {
      id: "waiting_inspection",
      label: "Perlu Cek Fisik",
      count: stats.waitingInspection || 0,
      sublabel: "Pemeriksaan BMS/BES",
      icon: Clock,
      color: "text-[#F59E0B] dark:text-amber-400",
      accent: "bg-amber-50 text-[#F59E0B] dark:bg-amber-950/60 dark:text-amber-300",
      activeBorder: "border-[#F59E0B] dark:border-amber-500",
    },
    {
      id: "waiting_approval",
      label: "Persetujuan BnM Manajer",
      count: stats.waitingBmApproval || 0,
      sublabel: "Menunggu BnM Manajer",
      icon: ShieldAlert,
      color: "text-indigo-600 dark:text-indigo-400",
      accent: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
      activeBorder: "border-indigo-600 dark:border-indigo-500",
    },
    {
      id: "in_handling",
      label: "Penanganan",
      count: stats.inHandling || 0,
      sublabel: "Milestone berjalan",
      icon: Wrench,
      color: "text-[#1D5AA6] dark:text-blue-400",
      accent: "bg-[#EAF2FB] text-[#1D5AA6] dark:bg-blue-900/40 dark:text-blue-300",
      activeBorder: "border-[#1D5AA6] dark:border-blue-500",
    },
    {
      id: "closed",
      label: "Selesai / CLOSED",
      count: stats.closed || 0,
      sublabel: "Resmi disetujui BnM Manajer",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      accent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      activeBorder: "border-emerald-600 dark:border-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedCategory === card.id || (!selectedCategory && card.id === "all");

        return (
          <div
            key={card.id}
            onClick={() => onSelectCategory?.(card.id === "all" ? null : card.id)}
            className={`cursor-pointer rounded-2xl bg-white dark:bg-slate-900 p-4 border shadow-xs transition-all duration-150 hover:shadow-sm flex flex-col justify-between min-h-[110px] ${
              isSelected
                ? `${card.activeBorder} ring-2 ring-blue-500/10 bg-blue-50/20 dark:bg-blue-950/20`
                : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.accent} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {card.count}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                {card.sublabel}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
