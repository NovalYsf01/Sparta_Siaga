"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  Clock3,
  ExternalLink,
  MapPin,
  RefreshCw,
  Radio,
  Waves,
} from "lucide-react";
import { useSiaga } from "@/components/layout/siaga-context";
import { Earthquake } from "@/types/disaster";

function EventCard({ event }: { event: Earthquake }) {
  const [open, setOpen] = useState(false);
  const significant = event.magnitude >= 5;

  return (
    <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:border-slate-300">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full text-left px-4 lg:px-5 py-4 flex items-center gap-4"
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${significant ? "bg-amber-500" : "bg-slate-300"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${significant ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
              {significant ? "Signifikan" : "Informasi"}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{event.source}</span>
          </div>
          <h2 className="text-sm lg:text-[15px] font-bold text-slate-900 mt-1 truncate">{event.title}</h2>
          <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Activity className="w-3 h-3" /> M {event.magnitude}</span>
            <span className="inline-flex items-center gap-1"><Waves className="w-3 h-3" /> {event.depth}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> {event.time}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-slate-400">
          <MapPin className="w-4 h-4 hidden sm:block" />
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 lg:px-5 py-4 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Koordinat</div>
            <div className="font-semibold text-slate-800 mt-1">{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Potensi Tsunami</div>
            <div className="font-semibold text-slate-800 mt-1">{event.potensiTsunami ? "Ada indikasi" : "Tidak ada indikasi"}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Data</div>
            <div className="font-semibold text-emerald-700 mt-1">Data sumber resmi / eksternal</div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function AlertsPage() {
  const { disasterData, loading, loadInitialData } = useSiaga() as ReturnType<typeof useSiaga> & {
    loadInitialData?: (refresh?: boolean) => Promise<void>;
  };
  const [filter, setFilter] = useState<"all" | "earthquake">("all");

  const events = useMemo(() => {
    const list = disasterData?.recentEarthquakes ?? [];
    return filter === "earthquake" ? list.filter(Boolean) : list;
  }, [disasterData, filter]);

  const significantCount = events.filter((event) => event.magnitude >= 5).length;
  const tsunamiCount = events.filter((event) => event.potensiTsunami).length;

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 lg:p-7 space-y-5">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#1D5AA6] mb-1">
            <Radio className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Monitoring Sumber</span>
          </div>
          <h1 className="text-2xl lg:text-[28px] font-black text-slate-900 tracking-tight">Event Bencana</h1>
          <p className="text-sm text-slate-500 mt-1">
            Informasi kejadian dari sumber bencana. Halaman ini bukan tempat mengelola laporan lapangan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadInitialData?.(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-500">Sumber:</span>
          <span className="font-bold text-emerald-600">BMKG Live</span>
          <span className="font-bold text-emerald-600">USGS Live</span>
          <span className="text-slate-400">Diperbarui {disasterData?.lastUpdated ? new Date(disasterData.lastUpdated).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"} WIB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === "all" ? "bg-[#1D5AA6] text-white" : "text-slate-500 hover:bg-slate-100"}`}>Semua Event</button>
          <button type="button" onClick={() => setFilter("earthquake")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === "earthquake" ? "bg-[#1D5AA6] text-white" : "text-slate-500 hover:bg-slate-100"}`}>Gempa Bumi</button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Total Event" value={events.length} />
        <Metric label="Signifikan (M5+)" value={significantCount} tone="amber" />
        <Metric label="Potensi Tsunami" value={tsunamiCount} tone="red" />
        <Metric label="Status Data" value={disasterData?.dataFreshness === "fresh" ? "Live" : disasterData?.dataFreshness === "stale" ? "Stale" : "N/A"} tone="green" />
      </section>

      <section className="space-y-2.5">
        {events.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Radio className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">Belum ada event yang tersedia.</p>
            <p className="text-xs text-slate-400 mt-1">Periksa kembali status sumber data.</p>
          </div>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>

      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <ExternalLink className="w-3.5 h-3.5" />
        Event di halaman ini adalah konteks sumber bencana. Laporan kondisi lapangan dikelola di Pusat Laporan.
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "blue" }: { label: string; value: string | number; tone?: "blue" | "amber" | "red" | "green" }) {
  const toneClass = {
    blue: "bg-blue-50 text-[#1D5AA6]",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    green: "bg-emerald-50 text-emerald-600",
  }[tone];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
      <div className={`text-2xl font-black mt-2 ${toneClass.split(" ")[1]}`}>{value}</div>
    </div>
  );
}
