import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { changeIncidentPic, claimIncidentPic, getIncidentPicDetails } from "@/lib/incident-assignment";

function canManage(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return user?.systemRole === "ADMIN" || user?.role === "bm" || (user as { businessRole?: string })?.businessRole === "bm";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const data = await getIncidentPicDetails(id, user.systemRole === "ADMIN" || user.scope === "HO" ? undefined : user.branch);
  if (!data) return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.scope === "HO" && user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "HO hanya memiliki akses baca" }, { status: 403 });
  }
  if (user.systemRole !== "ADMIN" && !["bms", "bes"].includes(user.role || "")) {
    return NextResponse.json({ error: "Role tidak berwenang mengambil PIC" }, { status: 403 });
  }
  const { id } = await context.params;
  const result = await claimIncidentPic({
    incidentId: id,
    userId: user.id,
    branch: user.branch,
    systemRole: user.systemRole,
  });
  return NextResponse.json(result, { status: result.claimed ? 200 : 409 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(user)) return NextResponse.json({ error: "Hanya BMM/Admin yang dapat memindahkan PIC" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json();
  if (!body.nextUserId) return NextResponse.json({ error: "PIC tujuan wajib diisi" }, { status: 400 });
  try {
    const data = await changeIncidentPic({ incidentId: id, actorUserId: user.id, nextUserId: body.nextUserId,
      branch: user.branch, systemRole: user.systemRole, reason: body.reason });
    return NextResponse.json({ data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Transfer gagal" }, { status: 409 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const details = await getIncidentPicDetails(id, user.systemRole === "ADMIN" || user.scope === "HO" ? undefined : user.branch);
  if (!details) return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  if (!canManage(user) && details.primary_pic_user_id !== user.id) {
    return NextResponse.json({ error: "Hanya PIC aktif atau BMM/Admin yang dapat melepas PIC" }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const data = await changeIncidentPic({ incidentId: id, actorUserId: user.id, nextUserId: null,
      branch: user.branch, systemRole: user.systemRole, reason: body.reason });
    return NextResponse.json({ data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Release gagal" }, { status: 409 }); }
}
