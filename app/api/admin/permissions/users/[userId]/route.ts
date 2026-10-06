import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  PermissionKey,
  PermissionEffect,
  ScopeType,
  getRolePermissions,
  getUserOverrides,
  createUserOverride,
} from "@/lib/permission-service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat mengakses override user." },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const pool = getDbPool();

    // 1. Fetch User Info
    const userRes = await pool.query(
      `SELECT id, nik, name, email, system_role, business_role, scope, branch, status
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    const targetUser = userRes.rows[0];

    // 2. Role Inherited Permissions
    let inheritedPermissions: Record<PermissionKey, PermissionEffect> | null = null;
    if (targetUser.business_role) {
      inheritedPermissions = await getRolePermissions(targetUser.business_role);
    }

    // 3. User Overrides
    const overrides = await getUserOverrides(userId);

    // 4. Audit Trail for this user
    const auditRes = await pool.query(
      `SELECT id, actor_name, action, permission_key, effect, scope_type, branch_code, reason, expires_at, created_at
       FROM permission_audit_logs
       WHERE target_user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    return NextResponse.json({
      data: {
        user: {
          id: targetUser.id,
          nik: targetUser.nik,
          name: targetUser.name,
          email: targetUser.email,
          systemRole: targetUser.system_role,
          businessRole: targetUser.business_role,
          scope: targetUser.scope,
          branch: targetUser.branch,
          status: targetUser.status,
        },
        inheritedPermissions,
        overrides,
        auditLogs: auditRes.rows,
        definitions: PERMISSION_DEFINITIONS,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/permissions/users/:userId]", err);
    return NextResponse.json(
      { error: "Gagal memuat data permission user" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat memberikan override permission." },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const {
      permissionKey,
      effect,
      scopeType,
      branchCode,
      reason,
      startsAt,
      expiresAt,
    } = body as {
      permissionKey: PermissionKey;
      effect: PermissionEffect;
      scopeType: ScopeType;
      branchCode?: string | null;
      reason: string;
      startsAt?: string;
      expiresAt?: string | null;
    };

    // Validations
    if (!permissionKey || !PERMISSION_KEYS.includes(permissionKey)) {
      return NextResponse.json(
        { error: `Permission key '${permissionKey}' tidak valid.` },
        { status: 400 }
      );
    }

    if (effect !== "ALLOW" && effect !== "DENY") {
      return NextResponse.json(
        { error: "Effect harus berupa 'ALLOW' atau 'DENY'." },
        { status: 400 }
      );
    }

    if (!scopeType || !["OWN_SCOPE", "SPECIFIC_BRANCH", "ALL_BRANCHES"].includes(scopeType)) {
      return NextResponse.json(
        { error: "Scope type tidak valid. Pilih: OWN_SCOPE, SPECIFIC_BRANCH, atau ALL_BRANCHES." },
        { status: 400 }
      );
    }

    if (scopeType === "SPECIFIC_BRANCH" && (!branchCode || !branchCode.trim())) {
      return NextResponse.json(
        { error: "Kode cabang wajib diisi jika scope adalah SPECIFIC_BRANCH." },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Alasan (reason) wajib diisi untuk setiap user override." },
        { status: 400 }
      );
    }

    // Check user exists
    const pool = getDbPool();
    const userCheck = await pool.query(`SELECT id, system_role FROM users WHERE id = $1`, [userId]);
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: "User target tidak ditemukan." }, { status: 404 });
    }

    if (userCheck.rows[0].system_role === "ADMIN") {
      return NextResponse.json(
        { error: "Akun System Administrator tidak menggunakan Business Permission." },
        { status: 400 }
      );
    }

    const override = await createUserOverride({
      userId,
      permissionKey,
      effect,
      scopeType,
      branchCode: branchCode ? branchCode.trim() : null,
      reason: reason.trim(),
      startsAt,
      expiresAt,
      actor: { id: sessionUser.id, name: sessionUser.name },
    });

    return NextResponse.json({
      message: "User permission override berhasil ditambahkan.",
      data: override,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/permissions/users/:userId]", err);
    return NextResponse.json(
      { error: err.message || "Gagal membuat user permission override." },
      { status: 500 }
    );
  }
}
