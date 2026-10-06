import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  ROLE_PERMISSION_CATALOG,
  getRolePermissions,
} from "@/lib/permission-service";

export const BUSINESS_ROLES = [
  { key: "ho_admin", label: "HO Admin", scope: "HO" },
  { key: "gm_ho", label: "GM HO", scope: "HO" },
  { key: "sm_ho", label: "SM HO", scope: "HO" },
  { key: "bm", label: "Branch Manager", scope: "BRANCH" },
  { key: "tim_toko", label: "Tim Toko", scope: "BRANCH" },
  { key: "sparta_maintenance", label: "Sparta Maintenance", scope: "BRANCH" },
  { key: "bms", label: "Branch Maintenance Support (BMS)", scope: "BRANCH" },
  { key: "bmc", label: "Branch Maintenance Coordinator (BMC)", scope: "BRANCH" },
  { key: "bbc", label: "Branch Building Coordinator (BBC)", scope: "BRANCH" },
  { key: "bnm", label: "Branch & Maintenance (BnM)", scope: "BRANCH" },
];

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat mengakses manajemen permission." },
        { status: 403 }
      );
    }

    const pool = getDbPool();
    // Count active users per business role
    const countRes = await pool.query(
      `SELECT business_role, COUNT(*)::int as count 
       FROM users 
       WHERE business_role IS NOT NULL 
       GROUP BY business_role`
    );

    const counts: Record<string, number> = {};
    for (const r of countRes.rows) {
      counts[r.business_role] = r.count;
    }

    const rolesData = await Promise.all(
      BUSINESS_ROLES.map(async (role) => {
        const permissions = await getRolePermissions(role.key);
        const catalog = ROLE_PERMISSION_CATALOG[role.key] || [];
        return {
          key: role.key,
          label: role.label,
          scope: role.scope,
          userCount: counts[role.key] || 0,
          catalog,
          permissions,
        };
      })
    );

    return NextResponse.json({
      data: {
        roles: rolesData,
        definitions: PERMISSION_DEFINITIONS,
        permissionKeys: PERMISSION_KEYS,
        roleCatalog: ROLE_PERMISSION_CATALOG,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/permissions/roles]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar permission role" },
      { status: 500 }
    );
  }
}
