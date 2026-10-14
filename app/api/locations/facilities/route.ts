import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "bms") return NextResponse.json({ data: [] });

  const url = new URL(request.url);
  const values: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
  if (user.systemRole !== "ADMIN" && user.scope !== "HO") {
    where.push(`branch_id = ${add(user.branch)}`);
  }
  const type = url.searchParams.get("type");
  const branch = url.searchParams.get("branch");
  const status = url.searchParams.get("status");
  const mapping = url.searchParams.get("mapping");
  if (type) where.push(`facility_type = ${add(type)}`);
  if (branch && (user.systemRole === "ADMIN" || user.scope === "HO")) where.push(`branch_id = ${add(branch)}`);
  if (status) where.push(`operational_status = ${add(status)}`);
  if (mapping === "mapped") where.push("branch_id IS NOT NULL AND mapping_verified_at IS NOT NULL");
  if (mapping === "unmapped") where.push("(branch_id IS NULL OR mapping_verified_at IS NULL)");
  const north = Number(url.searchParams.get("north"));
  const south = Number(url.searchParams.get("south"));
  const east = Number(url.searchParams.get("east"));
  const west = Number(url.searchParams.get("west"));
  if ([north, south, east, west].every(Number.isFinite)) {
    where.push(`latitude BETWEEN ${add(south)} AND ${add(north)}`);
    where.push(`longitude BETWEEN ${add(west)} AND ${add(east)}`);
  }
  const { rows } = await getDbPool().query(
    `SELECT id::text, code, name, facility_type, latitude, longitude,
            branch_id, operational_status, auto_report_enabled,
            mapping_verified_at
       FROM facilities ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY facility_type, code`,
    values
  );
  return NextResponse.json({ data: rows });
}
