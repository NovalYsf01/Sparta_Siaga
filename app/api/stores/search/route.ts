import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "40", 10), 100);

  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canSearchAllStores = sessionUser.systemRole === "ADMIN" || sessionUser.scope === "HO";
    const pool = getDbPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (q.trim()) {
      conditions.push(
        `(nama_toko ILIKE $${paramIndex} OR kode_toko ILIKE $${paramIndex} OR alamat ILIKE $${paramIndex})`
      );
      values.push(`%${q.trim()}%`);
      paramIndex++;
    }

    // Server-side enforcement of branch scope
    if (!canSearchAllStores) {
      conditions.push(`cabang = $${paramIndex}`);
      values.push(sessionUser.branch);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT id, kode_toko, nama_toko, cabang, alamat, latitude, longitude, fr_type, branch_emergency_contact
      FROM stores
      ${whereClause}
      ORDER BY nama_toko ASC
      LIMIT $${paramIndex};
    `;
    values.push(limit);

    const res = await pool.query(query, values);

    return NextResponse.json({
      data: res.rows,
      count: res.rowCount,
      source: "aiven-postgresql",
    });
  } catch (error: any) {
    console.error("[Search API] Error searching Aiven PostgreSQL:", error);
    return NextResponse.json(
      { error: "Gagal mencari data toko di database", details: error?.message },
      { status: 500 }
    );
  }
}
