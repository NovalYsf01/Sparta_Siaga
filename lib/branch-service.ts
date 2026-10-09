import "server-only";
import { getDbPool } from "./db";
import { CANONICAL_BRANCH_LIST, CanonicalBranchRecord } from "./branch-utils";

let cachedBranchCounts: Map<string, number> | null = null;
let lastCountsFetch = 0;
const COUNTS_TTL = 300_000; // 5 minutes cache

/**
 * Gets all canonical branches, enriched with live store counts from database when available.
 */
export async function getCanonicalBranches(): Promise<CanonicalBranchRecord[]> {
  const now = Date.now();
  if (!cachedBranchCounts || now - lastCountsFetch > COUNTS_TTL) {
    try {
      const pool = getDbPool();
      const res = await pool.query(`
        SELECT UPPER(cabang) as cabang_code, COUNT(*)::int as store_count
        FROM stores
        GROUP BY UPPER(cabang)
      `);
      const countsMap = new Map<string, number>();
      for (const row of res.rows) {
        countsMap.set(row.cabang_code, row.store_count);
      }
      cachedBranchCounts = countsMap;
      lastCountsFetch = now;
    } catch {
      // Fallback if query fails
    }
  }

  return CANONICAL_BRANCH_LIST.map((b) => ({
    ...b,
    storeCount: cachedBranchCounts?.get(b.code) || undefined,
  }));
}

/**
 * Search canonical branches by query string (matching code, name, or alias).
 */
export async function searchCanonicalBranches(query: string): Promise<CanonicalBranchRecord[]> {
  const all = await getCanonicalBranches();
  const q = query.trim().toUpperCase();
  if (!q) return all;

  return all.filter((b) => {
    if (b.code.includes(q)) return true;
    if (b.name.toUpperCase().includes(q)) return true;
    return b.aliases.some((a) => a.toUpperCase().includes(q));
  });
}
