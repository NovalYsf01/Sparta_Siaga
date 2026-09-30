"use client";

import React from "react";
import { IncidentStats } from "@/types/incident";

interface IncidentChartsProps {
  stats: IncidentStats;
}

export function IncidentCharts({ stats }: IncidentChartsProps) {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep"];

  // Gempa (orange), Banjir (blue) - kept mock for historical trend visualization
  const series = [
    {
      name: "Gempa Bumi",
      color: "#f59e0b",
      points: [0.2, 0.5, 0.3, 0.8, 0.4, 0.6, 0.9, 0.5, stats.earthquake],
    },
    {
      name: "Banjir",
      color: "#3b82f6",
      points: [2.5, 4.0, 3.6, 4.5, 5.5, 5.5, 7.5, 6.8, stats.flood],
    },
  ];

  const total = stats.total || 1; // Prevent division by zero
  const distribution = [
    { label: "Banjir", percent: Math.round((stats.flood / total) * 100) || 0, color: "#3b82f6" },
    { label: "Gempa Bumi", percent: Math.round((stats.earthquake / total) * 100) || 0, color: "#f59e0b" },
    { label: "Lainnya", percent: Math.round(((stats.other + stats.fire + stats.theft + stats.wind) / total) * 100) || 0, color: "#94a3b8" },
  ];

  // Calculate SVG Donut strokeDasharray
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. DONUT CHART (Distribusi Kejadian) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-6">Distribusi Kejadian</h3>
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              {distribution.map((segment) => {
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
                    stroke={segment.color === "#3b82f6" ? "#0f766e" : segment.color === "#f59e0b" ? "#064e3b" : "#cbd5e1"}
                    strokeWidth="24"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                );
              })}
            </svg>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white leading-none">{stats.total}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Laporan</span>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex justify-center gap-4 mt-6">
          {distribution.map((item) => (
             <div key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
               <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color === "#3b82f6" ? "#0f766e" : item.color === "#f59e0b" ? "#064e3b" : "#cbd5e1" }} />
               {item.label}
             </div>
          ))}
        </div>
      </div>

      {/* 2. RESOLUTION RATE / TINGKAT PENYELESAIAN */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-2">Tingkat Penyelesaian</h3>
        <div className="text-center my-auto">
           <div className="text-6xl font-bold text-slate-900 dark:text-white mb-2">
             {stats.total > 0 ? Math.round(((stats.total - (stats.earthquake + stats.flood)) / stats.total) * 100) : 0}%
           </div>
           <p className="text-sm text-slate-500 max-w-[200px] mx-auto">
             Persentase kejadian yang telah terselesaikan atau tertangani dengan baik.
           </p>
        </div>
        <button className="w-full py-3 mt-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          View Details
        </button>
      </div>

      {/* 3. TREN LINE CHART */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Tren Kejadian per Bulan</h3>
        </div>
        <div className="relative w-full h-48 mt-auto">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 480 180" preserveAspectRatio="none">
            {/* Gridlines */}
            {[0, 5, 10].map((val) => {
              const y = 160 - (val / 10) * 140;
              return (
                <g key={val}>
                  <line x1="20" y1={y} x2="480" y2={y} className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="4 4" />
                </g>
              );
            })}
            
            {/* Series Lines */}
            {series.map((item, sIdx) => {
              const stepX = (480 - 20) / (months.length - 1);
              const pathPoints = item.points
                .map((pt, idx) => {
                  const x = 20 + idx * stepX;
                  const y = 160 - (pt / 10) * 140;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ");

              const themeColor = sIdx === 0 ? "#0f766e" : "#059669";
              return (
                <g key={item.name}>
                  <path
                    d={pathPoints}
                    fill="none"
                    stroke={themeColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Point Dots */}
                  {item.points.map((pt, idx) => {
                    const cx = 20 + idx * stepX;
                    const cy = 160 - (pt / 10) * 140;
                    return (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill="#ffffff"
                        stroke={themeColor}
                        strokeWidth="2"
                      />
                    );
                  })}
                </g>
              );
            })}

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
      </div>
    </div>
  );
}
