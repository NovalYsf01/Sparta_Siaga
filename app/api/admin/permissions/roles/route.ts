import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  ROLE_PERMISSION_CATALOG,
  getRolePermissions,
} from "@/lib/permission-service";
import { CANONICAL_HUMAN_ROLES } from "@/lib/role-catalog";

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
      CANONICAL_HUMAN_ROLES.map(async (role) => {
        const permissions = await getRolePermissions(role.key);
        const catalog = ROLE_PERMISSION_CATALOG[role.key] || [];
        return {
          key: role.key,
          label: role.label,
          fullLabel: role.fullLabel,
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
