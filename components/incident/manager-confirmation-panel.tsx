"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, MessageSquareWarning } from "lucide-react";
import type { IncidentRecord } from "@/types/incident";

const decisions = [
  { value: "DAMAGE_CONFIRMED", label: "Ada Kerusakan", icon: AlertTriangle },
  { value: "NO_DAMAGE_CONFIRMED", label: "Tidak Ada Kerusakan", icon: CheckCircle2 },
  { value: "CLARIFICATION_REQUIRED", label: "Perlu Klarifikasi", icon: MessageSquareWarning },
] as const;

export function ManagerConfirmationPanel({ incident, onSuccess }: { incident: IncidentRecord; onSuccess: () => void }) {
  const [decision, setDecision] = useState<(typeof decisions)[number]["value"] | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!decision) return;
    if (decision === "CLARIFICATION_REQUIRED" && !reason.trim()) {
      setError("Tuliskan alasan klarifikasi agar Tim Toko mengetahui yang harus diperbaiki.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/incidents/${encodeURIComponent(incident.id)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionVersion: incident.latestInspectionVersion, decision, reason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Keputusan tidak dapat disimpan");
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Keputusan tidak dapat disimpan");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Keputusan Manager Branch</h4>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tinjau bukti kondisi lapangan sebelum menetapkan keputusan resmi.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">{decisions.map((option) => {
      const Icon = option.icon;
      return <button key={option.value} type="button" aria-pressed={decision === option.value} onClick={() => setDecision(option.value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${decision === option.value ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"}`}><Icon className="h-4 w-4" />{option.label}</button>;
    })}</div>
    <label className="mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">Catatan keputusan
      <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900" placeholder={decision === "CLARIFICATION_REQUIRED" ? "Jelaskan bukti atau informasi yang perlu dilengkapi" : "Catatan peninjauan (opsional)"} />
    </label>
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    <button type="button" onClick={submit} disabled={!decision || submitting} className="mt-3 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Menyimpan…" : "Simpan keputusan resmi"}</button>
  </section>;
}
