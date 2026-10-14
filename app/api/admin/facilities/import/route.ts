import path from "node:path";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import { applyFacilityImport, previewFacilityImport } from "@/lib/facility-db";
import { ExcelFacilitySource, parseFacilityRows } from "@/lib/facility-import";

async function buildPreview() {
  const source = new ExcelFacilitySource(path.resolve(process.cwd(), "data/KOORDINAT GUDANG.xlsx"));
  const parsed = parseFacilityRows(await source.readRows());
  return previewFacilityImport(getDbPool(), source, parsed);
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.systemRole !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await buildPreview();
  return NextResponse.json({ data: { ...data, records: undefined } });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.systemRole !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getDbPool().connect();
  try {
    const data = await buildPreview();
    const runId = await applyFacilityImport(client, data, user.id);
    return NextResponse.json({ data: { runId, total: data.total, changed: data.changedCount } });
  } finally { client.release(); }
}
