import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  PermissionKey,
  PermissionEffect,
  ROLE_PERMISSION_CATALOG,
  getRolePermissions,
  updateRolePermissions,
} from "@/lib/permission-service";

type RouteContext = { params: Promise<{ role: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat mengakses permission role." },
        { status: 403 }
      );
    }

    const { role } = await params;
    const catalog = ROLE_PERMISSION_CATALOG[role.toLowerCase()] || [];
    const permissions = await getRolePermissions(role);

    const pool = getDbPool();
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM users WHERE business_role = $1`,
      [role]
    );
    const userCount = countRes.rows[0]?.count || 0;

    return NextResponse.json({
      data: {
        role,
        userCount,
        catalog,
        permissions,
        definitions: PERMISSION_DEFINITIONS.filter((d) => catalog.includes(d.key)),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/permissions/roles/:role]", err);
    return NextResponse.json(
      { error: "Gagal memuat permission role" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat mengubah permission role." },
        { status: 403 }
      );
    }

    const { role } = await params;
    const body = await request.json();
    const { permissions } = body as {
      permissions: Partial<Record<PermissionKey, PermissionEffect>>;
    };

    if (!permissions || typeof permissions !== "object") {
      return NextResponse.json(
        { error: "Format request tidak valid: field 'permissions' harus berupa object." },
        { status: 400 }
      );
    }

    // Validate that ADMIN is never manipulated as a business role
    if (role.toLowerCase() === "admin") {
      return NextResponse.json(
        { error: "System Admin bukan business role dan tidak dapat diubah melalui role permissions." },
        { status: 400 }
      );
    }

    const catalog = ROLE_PERMISSION_CATALOG[role.toLowerCase()];
    if (!catalog) {
      return NextResponse.json(
        { error: `Role '${role}' tidak ditemukan dalam katalog role.` },
        { status: 404 }
      );
    }

    // Section 11: Backend Security - Admin hanya dapat mengubah permission yang terdapat dalam katalog role tersebut
    for (const permKey of Object.keys(permissions)) {
      if (!catalog.includes(permKey as PermissionKey)) {
        return NextResponse.json(
          {
            error: `Permission '${permKey}' bukan merupakan hak bawaan dari role '${role}'. Hak tambahan di luar role harus diberikan melalui Akses Khusus User.`,
          },
          { status: 400 }
        );
      }
    }

    await updateRolePermissions(role, permissions, {
      id: sessionUser.id,
      name: sessionUser.name,
    });

    const updatedPermissions = await getRolePermissions(role);

    return NextResponse.json({
      message: `Permission untuk role ${role} berhasil diperbarui.`,
      data: {
        role,
        catalog,
        permissions: updatedPermissions,
      },
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/permissions/roles/:role]", err);
    return NextResponse.json(
      { error: err.message || "Gagal memperbarui permission role" },
      { status: 500 }
    );
  }
}
