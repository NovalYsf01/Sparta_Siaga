"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Camera, ImageIcon, RefreshCw } from "lucide-react";
import type { IncidentRecord } from "@/types/incident";

interface EvidenceItem {
  id: string; caption: string; origin: string; uploadedByName: string; uploadedAt: string; url: string;
}

export function IncidentEvidenceGallery({ incident }: { incident: IncidentRecord }) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/incidents/${encodeURIComponent(incident.id)}/evidence`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Bukti tidak dapat dimuat");
        return response.json();
      })
      .then((payload) => { setItems(payload.data || []); setError(""); })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [incident.id]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Memuat bukti lapangan…</div>;
  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (items.length === 0) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Belum ada bukti kondisi lapangan.</p>;

  return <section aria-label="Bukti kondisi lapangan" className="space-y-3">
    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bukti kondisi lapangan</h4>
    <div className="grid gap-3 sm:grid-cols-2">{items.map((item) => <figure key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <a href={item.url} target="_blank" rel="noreferrer" className="block bg-slate-100"><Image src={item.url} alt={item.caption} width={640} height={360} unoptimized className="h-36 w-full object-cover" /></a>
      <figcaption className="space-y-1 p-3"><p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{item.caption}</p><p className="flex items-center gap-1 text-xs text-slate-500">{item.origin === "CAMERA_SELF" ? <Camera className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}{item.origin === "GALLERY_THIRD_PARTY" ? "Diterima dari pihak lain" : item.origin === "LEGACY_UNKNOWN" ? "Bukti historis" : "Foto diambil sendiri"}</p><p className="text-xs text-slate-500">{item.uploadedByName} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.uploadedAt))}</p></figcaption>
    </figure>)}</div>
  </section>;
}
