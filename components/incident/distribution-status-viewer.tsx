"use client";

import React, { useEffect, useState } from "react";
import { Mail, MessageCircle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { DistributionRecord } from "@/lib/distribution-service";

export function DistributionStatusViewer({ reportId }: { reportId: string }) {
  const [logs, setLogs] = useState<DistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/incidents/${reportId}/distributions`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setLogs(data.data);
      })
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) return <div className="text-xs text-slate-400">Loading distribution logs...</div>;
  if (logs.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
      <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Status Pengiriman Laporan</h4>
      <div className="space-y-3">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            {log.channel === "email" ? (
              <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
            ) : (
              <MessageCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 capitalize">{log.channel}</span>
                <span className="text-[10px] text-slate-500">
                  {new Date(log.attemptedAt).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-[10px] text-slate-600 mb-1">To: {log.recipient}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {log.status === "sent" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Terkirim
                  </span>
                ) : log.status === "queued_no_provider" || log.status === "not_configured" ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[9px] font-bold">
                    <Clock className="w-3 h-3" /> Provider Belum Dikonfigurasi
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-[9px] font-bold">
                    <AlertCircle className="w-3 h-3" /> Gagal
                  </span>
                )}
              </div>
              {log.errorMessage && (
                <p className="text-[9px] text-red-600 mt-1 italic">{log.errorMessage}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
