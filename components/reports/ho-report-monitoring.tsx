"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, ClipboardList, Download, Eye, FileText, Search, ShieldCheck, X } from "lucide-react";
import type { DisasterType, IncidentRecord, IncidentStatus } from "@/types/incident";
import { formatReportDate, getHoAttentionReasons, getReportTarget, isFinalPdfAvailable, isReportFinalized, reportStatusLabel } from "@/lib/ho-report-monitoring";

type ReportTab = "all" | "attention";

function incidentEventName(kind: string): string {
  const label: Record<string, string> = {
    earthquake: "Gempa Bumi", flood: "Banjir", fire: "Kebakaran",
    theft: "Pencurian", heavy_rain: "Hujan Lebat", strong_wind: "Angin Kencang",
    severe_building_damage: "Kerusakan Bangunan", other: "Lainnya",
  };
  return label[kind] || kind;
}

function statusStyle(status: IncidentStatus): string {
  if (isReportFinalized({ status } as IncidentRecord)) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300";
  if (["clarification_requested", "revision_requested"].includes(status)) return "bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300";
  if (["pending_confirmation", "pending_bm_approval", "pending_final_approval"].includes(status)) return "bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-300";
  return "bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300";
}

function readOnlyPdfLink(report: IncidentRecord, kind: "initial" | "monitoring" | "final", label: string) {
  const path = `/api/incidents/${encodeURIComponent(report.id)}/export/${kind}-pdf`;
  return (
    <a key={kind} href={path} download={`SPARTA_${kind}_${report.id}.pdf`}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#1D5AA6] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700">
      <Download className="h-4 w-4" /> {label}
    </a>
  );
}

