import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetIncidentById } from "@/lib/incident-db";
import { listIncidentEvidence, saveIncidentEvidence } from "@/lib/incident-evidence-service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Context) {
  try { const actor = await getSessionUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const report = await dbGetIncidentById(id); if (!report) return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 }); return NextResponse.json({ data: await listIncidentEvidence(report, actor) }); }
  catch (error) { const typed = error as Error & { status?: number; code?: string }; return NextResponse.json({ error: typed.message, code: typed.code }, { status: typed.status || 500 }); }
}
export async function POST(request: Request, { params }: Context) {
  try { const actor = await getSessionUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const report = await dbGetIncidentById(id); if (!report) return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 }); const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ error: "Foto wajib diisi" }, { status: 400 }); const data = await saveIncidentEvidence({ report, phase: String(form.get("phase") || "INITIAL") as "INITIAL" | "CLARIFICATION" | "FOLLOW_UP", buffer: Buffer.from(await file.arrayBuffer()), originalFilename: file.name, caption: String(form.get("caption") || ""), origin: String(form.get("origin") || "") as "CAMERA_SELF" | "GALLERY_SELF" | "GALLERY_THIRD_PARTY", thirdPartySourceName: String(form.get("thirdPartySourceName") || "") || null, thirdPartySourceDescription: String(form.get("thirdPartySourceDescription") || "") || null }, actor); return NextResponse.json({ data }, { status: 201 }); }
  catch (error) { const typed = error as Error & { status?: number; code?: string }; return NextResponse.json({ error: typed.message, code: typed.code }, { status: typed.status || 500 }); }
}
