import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { getIncidentEvidenceFile } from "@/lib/incident-evidence-service";
type Context = { params: Promise<{ id: string; evidenceId: string }> };
export async function GET(_: Request, { params }: Context) {
  try { const actor = await getSessionUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id, evidenceId } = await params; const report = await dbGetIncidentById(id); if (!report) return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 }); const file = await getIncidentEvidenceFile(report, evidenceId, actor); if (!file) return NextResponse.json({ error: "Bukti tidak ditemukan" }, { status: 404 }); return new Response(new Uint8Array(file.buffer), { headers: { "Content-Type": file.mimeType, "Content-Disposition": `inline; filename="${file.fileName.replace(/["\r\n]/g, "_")}"`, "Cache-Control": "private, no-cache, no-store", "X-Content-Type-Options": "nosniff" } }); }
  catch (error) { const typed = error as Error & { status?: number; code?: string }; return NextResponse.json({ error: typed.message, code: typed.code }, { status: typed.status || 500 }); }
}
