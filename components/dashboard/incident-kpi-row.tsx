"use client";

import React from "react";
import {
  TrendingUp,
  UserX,
  Flame,
  Activity,
  Waves,
  Wind,
  MoreHorizontal,
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
  dangerCount = 0,
  selectedCategory,
  onSelectCategory,
}: IncidentKpiRowProps) {
  const cards = [
    {
      id: "all",
      label: "Semua Kejadian",
      count: stats.total || 0,
      trend: "Total laporan masuk",
      icon: Activity,
      isTotal: true,
      color: "text-[#123B6D]",
      accent: "bg-[#EAF2FB] text-[#1D5AA6]",
    },
    {
      id: "danger",
      label: "Cabang Terindikasi",
      count: dangerCount,
      icon: Activity,
      color: "text-[#D9272E]",
      accent: "bg-[#D9272E]/10 text-[#D9272E]",
    },
    {
      id: "verifying",
      label: "Toko Perlu Konfirmasi",
      count: (stats.statusBreakdown?.verifying || 0) + (stats.statusBreakdown?.unhandled || 0),
      icon: UserX,
      color: "text-[#F59E0B]",
      accent: "bg-[#F59E0B]/10 text-[#F59E0B]",
    },
    {
      id: "active",
      label: "Laporan Aktif",
      count: (stats.statusBreakdown?.investigating || 0) + (stats.statusBreakdown?.inMaintenance || 0),
      icon: TrendingUp,
      color: "text-blue-600",
      accent: "bg-blue-50 text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedCategory === card.id || (!selectedCategory && card.id === "all");

        return (
          <div
            key={card.id}
            onClick={() => onSelectCategory?.(card.id === "all" ? null : card.id)}
            className={`cursor-pointer rounded-[20px] bg-white dark:bg-slate-900 p-5 border shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
              isSelected
                ? "border-[#1D5AA6] dark:border-blue-500 bg-[#EAF2FB]/30 dark:bg-blue-900/10"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-start justify-between text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
              <span className="leading-tight">{card.label}</span>
              {Icon && (
                <div className={`p-2 rounded-xl ${card.accent} dark:bg-slate-700 shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              )}
            </div>

            <div>
              <div className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.count}
              </div>

              {card.isTotal && card.trend && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-3">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>{card.trend}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
