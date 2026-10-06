import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const clientBranch = searchParams.get("branch");
    const disasterType = searchParams.get("disasterType");
    const reportOrigin = searchParams.get("reportOrigin");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const canExportAllBranches = sessionUser.systemRole === "ADMIN" || sessionUser.scope === "HO";
    
    // Server-side branch enforcement
    const targetBranch = canExportAllBranches 
      ? (clientBranch && clientBranch !== "all" ? clientBranch : null)
      : sessionUser.branch;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (targetBranch) {
      conditions.push(`branch = $${paramIndex++}`);
      values.push(targetBranch);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(`${startDate} 00:00:00+07`);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(`${endDate} 23:59:59+07`);
    }

    if (disasterType && disasterType !== "all") {
      conditions.push(`disaster_type = $${paramIndex++}`);
      values.push(disasterType);
    }

    if (reportOrigin && reportOrigin !== "all") {
      conditions.push(`report_origin = $${paramIndex++}`);
      values.push(reportOrigin);
    }

    // ENFORCE HISTORY STATUSES
    if (status && status !== "all") {
      // If user passes a specific status, ensure it's a history status
      if (status === "resolved" || status === "archived") {
        conditions.push(`status = $${paramIndex++}`);
        values.push(status);
      } else {
        // If they ask for non-history status in history API, return nothing
        conditions.push(`status = $${paramIndex++}`);
        values.push("invalid_status_for_history");
      }
    } else {
      // Default: only show resolved and archived
      conditions.push(`status IN ($${paramIndex++}, $${paramIndex++})`);
      values.push("resolved", "archived");
    }

    if (search && search.trim() !== "") {
      conditions.push(`(
        id ILIKE $${paramIndex} OR 
        store_name ILIKE $${paramIndex} OR 
        branch ILIKE $${paramIndex} OR 
        location_city ILIKE $${paramIndex} OR
        maintenance_ticket->>'ticketId' ILIKE $${paramIndex}
      )`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const pool = getDbPool();
    const dataQuery = `
      SELECT id, date, disaster_type, report_origin, status, branch, store_name, location_city, progress, created_at, closed_at 
      FROM incidents 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT 5000 -- Hard limit for export safety
    `;
    
    const { rows } = await pool.query(dataQuery, values);

    // Generate CSV for Excel Indonesia (UTF-8 BOM + Semicolon)
    const bom = "\uFEFF";
    const headers = ["ID Laporan", "Tanggal Dibuat", "Cabang", "Toko", "Kota", "Jenis Kejadian", "Asal Laporan", "Status", "Progress", "Tanggal Selesai"];
    const csvRows = [headers.map(h => `"${h}"`).join(";")];

    for (const row of rows) {
      csvRows.push([
        `"${row.id}"`,
        `"${row.created_at}"`,
        `"${row.branch}"`,
        `"${row.store_name}"`,
        `"${row.location_city}"`,
        `"${row.disaster_type}"`,
        `"${row.report_origin}"`,
        `"${row.status}"`,
        `"${row.progress}"`,
        row.closed_at ? `"${row.closed_at}"` : `""`
      ].join(";"));
    }

    const csvContent = bom + csvRows.join("\n");
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sparta_siaga_export_${Date.now()}.csv"`,
      }
    });

  } catch (error: any) {
    console.error("[GET /api/incidents/export] Error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
