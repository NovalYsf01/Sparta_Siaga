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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    const canViewAllBranches = sessionUser.systemRole === "ADMIN" || sessionUser.scope === "HO";
    
    // Server-side branch enforcement
    const targetBranch = canViewAllBranches 
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

    // Exclude test fixture namespace from normal runtime history
    conditions.push("id NOT LIKE 'INC-TEST-%'");

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
    
    // Count total rows for pagination
    const countQuery = `SELECT COUNT(*) FROM incidents ${whereClause}`;
    const countRes = await pool.query(countQuery, values);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    // Fetch paginated data
    const dataQuery = `
      SELECT * FROM incidents 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataValues = [...values, limit, offset];
    
    const { rows } = await pool.query(dataQuery, dataValues);

    return NextResponse.json({
      data: rows, // Note: For a robust app, we'd map this using rowToIncident, but the frontend can handle raw DB fields or we map it here
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: any) {
    console.error("[GET /api/incidents/history] Error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
