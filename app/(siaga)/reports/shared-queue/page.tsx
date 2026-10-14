"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, History, Loader2, UserRoundCheck, X } from "lucide-react";
import { toast } from "sonner";

type QueueItem = { id: string; location_kind: "STORE" | "FACILITY" | null; location_name: string; branch: string; status: string; primary_pic_user_id: string | null; waiting_seconds: string };
type PicDetails = { id: string; primary_pic_user_id: string | null; primary_pic_name: string | null; eligibleUsers: Array<{ id: string; name: string; business_role: string }>; history: Array<{ id: string; action: string; actor_name: string | null; from_user_name: string | null; to_user_name: string | null; reason: string | null; created_at: string }> };

function waitingLabel(seconds: string) {
  const hours = Math.floor(Number(seconds) / 3600);
  if (hours >= 24) return `${Math.floor(hours / 24)} hari`;
  return hours > 0 ? `${hours} jam` : `${Math.max(1, Math.floor(Number(seconds) / 60))} menit`;
}

export default function SharedQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [details, setDetails] = useState<PicDetails | null>(null);
  const [nextUserId, setNextUserId] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/incidents/shared-queue", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal memuat Shared Queue");
      setItems(payload.data);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Gagal memuat Shared Queue"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function loadDetails(item: QueueItem) {
    setSelected(item); setDetails(null); setNextUserId(""); setReason("");
    try {
      const response = await fetch(`/api/incidents/${item.id}/pic`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal memuat PIC");
      setDetails(payload.data);
    } catch (detailError) { toast.error(detailError instanceof Error ? detailError.message : "Gagal memuat PIC"); }
  }

  async function mutate(id: string, method: "POST" | "PATCH" | "DELETE", body?: object) {
    setWorking(id);
    try {
      const response = await fetch(`/api/incidents/${id}/pic`, {
        method, headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(response.status === 409 && method === "POST" ? "Laporan sudah diambil petugas lain" : payload.error);
      toast.success(method === "POST" ? "Anda menjadi PIC utama laporan" : method === "PATCH" ? "PIC berhasil dipindahkan" : "PIC berhasil dilepas");
      await load();
      if (selected) await loadDetails({ ...selected, primary_pic_user_id: method === "DELETE" ? null : payload.data?.currentPicUserId || selected.primary_pic_user_id });
    } catch (mutationError) { toast.error(mutationError instanceof Error ? mutationError.message : "Perubahan PIC gagal"); }
    finally { setWorking(null); }
  }

  return <section className="sparta-page">
    <header className="sparta-page-header"><div><h1>Shared Queue</h1><p>Laporan aktif sesuai scope cabang, diurutkan dari waktu tunggu terlama.</p></div><span className="sparta-count">{items.length} laporan</span></header>
    {loading ? <div className="sparta-empty" role="status"><Loader2 className="animate-spin" />Memuat antrean…</div>
    : error ? <div className="sparta-empty" role="alert"><strong>{error}</strong><button onClick={load} className="sparta-button">Coba lagi</button></div>
    : items.length === 0 ? <div className="sparta-empty"><UserRoundCheck /><strong>Tidak ada laporan dalam antrean</strong></div>
    : <div className="sparta-table-wrap"><table className="sparta-table"><thead><tr><th>Lokasi</th><th>Status</th><th>Waktu tunggu</th><th>PIC</th><th>Tindakan</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
      <td><strong>{item.location_name}</strong><small>{item.id}<br />{item.branch} · {item.location_kind === "FACILITY" ? "Fasilitas" : "Toko"}</small></td>
      <td><span className="sparta-badge">{item.status}</span></td><td><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{waitingLabel(item.waiting_seconds)}</span></td>
      <td>{item.primary_pic_user_id ? "Sudah ditetapkan" : "Belum ada"}</td><td><div className="flex gap-2">{!item.primary_pic_user_id && <button onClick={() => mutate(item.id, "POST")} disabled={working === item.id} className="sparta-button primary">Ambil sebagai PIC</button>}<button onClick={() => loadDetails(item)} className="sparta-button"><History />Kelola PIC</button></div></td>
    </tr>)}</tbody></table></div>}

    {selected && <div className="fixed inset-0 z-[900] flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="pic-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-w-xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 id="pic-title" className="font-bold">Kelola PIC</h2><p className="text-xs text-slate-500">{selected.location_name} · {selected.id}</p></div><button className="touch-target-min grid place-items-center rounded-lg hover:bg-slate-100" onClick={() => setSelected(null)} aria-label="Tutup"><X className="h-5 w-5" /></button></header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {!details ? <div className="flex min-h-32 items-center justify-center"><Loader2 className="animate-spin" /></div> : <>
            <section><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">PIC saat ini</p><p className="mt-1 font-bold">{details.primary_pic_name || "Belum ditetapkan"}</p></section>
            {details.primary_pic_user_id && <section className="space-y-3 rounded-lg border border-slate-200 p-3"><label className="block text-xs font-semibold">Pindahkan ke<select value={nextUserId} onChange={(event) => setNextUserId(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Pilih petugas yang sesuai</option>{details.eligibleUsers.filter((user) => user.id !== details.primary_pic_user_id).map((user) => <option key={user.id} value={user.id}>{user.name} ({user.business_role.toUpperCase()})</option>)}</select></label><label className="block text-xs font-semibold">Alasan<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="Alasan transfer atau release" /></label><div className="grid grid-cols-2 gap-2"><button className="sparta-button primary" disabled={!nextUserId || working === selected.id} onClick={() => mutate(selected.id, "PATCH", { nextUserId, reason })}>Transfer PIC</button><button className="sparta-button" disabled={working === selected.id} onClick={() => mutate(selected.id, "DELETE", { reason })}>Release PIC</button></div></section>}
            <section><h3 className="text-sm font-bold">Riwayat PIC</h3><div className="mt-2 space-y-2">{details.history.length === 0 ? <p className="text-sm text-slate-500">Belum ada aktivitas PIC.</p> : details.history.map((entry) => <div key={entry.id} className="border-l-2 border-blue-600 pl-3 text-xs"><strong>{entry.action}</strong><p className="mt-0.5 text-slate-600">{entry.from_user_name || "—"} → {entry.to_user_name || "—"}</p><p className="text-slate-500">oleh {entry.actor_name || "User"} · {new Date(entry.created_at).toLocaleString("id-ID")}</p>{entry.reason && <p className="mt-1 text-slate-600">{entry.reason}</p>}</div>)}</div></section>
          </>}
        </div>
      </div>
    </div>}
  </section>;
}
