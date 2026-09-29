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
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
      {/* LEFT: TREN KEJADIAN */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Tren Kejadian</h3>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
            {series.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Multi-Line Chart */}
        <div className="relative w-full h-52">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 480 180" preserveAspectRatio="none">
            {/* Horizontal Gridlines */}
            {[0, 2, 4, 6, 8, 10].map((val) => {
              const y = 160 - (val / 10) * 140;
              return (
                <g key={val}>
                  <line x1="30" y1={y} x2="470" y2={y} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />
                  <text x="20" y={y + 3} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 text-[10px] font-sans">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Series Lines */}
            {series.map((item) => {
              const stepX = (470 - 45) / (months.length - 1);
              const pathPoints = item.points
                .map((pt, idx) => {
                  const x = 45 + idx * stepX;
                  const y = 160 - (pt / 10) * 140;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ");

              return (
                <g key={item.name}>
                  <path
                    d={pathPoints}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Point Dots */}
                  {item.points.map((pt, idx) => {
                    const cx = 45 + idx * stepX;
                    const cy = 160 - (pt / 10) * 140;
                    return (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r="3.5"
                        fill="#ffffff"
                        stroke={item.color}
                        strokeWidth="2"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* X-Axis Month Labels */}
            {months.map((m, idx) => {
              const stepX = (470 - 45) / (months.length - 1);
              const x = 45 + idx * stepX;
              return (
                <text key={m} x={x} y="176" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-medium font-sans">
                  {m}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* RIGHT: DISTRIBUSI KEJADIAN */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-3">Distribusi Kejadian</h3>

        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto">
          {/* Donut SVG */}
          <div className="relative w-40 h-40 shrink-0">
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
                    stroke={segment.color}
                    strokeWidth="22"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">{stats.total}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Kejadian</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="flex flex-col gap-2 w-full max-w-[140px]">
            {distribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300 truncate">{item.label}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-white shrink-0">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
