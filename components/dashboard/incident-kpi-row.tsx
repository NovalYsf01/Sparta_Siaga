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
      label: "Total Kejadian",
      count: stats.total || 24,
      trend: "↑ 20% dari periode sebelumnya",
      icon: null,
      isTotal: true,
      color: "text-slate-900",
      bgBadge: "bg-emerald-50 text-emerald-700",
    },
    {
      id: "earthquake",
      label: "Gempa Bumi",
      count: stats.earthquake || 2,
      icon: Activity,
      color: "text-amber-600",
      accent: "bg-amber-50 text-amber-600",
    },
    {
      id: "flood",
      label: "Banjir",
      count: stats.flood || 6,
      icon: Waves,
      color: "text-blue-600",
      accent: "bg-blue-50 text-blue-600",
    },
    {
      id: "other",
      label: "Lainnya",
      count: stats.other || 1,
      icon: MoreHorizontal,
      color: "text-slate-600",
      accent: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedCategory === card.id || (!selectedCategory && card.id === "all");

        return (
          <div
            key={card.id}
            onClick={() => onSelectCategory?.(card.id === "all" ? null : card.id)}
            className={`cursor-pointer rounded-xl bg-white dark:bg-slate-900 p-3.5 border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
              isSelected
                ? "border-blue-500 ring-2 ring-blue-500/20"
                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <span className="truncate">{card.label}</span>
              {Icon && (
                <div className={`p-1.5 rounded-lg ${card.accent} dark:bg-slate-800 shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              )}
            </div>

            <div>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.count}
              </div>

              {card.isTotal && card.trend && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  <TrendingUp className="w-3 h-3 shrink-0" />
                  <span className="truncate">{card.trend}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
