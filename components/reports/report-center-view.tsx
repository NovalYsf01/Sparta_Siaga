"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { IncidentRecord, IncidentStatus, DisasterType, RoleType } from "@/types/incident";

interface ReportCenterViewProps {
  incidents: IncidentRecord[];
  activeRole: RoleType;
  onSelectIncident: (incident: IncidentRecord) => void;
  onCreateReport: () => void;
}

type ReportTab = "all" | "confirmation" | "active" | "resolved";

const statusLabel: Record<IncidentStatus, string> = {
  pending_confirmation: "Perlu Konfirmasi",
  verifying: "Verifikasi Lapangan",
  confirmed_affected: "Terkonfirmasi Terdampak",
  confirmed_safe: "Terkonfirmasi Aman",
  investigating: "Investigasi",
  in_estimation: "Dalam Estimasi",
  in_maintenance: "Dalam Penanganan",
  in_construction: "Dalam Konstruksi",
  awaiting_spk: "Menunggu SPK",
  spk_issued: "SPK Diterbitkan",
  awaiting_st: "Menunggu Serah Terima",
  resolved: "Selesai",
  archived: "Diarsipkan",
};

const disasterLabel: Record<DisasterType, string> = {
  earthquake: "Gempa Bumi",
  flood: "Banjir",
  fire: "Kebakaran",
  theft: "Kemalingan",
  heavy_rain: "Hujan / Badai",
  strong_wind: "Angin Kencang",
  severe_building_damage: "Kerusakan Bangunan",
};

function isResolved(status: IncidentStatus) {
  return status === "resolved" || status === "archived";
}

function isWaitingConfirmation(status: IncidentStatus) {
  return status === "pending_confirmation" || status === "verifying";
}

function isActive(status: IncidentStatus) {
  return !isResolved(status);
}

