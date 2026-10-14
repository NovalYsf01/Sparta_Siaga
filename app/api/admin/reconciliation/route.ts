import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { decideReconciliation, listReconciliationCases } from "@/lib/reconciliation-service";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.systemRole !== "ADMIN" && user.scope !== "HO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const status = new URL(request.url).searchParams.get("status") || "OPEN";
  return NextResponse.json({ data: await listReconciliationCases(status) });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.systemRole !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    if (!body.caseId || !["LINK", "DISMISS"].includes(body.action)) {
      return NextResponse.json({ error: "Keputusan rekonsiliasi tidak valid" }, { status: 400 });
    }
    const data = await decideReconciliation({
      caseId: body.caseId, action: body.action, actorUserId: user.id, notes: body.notes,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan keputusan";
    const status = message.includes("NOT_FOUND") ? 404 : message.includes("ALREADY") || message.includes("LINKED") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