function ReportDetail({ incident, onClose }: { incident: IncidentRecord; onClose: () => void }) {
  const target = getReportTarget(incident);
  const approval = incident.verification?.bmApproval;
  const photoPrefix = `/api/incidents/${encodeURIComponent(incident.id)}/inspection/evidence/`;
  const photos = Array.from(new Set([
    ...(incident.verification?.photos || []),
    ...(incident.fieldPhotos || []),
    ...(incident.verification?.evidenceDetails?.map(p => p.photoUrl) || []),
  ])).filter(url => typeof url === "string" && url.startsWith(photoPrefix));

  return (
    <div className="fixed inset-0 z-[2700] flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white md:items-center md:justify-center md:bg-slate-950/65 md:p-5" role="dialog" aria-modal="true" aria-label={`Detail laporan ${incident.id}`}>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white dark:bg-slate-900 md:max-h-[92dvh] md:max-w-5xl md:flex-none md:rounded-xl md:shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <button type="button" onClick={onClose} aria-label="Kembali ke daftar laporan" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold sm:text-lg">{incident.storeName}</h2>
              <p className="mt-0.5 break-all text-[11px] text-slate-500 dark:text-slate-400">{incident.id} · {incident.branch}</p>
              <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${statusStyle(incident.status)}`}>{reportStatusLabel(incident.status)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup detail" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50/70 p-4 pb-24 dark:bg-slate-950/40 sm:p-6">
          <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
            {[
              ["Kejadian", incidentEventName(incident.disasterType)],
              ["Tanggal", formatReportDate(incident.createdAt)],
              ["PIC", incident.primaryPicName || "Belum ditugaskan"],
              ["Target Selesai", target ? formatReportDate(target) : "Belum ditentukan"],
            ].map(([label, value]) => <div key={label}><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold leading-relaxed">{value}</p></div>)}
          </section>

          {getHoAttentionReasons(incident).length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30" aria-label="Butuh perhatian">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> Perlu Perhatian</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800 dark:text-amber-200">{getHoAttentionReasons(incident).map(v => <li key={v}>{v}</li>)}</ul>
          </section>}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold">Pemeriksaan Lapangan</h3>
              {incident.verification ? <div className="mt-3 space-y-2 text-xs leading-relaxed">
                <p><span className="text-slate-500">Pemeriksa:</span> {incident.verification.confirmedBy || "Belum tercatat"}</p>
                <p><span className="text-slate-500">Metode:</span> {incident.verification.inspectionMethod === "kunjungan_langsung" ? "Kunjungan langsung" : incident.verification.inspectionMethod === "informasi_petugas" ? "Informasi petugas lokasi" : "Belum ditentukan"}</p>
                <p><span className="text-slate-500">Kondisi:</span> {incident.verification.condition === "damaged" ? "Ada kerusakan" : incident.verification.condition === "safe" ? "Kondisi aman" : incident.verification.condition === "uncertain" ? "Belum pasti" : "Menunggu hasil"}</p>
                <p><span className="text-slate-500">Catatan:</span> {incident.verification.notes || "Belum ada keterangan."}</p>
                <p><span className="text-slate-500">Waktu:</span> {formatReportDate(incident.verification.confirmedAt)}</p>
              </div> : <p className="mt-3 text-xs text-slate-500">Pemeriksaan belum dicatat.</p>}
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-blue-600" /> Keputusan BnM Manajer</h3>
              {approval ? <div className="mt-3 space-y-2 text-xs leading-relaxed">
                <p><span className="text-slate-500">Keputusan:</span> {approval.decision === "approved" ? "Kerusakan disetujui" : approval.decision === "safe" ? "Dinyatakan aman" : approval.decision === "clarification_requested" ? "Meminta klarifikasi" : "Laporan ditolak"}</p>
                <p><span className="text-slate-500">Oleh:</span> {approval.decidedBy || "Belum tercatat"}</p>
                <p><span className="text-slate-500">Tanggal:</span> {formatReportDate(approval.decidedAt)}</p>
                <p><span className="text-slate-500">Catatan:</span> {approval.decisionNotes || approval.clarificationReason || approval.rejectionReason || "Tanpa catatan."}</p>
              </div> : <p className="mt-3 text-xs text-slate-500">Keputusan BnM belum tersedia.</p>}
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold">Penanganan & Maintenance</h3>
              <div className="mt-3 space-y-2 text-xs leading-relaxed">
                <p><span className="text-slate-500">Tahap:</span> {reportStatusLabel(incident.status)}</p>
                <p><span className="text-slate-500">PIC:</span> {incident.primaryPicName || incident.maintenanceTicket?.assignedTechnician || "Belum ditugaskan"}</p>
                <p><span className="text-slate-500">Target:</span> {target ? formatReportDate(target) : "Belum ditentukan"}</p>
                {incident.progress > 0 && <p><span className="text-slate-500">Progres:</span> {incident.progress}%</p>}
                <p><span className="text-slate-500">Pekerjaan:</span> {incident.maintenanceTicket?.workDescription || "Belum ada rincian pekerjaan."}</p>
                <p><span className="text-slate-500">Estimasi:</span> {incident.maintenanceTicket?.costEstimate || "Belum tersedia"}</p>
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold">Bukti Foto Pemeriksaan</h3>
              {photos.length ? <div className="mt-3 grid grid-cols-2 gap-2">
                {photos.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="Lihat foto ukuran penuh" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  {/* Private same-origin evidence endpoint, authenticated by server. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto pemeriksaan ${i + 1}`} loading="lazy" className="h-32 w-full object-cover" />
                </a>)}
              </div> : <p className="mt-3 text-xs text-slate-500">Belum ada foto bukti yang tersedia.</p>}
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-blue-600" /> Riwayat & Lifecycle</h3>
            {incident.timeline?.length ? <ol className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
              {incident.timeline.map((entry, i) => <li key={i} className="text-xs leading-relaxed">
                <p className="font-semibold">{entry.label || entry.stage}</p>
                <p className="text-[11px] text-slate-500">{entry.actor} · {entry.timestamp}</p>
                {entry.notes && <p className="mt-1 text-slate-600 dark:text-slate-300">{entry.notes}</p>}
              </li>)}
            </ol> : <p className="mt-3 text-xs text-slate-500">Belum ada riwayat aktivitas.</p>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Dokumen laporan">
            <h3 className="flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-blue-600" /> Dokumen PDF</h3>
            <p className="mt-1 text-xs text-slate-500">Dokumen mengikuti data dan tahapan yang tercatat. Ringkasan monitoring bukan laporan final.</p>
            <div className="mt-3 flex flex-col flex-wrap gap-2 sm:flex-row">
              {readOnlyPdfLink(incident, "initial", "Laporan Awal")}
              {readOnlyPdfLink(incident, "monitoring", "Ringkasan Monitoring")}
              {isFinalPdfAvailable(incident) ? readOnlyPdfLink(incident, "final", "Laporan Final") :
                <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 text-xs text-slate-400 dark:border-slate-700">Laporan Final tersedia setelah ditutup</span>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Read-only command view. No operational approve / edit / dispatch controls. */
export function HoReportMonitoring({ incidents }: { incidents: IncidentRecord[] }) {
  const [activeTab, setActiveTab] = useState<ReportTab>("all");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [kind, setKind] = useState<DisasterType | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = incidents.find(inc => inc.id === selectedId) || null;
  const branches = useMemo(() => Array.from(new Set(incidents.map(i => i.branch).filter(Boolean))).sort(), [incidents]);
  const attentionCount = incidents.filter(i => getHoAttentionReasons(i).length > 0).length;
  const filtered = useMemo(() => incidents.filter(inc => {
    if (activeTab === "attention" && getHoAttentionReasons(inc).length === 0) return false;
    if (branch !== "all" && inc.branch !== branch) return false;
    if (status !== "all" && inc.status !== status) return false;
    if (kind !== "all" && inc.disasterType !== kind) return false;
    if (fromDate && inc.createdAt?.slice(0, 10) < fromDate) return false;
    const search = query.trim().toLowerCase();
    if (search && ![inc.id, inc.storeName, inc.storeId, inc.branch, inc.locationCity].some(v => (v || "").toLowerCase().includes(search))) return false;
    return true;
  }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")), [incidents, activeTab, branch, status, kind, query, fromDate]);

  const workingCount = incidents.filter(i => ["in_maintenance", "in_construction"].includes(i.status)).length;
  const completedCount = incidents.filter(i => ["closed", "resolved", "archived", "confirmed_safe"].includes(i.status)).length;

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-5 px-4 pb-24 pt-5 dark:text-white sm:px-5 lg:px-0 lg:pt-7" aria-label="Monitoring laporan HO">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Laporan Kejadian</h1>
          <p className="mt-1 text-xs text-slate-500">Monitoring laporan seluruh cabang · Head Office · Read-only</p></div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">Head Office</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Laporan", incidents.length],
          ["Perlu Perhatian", attentionCount],
          ["Dalam Penanganan", workingCount],
          ["Selesai / Aman", completedCount],
        ].map(([name, value]) => <div key={name} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">{name}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>)}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 dark:border-slate-800 sm:p-4">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Kategori laporan HO">
            <button role="tab" aria-selected={activeTab === "all"} onClick={() => setActiveTab("all")} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${activeTab === "all" ? "bg-white text-[#1D5AA6] shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>Semua Laporan ({incidents.length})</button>
            <button role="tab" aria-selected={activeTab === "attention"} onClick={() => setActiveTab("attention")} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${activeTab === "attention" ? "bg-white text-[#1D5AA6] shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>Perlu Perhatian ({attentionCount})</button>
          </div>
          <span className="text-xs text-slate-500">{filtered.length} laporan ditampilkan</span>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-4 sm:p-4 lg:grid-cols-5">
          <div className="relative col-span-2 sm:col-span-4 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari laporan, toko, DC..." aria-label="Cari laporan"
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <select value={branch} onChange={e => setBranch(e.target.value)} aria-label="Cabang" className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="all">Semua Cabang</option>{branches.map(v => <option key={v} value={v}>{v}</option>)}</select>
          <select value={kind} onChange={e => setKind(e.target.value as DisasterType | "all")} aria-label="Jenis kejadian" className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800">
            <option value="all">Semua Kejadian</option>
            {(["earthquake", "flood", "fire", "theft", "heavy_rain", "other"] as DisasterType[]).map(v => <option value={v} key={v}>{incidentEventName(v)}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as IncidentStatus | "all")} aria-label="Status laporan" className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800">
            <option value="all">Semua Status</option>
            {Array.from(new Set(incidents.map(i => i.status))).map(v => <option key={v} value={v}>{reportStatusLabel(v)}</option>)}
          </select>
          <label className="relative flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-2 dark:border-slate-700">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400"/>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} aria-label="Tanggal laporan mulai" className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-200"/>
          </label>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr>
              <th className="p-3">Laporan / Lokasi</th><th className="p-3">Cabang</th><th className="p-3">Kejadian</th><th className="p-3">Status</th><th className="p-3">PIC</th><th className="p-3">Target</th><th className="p-3 text-right">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map(inc => {
              const reasons = getHoAttentionReasons(inc);
              const target = getReportTarget(inc);
              return <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35">
                <td className="p-3"><p className="max-w-[240px] truncate font-semibold">{inc.storeName}</p><p className="max-w-[250px] truncate text-[10px] text-slate-500">{inc.id} · {formatReportDate(inc.createdAt)}</p>{reasons.length > 0 && <p className="mt-1 max-w-[260px] text-[10px] text-amber-700 dark:text-amber-300">{reasons[0]}</p>}</td>
                <td className="p-3">{inc.branch}</td><td className="p-3">{incidentEventName(inc.disasterType)}</td>
                <td className="p-3"><span className={`inline-block rounded-md px-2 py-1 text-[11px] font-medium ${statusStyle(inc.status)}`}>{reportStatusLabel(inc.status)}</span></td>
                <td className="p-3">{inc.primaryPicName || "—"}</td>
                <td className="p-3">{target ? formatReportDate(target) : "—"}</td>
                <td className="p-3 text-right"><button type="button" onClick={() => setSelectedId(inc.id)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-[#1D5AA6] hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300"><Eye className="h-3.5 w-3.5"/> Lihat Detail</button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="space-y-2 p-3 md:hidden">{filtered.map(inc => {
          const reasons = getHoAttentionReasons(inc), target = getReportTarget(inc);
          return <article key={inc.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{inc.storeName}</p><p className="text-[11px] text-slate-500">{inc.branch} · {incidentEventName(inc.disasterType)}</p></div><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ${statusStyle(inc.status)}`}>{reportStatusLabel(inc.status)}</span></div>
            {reasons.length > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{reasons[0]}</p>}
            <p className="mt-2 text-xs text-slate-500">PIC: {inc.primaryPicName || "Belum ditugaskan"}</p>
            <p className="text-xs text-slate-500">Target: {target ? formatReportDate(target) : "Belum ditentukan"}</p>
            <button type="button" onClick={() => setSelectedId(inc.id)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1D5AA6] px-3 text-xs font-semibold text-white"><Eye className="h-4 w-4"/> Lihat Detail</button>
          </article>;
        })}</div>
        {filtered.length === 0 && <div className="p-10 text-center text-slate-500"><ClipboardList className="mx-auto mb-2 h-7 w-7 text-slate-300"/><p className="text-sm">Belum ada laporan sesuai filter.</p></div>}
      </div>
      {selected && <ReportDetail incident={selected} onClose={() => setSelectedId(null)}/>}
    </section>
  );
}