function statusTone(status: IncidentStatus) {
  if (isResolved(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (isWaitingConfirmation(status)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function originLabel(origin: IncidentRecord["reportOrigin"]) {
  return origin === "automatic_earthquake" ? "Auto • Gempa BMKG/USGS" : "Manual • Lapangan";
}

export function ReportCenterView({
  incidents,
  activeRole,
  onSelectIncident,
  onCreateReport,
}: ReportCenterViewProps) {
  const [tab, setTab] = useState<ReportTab>("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<DisasterType | "all">("all");

  const counts = useMemo(() => ({
    all: incidents.length,
    confirmation: incidents.filter((i) => isWaitingConfirmation(i.status)).length,
    active: incidents.filter((i) => isActive(i.status)).length,
    resolved: incidents.filter((i) => isResolved(i.status)).length,
  }), [incidents]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return incidents.filter((incident) => {
      const tabMatch =
        tab === "all" ||
        (tab === "confirmation" && isWaitingConfirmation(incident.status)) ||
        (tab === "active" && isActive(incident.status)) ||
        (tab === "resolved" && isResolved(incident.status));

      const typeMatch = type === "all" || incident.disasterType === type;

      const searchMatch =
        !normalized ||
        incident.id.toLowerCase().includes(normalized) ||
        incident.storeName.toLowerCase().includes(normalized) ||
        incident.branch.toLowerCase().includes(normalized) ||
        incident.locationCity.toLowerCase().includes(normalized);

      return tabMatch && typeMatch && searchMatch;
    });
  }, [incidents, query, tab, type]);

  const isHo = ["ho_admin", "gm_ho", "sm_ho"].includes(activeRole);

  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 lg:p-7 space-y-5">
      <section className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#1D5AA6] mb-1">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Pelaporan Operasional</span>
          </div>
          <h1 className="text-2xl lg:text-[28px] font-black text-slate-900 tracking-tight">
            Pusat Laporan
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Satu tempat untuk melihat laporan lapangan dari masuk, konfirmasi, penanganan, sampai selesai.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHo && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
              <ShieldCheck className="w-4 h-4 text-[#1D5AA6]" />
              Mode monitoring HO
            </div>
          )}
          <button
            type="button"
            onClick={onCreateReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D5AA6] hover:bg-[#123B6D] text-white text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            Buat Laporan Baru
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard label="Semua Laporan" value={counts.all} icon={FileText} />
        <SummaryCard label="Perlu Konfirmasi" value={counts.confirmation} icon={Siren} tone="amber" />
        <SummaryCard label="Sedang Berjalan" value={counts.active} icon={Activity} tone="blue" />
        <SummaryCard label="Selesai / Arsip" value={counts.resolved} icon={Archive} tone="green" />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            <ReportTabButton active={tab === "all"} onClick={() => setTab("all")} label={`Semua ${counts.all}`} />
            <ReportTabButton active={tab === "confirmation"} onClick={() => setTab("confirmation")} label={`Perlu Konfirmasi ${counts.confirmation}`} />
            <ReportTabButton active={tab === "active"} onClick={() => setTab("active")} label={`Berjalan ${counts.active}`} />
            <ReportTabButton active={tab === "resolved"} onClick={() => setTab("resolved")} label={`Selesai ${counts.resolved}`} />
          </div>

          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nomor laporan, toko, cabang, atau kota..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#1D5AA6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="relative lg:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DisasterType | "all")}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:border-[#1D5AA6]"
              >
                <option value="all">Semua Jenis Kejadian</option>
                {Object.entries(disasterLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">Belum ada laporan yang sesuai.</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau buat laporan baru.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-bold">Laporan</th>
                    <th className="px-4 py-3 font-bold">Lokasi</th>
                    <th className="px-4 py-3 font-bold">Kejadian</th>
                    <th className="px-4 py-3 font-bold">Sumber</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Progress</th>
                    <th className="px-5 py-3 text-right font-bold">Lihat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((incident) => (
                    <ReportRow key={incident.id} incident={incident} onSelect={onSelectIncident} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-slate-100">
              {filtered.map((incident) => (
                <ReportCard key={incident.id} incident={incident} onSelect={onSelectIncident} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "blue" | "amber" | "green";
}) {
  const tones = {
    blue: "bg-blue-50 text-[#1D5AA6]",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="text-2xl font-black text-slate-900 mt-3">{value}</div>
    </div>
  );
}

function ReportTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 ${active ? "bg-[#1D5AA6] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
    >
      {label}
    </button>
  );
}

function ReportRow({
  incident,
  onSelect,
}: {
  incident: IncidentRecord;
  onSelect: (incident: IncidentRecord) => void;
}) {
  const progress = Math.max(0, Math.min(100, incident.progress ?? 0));

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="px-5 py-4">
        <div className="font-mono text-[11px] font-bold text-[#1D5AA6]">{incident.id}</div>
        <div className="text-xs font-semibold text-slate-900 mt-1">{incident.date}</div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm font-bold text-slate-900">{incident.storeName}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{incident.branch} · {incident.locationCity}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="text-xs font-semibold text-slate-700">{disasterLabel[incident.disasterType]}</span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${incident.reportOrigin === "automatic_earthquake" ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
          {incident.reportOrigin === "automatic_earthquake" ? <Siren className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
          {originLabel(incident.reportOrigin)}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-bold ${statusTone(incident.status)}`}>
          {statusLabel[incident.status]}
        </span>
      </td>
      <td className="px-4 py-4 min-w-[150px]">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1D5AA6] rounded-full transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-bold text-slate-600">{progress}%</span>
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={() => onSelect(incident)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          Lihat Laporan
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

function ReportCard({
  incident,
  onSelect,
}: {
  incident: IncidentRecord;
  onSelect: (incident: IncidentRecord) => void;
}) {
  const progress = Math.max(0, Math.min(100, incident.progress ?? 0));

  return (
    <article className="p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] font-bold text-[#1D5AA6] truncate">{incident.id}</div>
          <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">{incident.storeName}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{incident.branch} · {incident.locationCity}</p>
        </div>
        <span className={`shrink-0 inline-flex px-2 py-1 rounded-lg border text-[9px] font-bold ${statusTone(incident.status)}`}>
          {statusLabel[incident.status]}
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-2 mt-3">
        <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
          {disasterLabel[incident.disasterType]}
        </span>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
          {incident.reportOrigin === "automatic_earthquake" ? "Auto Gempa" : "Manual"}
        </span>
        <span className="text-[10px] text-slate-400">{incident.date}</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Clock3 className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#1D5AA6] rounded-full transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-bold text-slate-500">{progress}%</span>
      </div>

      <button
        type="button"
        onClick={() => onSelect(incident)}
        className="w-full mt-3 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all inline-flex items-center justify-center gap-2"
      >
        Lihat Laporan
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </article>
  );
}
