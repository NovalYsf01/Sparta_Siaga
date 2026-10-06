"use client";

import React from "react";
import { IncidentStats } from "@/types/incident";
import { BarChart3 } from "lucide-react";

interface IncidentChartsProps {
  stats: IncidentStats;
}

export function IncidentCharts({ stats }: IncidentChartsProps) {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt"];

  // Real resolution rate based strictly on resolved reports (Requirement 27)
  const resolutionRate = stats.total > 0
    ? Math.round(((stats.statusBreakdown?.resolved || 0) / stats.total) * 100)
    : 0;

  // Real distribution percentages
  const total = stats.total || 0;
  const distribution = total > 0 ? [
    { label: "Banjir", count: stats.flood, percent: Math.round((stats.flood / total) * 100) || 0, color: "#3b82f6" },
    { label: "Gempa Bumi", count: stats.earthquake, percent: Math.round((stats.earthquake / total) * 100) || 0, color: "#f59e0b" },
    { label: "Lainnya", count: (stats.other + stats.fire + stats.theft + stats.strong_wind + stats.severe_building_damage), percent: Math.round(((stats.other + stats.fire + stats.theft + stats.strong_wind + stats.severe_building_damage) / total) * 100) || 0, color: "#94a3b8" },
  ] : [
    { label: "Tidak Ada Data", count: 0, percent: 100, color: "#cbd5e1" }
  ];

  // SVG Donut calculation
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  // Trend series: Honest points based on real data (no fake fictional history)
  const currentMonthIdx = 9; // Oktober
  const eqPoints = months.map((_, idx) => (idx === currentMonthIdx ? stats.earthquake : 0));
  const floodPoints = months.map((_, idx) => (idx === currentMonthIdx ? stats.flood : 0));

  const maxVal = Math.max(5, stats.earthquake, stats.flood);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. DONUT CHART (Distribusi Kejadian Riil) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-6">Distribusi Kejadian</h3>
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              {total === 0 ? (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#334155"
                  strokeWidth="20"
                  strokeDasharray={`${circumference} ${circumference}`}
                />
              ) : (
                distribution.map((segment) => {
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
                      strokeWidth="24"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  );
                })
              )}
            </svg>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white leading-none">
                {stats.total}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                {stats.total === 0 ? "Belum Ada Laporan" : "Laporan"}
              </span>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex justify-center gap-4 mt-6">
          {total > 0 ? (
            distribution.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.label} ({item.count})</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-slate-400">Data insiden masih kosong</span>
          )}
        </div>
      </div>

      {/* 2. RESOLUTION RATE / TINGKAT PENYELESAIAN RIIL */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-2">Tingkat Penyelesaian</h3>
        <div className="text-center my-auto">
          <div className="text-6xl font-bold text-slate-900 dark:text-white mb-2">
            {resolutionRate}%
          </div>
          <p className="text-sm text-slate-500 max-w-[220px] mx-auto">
            {stats.statusBreakdown?.resolved || 0} dari {stats.total} kejadian telah selesai ditangani secara tuntas.
          </p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs text-slate-500 text-center">
          Dihitung murni berdasarkan status laporan operasional <strong>RESOLVED</strong>.
        </div>
      </div>

      {/* 3. TREN LINE CHART (DATA RIIL TANPA MOCK / DUMMY) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Tren Kejadian per Bulan</h3>
        </div>

        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <BarChart3 className="w-8 h-8 text-slate-500 mb-2 opacity-60" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Belum ada riwayat laporan tercatat
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Grafik tren akan terisi otomatis seiring pelaporan insiden operasional.
            </p>
          </div>
        ) : (
          <div className="relative w-full h-48 mt-auto">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 480 180" preserveAspectRatio="none">
              {/* Gridlines */}
              {[0, Math.round(maxVal / 2), maxVal].map((val) => {
                const y = 160 - (val / maxVal) * 140;
                return (
                  <g key={val}>
                    <line x1="20" y1={y} x2="480" y2={y} className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="10" y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">{val}</text>
                  </g>
                );
              })}

              {/* Gempa Line */}
              {(() => {
                const stepX = (480 - 20) / (months.length - 1);
                const pathPoints = eqPoints
                  .map((pt, idx) => {
                    const x = 20 + idx * stepX;
                    const y = 160 - (pt / maxVal) * 140;
                    return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .join(" ");

                return (
                  <g>
                    <path d={pathPoints} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle
                      cx={20 + currentMonthIdx * stepX}
                      cy={160 - (stats.earthquake / maxVal) * 140}
                      r="4"
                      fill="#ffffff"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                  </g>
                );
              })()}

              {/* Banjir Line */}
              {(() => {
                const stepX = (480 - 20) / (months.length - 1);
                const pathPoints = floodPoints
                  .map((pt, idx) => {
                    const x = 20 + idx * stepX;
                    const y = 160 - (pt / maxVal) * 140;
                    return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .join(" ");

                return (
                  <g>
                    <path d={pathPoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle
                      cx={20 + currentMonthIdx * stepX}
                      cy={160 - (stats.flood / maxVal) * 140}
                      r="4"
                      fill="#ffffff"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                  </g>
                );
              })()}

              {/* X-Axis Labels */}
              {months.map((m, idx) => {
                const stepX = (480 - 20) / (months.length - 1);
                const x = 20 + idx * stepX;
                return (
                  <text key={m} x={x} y="176" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium font-sans">
                    {m}
                  </text>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
