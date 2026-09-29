"use client";

import React from "react";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { IncidentStats, IncidentRecord } from "@/types/incident";

interface IncidentActionListProps {
  stats: IncidentStats;
  incidents: IncidentRecord[];
}

export function IncidentActionList({ stats, incidents }: IncidentActionListProps) {
  const total = stats.total || 1;
  const statusSegments = [
    { label: "Selesai", percent: Math.round((stats.statusBreakdown.resolved / total) * 100) || 0, color: "#10b981" },
    { label: "Dalam Penanganan", percent: Math.round((stats.statusBreakdown.inMaintenance / total) * 100) || 0, color: "#facc15" },
    { label: "Investigasi", percent: Math.round((stats.statusBreakdown.investigating / total) * 100) || 0, color: "#3b82f6" },
    { label: "Verifikasi", percent: Math.round((stats.statusBreakdown.verifying / total) * 100) || 0, color: "#a855f7" },
    { label: "Belum Ditangani", percent: Math.round((stats.statusBreakdown.unhandled / total) * 100) || 0, color: "#ef4444" },
  ];

  const upcomingActions = incidents
    .filter(i => i.status === "in_maintenance" || i.status === "investigating")
    .slice(0, 3)
    .map(inc => {
      // Parse date "12 Sep 2026"
      const dateParts = inc.date.split(" ");
      const day = dateParts[0] || "??";
      const month = dateParts[1] || "??";

      let categoryColor = "bg-slate-50 text-slate-700 border-slate-200";
      let category: string = inc.disasterType;
      if (inc.disasterType === "flood") {
        category = "Banjir";
        categoryColor = "bg-blue-50 text-blue-700 border-blue-200";
      } else if (inc.disasterType === "earthquake") {
        category = "Gempa Bumi";
        categoryColor = "bg-amber-50 text-amber-800 border-amber-200";
      } else if (inc.disasterType === "fire") {
        category = "Kebakaran";
        categoryColor = "bg-red-50 text-red-700 border-red-200";
      }

      return {
        id: inc.id,
        day,
        month,
        title: `Follow up ${inc.status === "in_maintenance" ? "perbaikan" : "investigasi"} ${inc.storeName}`,
        category,
        categoryColor,
      };
    });

  if (upcomingActions.length === 0) {
    upcomingActions.push({
      id: "empty",
      day: "--",
      month: "--",
      title: "Tidak ada tindakan mendesak",
      category: "Aman",
      categoryColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    });
  }

  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4">
      {/* STATUS PENANGANAN DONUT */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Status Penanganan</h3>

        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto">
          {/* Donut Chart */}
          <div className="relative w-36 h-36 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              {statusSegments.map((segment) => {
                const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += segment.percent;

                return (
                  <circle
                    key={segment.label}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="22"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">{stats.total}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Kejadian</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 w-full max-w-[170px]">
            {statusSegments.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300 truncate">{item.label}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-white shrink-0">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TINDAKAN SELANJUTNYA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tindakan Selanjutnya</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Terjadwal
          </span>
        </div>

        {/* Action Items List */}
        <div className="space-y-2.5 my-auto">
          {upcomingActions.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all gap-3"
            >
              {/* Date Box */}
              <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 text-slate-800 dark:text-slate-200">
                <span className="text-xs font-bold leading-none">{action.day}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{action.month}</span>
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {action.title}
                </div>
                <div className="text-[11px] text-slate-400">Target penyelesaian hari kerja</div>
              </div>

              {/* Category Badge */}
              <div className="shrink-0">
                <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${action.categoryColor}`}>
                  {action.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Link */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <span>Lihat Semua Tindakan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
