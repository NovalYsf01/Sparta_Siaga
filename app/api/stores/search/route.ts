import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Known canonical branch alias mappings (e.g. testing codes / historical prefixes)
const BRANCH_CANONICAL_MAP: Record<string, string> = {
  G001: "CIKOKOL",
  G002: "BANDUNG",
  TE76: "CIKOKOL",
};

export function resolveBranchAliases(branchRaw?: string | null): string[] {
  if (!branchRaw) return [];
  const clean = branchRaw.trim();
  const upper = clean.toUpperCase();
  const unprefix = upper.replace(/^CABANG\s+/i, "").trim();

  const aliases = new Set<string>();
  aliases.add(upper);
  aliases.add(unprefix);

  if (BRANCH_CANONICAL_MAP[upper]) {
    aliases.add(BRANCH_CANONICAL_MAP[upper]);
  }
  if (BRANCH_CANONICAL_MAP[unprefix]) {
    aliases.add(BRANCH_CANONICAL_MAP[unprefix]);
  }

  return Array.from(aliases);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const typeParam = (searchParams.get("type") || "TOKO").trim().toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "40", 10), 100);

  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DC MODE: Database currently does not have a dedicated DC master table
    if (typeParam === "DC") {
      return NextResponse.json({
        data: [],
        count: 0,
        type: "DC",
        masterAvailable: false,
        message: "Master data Gudang / DC belum tersedia di database.",
      });
    }

    // TOKO MODE
    const canSearchAllStores = sessionUser.systemRole === "ADMIN" || sessionUser.scope === "HO";
    const pool = getDbPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (q.trim()) {
      conditions.push(
        `(nama_toko ILIKE $${paramIndex} OR kode_toko ILIKE $${paramIndex} OR alamat ILIKE $${paramIndex})`
      );
      values.push(`%${q.trim()}%`);
      paramIndex++;
    }

    // Server-side enforcement of branch scope with canonical aliases & case-insensitivity
    if (!canSearchAllStores) {
      const aliases = resolveBranchAliases(sessionUser.branch);
      if (aliases.length > 0) {
        conditions.push(`UPPER(cabang) = ANY($${paramIndex}::text[])`);
        values.push(aliases);
        paramIndex++;
      } else {
        // Fallback exact match if branch exists
        conditions.push(`cabang = $${paramIndex}`);
        values.push(sessionUser.branch || "");
        paramIndex++;
      }
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
      type: "TOKO",
      masterAvailable: true,
      source: "aiven-postgresql",
    });
  } catch (error: unknown) {
    console.error("[Search API] Error searching Aiven PostgreSQL:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Gagal mencari data toko di database", details: message },
      { status: 500 }
    );
  }
}
