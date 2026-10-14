"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RepairLink = { repair_reference_id: string; verified_by: string; verification_notes: string | null; created_at: string };

export function RepairLinksCard({ incidentId, readOnly = false }: { incidentId: string; readOnly?: boolean }) {
  const [links, setLinks] = useState<RepairLink[]>([]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/repair-links`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal memuat pekerjaan terkait");
      setLinks(payload.data);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal memuat pekerjaan terkait"); }
    finally { setLoading(false); }
  }, [incidentId]);
  useEffect(() => { load(); }, [load]);

  async function mutate(method: "POST" | "DELETE", repairReferenceId: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/repair-links`, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repairReferenceId, notes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Perubahan tautan ditolak");
      toast.success(method === "POST" ? "Pekerjaan perbaikan ditautkan" : "Tautan pekerjaan dilepas");
      setReference(""); setNotes(""); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Perubahan tautan gagal"); }
    finally { setSaving(false); }
  }

  return <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex items-start gap-3"><Link2 className="mt-0.5 h-5 w-5 text-blue-600" /><div><h3 className="text-sm font-bold">Pekerjaan perbaikan terkait</h3><p className="mt-1 text-xs text-slate-500">Tautan referensi saja; biaya dan progres laporan tidak digandakan.</p></div></div>
    {loading ? <div className="grid min-h-20 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : <div className="mt-4 space-y-2">{links.length === 0 && <p className="text-xs text-slate-500">Belum ada pekerjaan perbaikan yang ditautkan.</p>}{links.map((link) => <div key={link.repair_reference_id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3"><div className="min-w-0"><strong className="block truncate text-sm">{link.repair_reference_id}</strong><p className="mt-1 text-xs text-slate-500">{link.verification_notes || "Tanpa catatan"} · {new Date(link.created_at).toLocaleString("id-ID")}</p></div>{!readOnly && <button onClick={() => mutate("DELETE", link.repair_reference_id)} disabled={saving} className="touch-target-min grid place-items-center rounded-md text-red-600 hover:bg-red-50" aria-label={`Lepas ${link.repair_reference_id}`}><Trash2 className="h-4 w-4" /></button>}</div>)}</div>}
    {!readOnly && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs font-semibold">Referensi pekerjaan<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Contoh: WO-2026-001" className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Catatan verifikasi<input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" /></label><button onClick={() => mutate("POST", reference.trim())} disabled={!reference.trim() || saving} className="sparta-button primary self-end">Tautkan</button></div>}
  </section>;
}
