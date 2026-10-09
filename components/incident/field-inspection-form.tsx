"use client";

import { useState } from "react";
import type { IncidentRecord } from "@/types/incident";
import { FieldPhotoUploader, type PhotoData } from "./field-photo-uploader";

const emptyPhoto: PhotoData = { file: null, previewUrl: null, source: null, reporterRelation: null, capturedAt: null };

export function FieldInspectionForm({ incident, onSuccess }: { incident: IncidentRecord; onSuccess: () => void }) {
  const [photo, setPhoto] = useState<PhotoData>(emptyPhoto);
  const [notes, setNotes] = useState("");
  const [exception, setException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!photo.file && (!exception || !exceptionReason.trim())) {
      setError("Lampirkan foto kondisi aktual atau jelaskan pengecualian darurat.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (photo.file) {
        const form = new FormData();
        form.set("file", photo.file);
        form.set("phase", incident.status === "clarification_required" ? "CLARIFICATION" : "INITIAL");
        form.set("caption", photo.caption?.trim() || "Kondisi aktual toko");
        form.set("origin", photo.source === "camera" ? "CAMERA_SELF" : photo.reporterRelation === "received" ? "GALLERY_THIRD_PARTY" : "GALLERY_SELF");
        if (photo.thirdPartySourceName) form.set("thirdPartySourceName", photo.thirdPartySourceName);
        if (photo.thirdPartySourceDescription) form.set("thirdPartySourceDescription", photo.thirdPartySourceDescription);
        const upload = await fetch(`/api/incidents/${encodeURIComponent(incident.id)}/evidence`, { method: "POST", body: form });
        if (!upload.ok) throw new Error((await upload.json()).error || "Foto gagal diunggah");
      }
      const response = await fetch(`/api/incidents/${encodeURIComponent(incident.id)}/inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationLevel: exception ? "PRELIMINARY_UNVERIFIED" : "FIELD_VERIFIED", conditionNotes: notes, emergencyExceptionReason: exception ? exceptionReason : null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Pemeriksaan gagal diajukan");
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pemeriksaan gagal diajukan");
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
    <div><h4 className="text-sm font-bold text-slate-900 dark:text-white">{incident.status === "clarification_required" ? "Lengkapi klarifikasi" : "Pemeriksaan kondisi lapangan"}</h4><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Catat kondisi aktual. Laporan ini belum menyatakan adanya kerusakan sampai Manager Branch mengonfirmasi.</p></div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Hasil pemeriksaan<textarea required value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" /></label>
    <FieldPhotoUploader label="Foto kondisi aktual" value={photo} onChange={setPhoto} storeName={incident.storeName} />
    <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={exception} onChange={(event) => setException(event.target.checked)} className="mt-1" />Foto tidak aman diperoleh saat ini (pengecualian darurat)</label>
    {exception ? <textarea required value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} rows={3} maxLength={1000} placeholder="Jelaskan risiko keselamatan yang mencegah pengambilan foto" className="w-full rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950" /> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <button disabled={submitting} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{submitting ? "Mengirim…" : "Ajukan ke Manager Branch"}</button>
  </form>;
}
