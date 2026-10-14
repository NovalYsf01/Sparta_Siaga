"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Link2, Loader2, SearchX } from "lucide-react";
import { toast } from "sonner";

type Case = {
  id: string; incident_id: string; reason: string; details: Record<string, unknown>;
  current_location_name: string | null; current_canonical_event_id: string | null;
  candidate_canonical_event_id: string | null; candidate_location_kind: string | null;
  candidate_location_id: string | null; magnitude: string | null; occurred_at: string | null;
  event_location: string | null; created_at: string;
};

export default function ReconciliationPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/reconciliation?status=OPEN", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal memuat rekonsiliasi");
      setItems(payload.data);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal memuat rekonsiliasi"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function decide(item: Case, action: "LINK" | "DISMISS") {
    const verb = action === "LINK" ? "tautkan" : "abaikan";
    if (!window.confirm(`Yakin ${verb} kandidat untuk laporan ${item.incident_id}?`)) return;
    setWorking(item.id);
    try {
      const response = await fetch("/api/admin/reconciliation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: item.id, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Keputusan ditolak");
      toast.success(action === "LINK" ? "Laporan ditautkan secara aman" : "Kandidat diabaikan");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan keputusan"); }
    finally { setWorking(null); }
  }
  return <section className="sparta-page">
    <header className="sparta-page-header"><div><h1>Rekonsiliasi Gempa</h1><p>Tinjau laporan manual yang belum memiliki identitas kejadian canonical. Tidak ada kandidat ambigu yang ditautkan otomatis.</p></div><span className="sparta-count">{items.length} terbuka</span></header>
    {loading ? <div className="sparta-empty" role="status"><Loader2 className="animate-spin" />Memuat kasus…</div>
    : items.length === 0 ? <div className="sparta-empty"><Check /><strong>Semua kasus sudah ditinjau</strong><span>Tidak ada rekonsiliasi yang menunggu keputusan.</span></div>
    : <div className="sparta-table-wrap"><table className="sparta-table"><thead><tr><th>Laporan</th><th>Kandidat event</th><th>Alasan</th><th>Tindakan</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
      <td><strong>{item.current_location_name || item.incident_id}</strong><small>{item.incident_id}<br />Saat ini: {item.current_canonical_event_id || "Belum terhubung"}</small></td>
      <td><strong>{item.candidate_canonical_event_id || "Kandidat tidak lengkap"}</strong><small>{item.event_location || "Lokasi event tidak tersedia"}<br />M {item.magnitude || "—"} · {item.candidate_location_kind} {item.candidate_location_id}</small></td>
      <td><span className="sparta-badge warning">{item.reason}</span></td>
      <td><div className="flex gap-2"><button className="sparta-button primary" disabled={working === item.id || !item.candidate_canonical_event_id} onClick={() => decide(item, "LINK")}><Link2 />Tautkan</button><button className="sparta-button" disabled={working === item.id} onClick={() => decide(item, "DISMISS")}><SearchX />Abaikan</button></div></td>
    </tr>)}</tbody></table></div>}
  </section>;
}
