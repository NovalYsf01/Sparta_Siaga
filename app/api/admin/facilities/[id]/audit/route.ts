import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.systemRole !== "ADMIN" && user.scope !== "HO") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const { rows } = await getDbPool().query(
    `SELECT action, changed_fields, actor_user_id, created_at FROM facility_audit_logs
      WHERE facility_id = $1 ORDER BY created_at DESC`, [id]
  );
  return NextResponse.json({ data: rows });
}
