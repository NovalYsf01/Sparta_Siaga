import { getDbPool } from "./db";
import { UserContext } from "./report-permissions";
import { IncidentRecord } from "@/types/incident";

export * from "@/types/permission";
import {
  PERMISSION_KEYS,
  PermissionKey,
  PermissionEffect,
  ScopeType,
  ROLE_PERMISSION_CATALOG,
  isPermissionInRoleCatalog,
  DEFAULT_ROLE_PERMISSIONS,
  UserPermissionOverrideRecord,
  PermissionAuditLogRecord,
  isOperationalPermission,
  isMonitoringPermission,
  getPermissionScopeRule,
  evaluateOverridePolicyCompliance,
} from "@/types/permission";

// In-memory cache for role permissions to prevent excessive DB queries
let rolePermissionsCache: { [role: string]: Partial<Record<PermissionKey, PermissionEffect>> } | null = null;
let rolePermissionsCacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export function invalidateRolePermissionsCache() {
  rolePermissionsCache = null;
  rolePermissionsCacheTimestamp = 0;
}

// ============================================================
// 3. ROLE PERMISSION DATA ACCESS
// ============================================================

export async function getRolePermissions(role: string): Promise<Record<PermissionKey, PermissionEffect>> {
  const now = Date.now();
  if (rolePermissionsCache && now - rolePermissionsCacheTimestamp < CACHE_TTL_MS) {
    if (rolePermissionsCache[role]) {
      return fillRoleDefaults(role, rolePermissionsCache[role]);
    }
  }

  const pool = getDbPool();
  try {
    const res = await pool.query(
      `SELECT business_role, permission_key, effect FROM role_permissions`
    );

    const newCache: { [r: string]: Partial<Record<PermissionKey, PermissionEffect>> } = {};
    for (const row of res.rows) {
      if (!newCache[row.business_role]) {
        newCache[row.business_role] = {};
      }
      newCache[row.business_role][row.permission_key as PermissionKey] = row.effect as PermissionEffect;
    }

    rolePermissionsCache = newCache;
    rolePermissionsCacheTimestamp = now;

    return fillRoleDefaults(role, newCache[role] || {});
  } catch (err) {
    console.error("[PermissionService] Failed to load role_permissions from DB, using defaults:", err);
    return fillRoleDefaults(role, DEFAULT_ROLE_PERMISSIONS[role] || {});
  }
}

function fillRoleDefaults(role: string, current: Partial<Record<PermissionKey, PermissionEffect>>): Record<PermissionKey, PermissionEffect> {
  const catalog = ROLE_PERMISSION_CATALOG[role.toLowerCase()] || [];
  const defaults = DEFAULT_ROLE_PERMISSIONS[role.toLowerCase()] || {};
  const result: any = {};
  for (const key of PERMISSION_KEYS) {
    if (catalog.includes(key)) {
      result[key] = current[key] || defaults[key] || "ALLOW";
    } else {
      result[key] = "DENY";
    }
  }
  return result;
}

export async function updateRolePermissions(
  role: string,
  permissions: Partial<Record<PermissionKey, PermissionEffect>>,
  actor: { id: string; name: string }
): Promise<void> {
  const catalog = ROLE_PERMISSION_CATALOG[role.toLowerCase()];
  if (!catalog) {
    throw new Error(`Role '${role}' tidak ditemukan dalam katalog role.`);
  }

  // Section 11: Backend Security - Admin hanya dapat mengubah permission dalam ROLE_PERMISSION_CATALOG
  for (const key of Object.keys(permissions)) {
    if (!catalog.includes(key as PermissionKey)) {
      throw new Error(
        `Permission '${key}' bukan merupakan hak bawaan dari role '${role}'. Hak tambahan di luar role harus diberikan melalui Akses Khusus User.`
      );
    }
  }

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [key, effect] of Object.entries(permissions)) {
      const permKey = key as PermissionKey;
      const permEffect = effect as PermissionEffect;
      const id = `perm_${role}_${permKey.toLowerCase()}`;

      await client.query(
        `INSERT INTO role_permissions (id, business_role, permission_key, effect, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (business_role, permission_key) DO UPDATE SET
           effect = EXCLUDED.effect,
           updated_at = NOW()`,
        [id, role, permKey, permEffect]
      );

      // Audit Log
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await client.query(
        `INSERT INTO permission_audit_logs (
           id, actor_user_id, actor_name, action, target_role,
           permission_key, effect, created_at
         ) VALUES ($1, $2, $3, 'ROLE_PERMISSION_UPDATED', $4, $5, $6, NOW())`,
        [auditId, actor.id, actor.name, role, permKey, permEffect]
      );
    }

    await client.query("COMMIT");
    invalidateRolePermissionsCache();
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Clean up existing database rows in role_permissions that do not belong to role catalogs.
 * Preserves audit logs while keeping role_permissions pristine.
 */
export async function cleanupNonCatalogRolePermissions(): Promise<number> {
  const pool = getDbPool();
  let deletedTotal = 0;
  for (const [role, catalogKeys] of Object.entries(ROLE_PERMISSION_CATALOG)) {
    const res = await pool.query(
      `DELETE FROM role_permissions
       WHERE business_role = $1
       AND permission_key != ALL($2::text[])`,
      [role, catalogKeys]
    );
    deletedTotal += res.rowCount || 0;
  }
  invalidateRolePermissionsCache();
  return deletedTotal;
}

// ============================================================
// 4. USER PERMISSION OVERRIDES DATA ACCESS
// ============================================================

export async function getUserOverrides(userId: string): Promise<UserPermissionOverrideRecord[]> {
  const pool = getDbPool();
  const res = await pool.query(
    `SELECT id, user_id, permission_key, effect, scope_type, branch_code,
            reason, starts_at, expires_at, granted_by, revoked_at, revoked_by,
            created_at, updated_at
     FROM user_permission_overrides
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return res.rows.map((r) => {
    const ov: UserPermissionOverrideRecord = {
      id: r.id,
      userId: r.user_id,
      permissionKey: r.permission_key,
      effect: r.effect,
      scopeType: r.scope_type,
      branchCode: r.branch_code,
      reason: r.reason,
      startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : "",
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      grantedBy: r.granted_by,
      revokedAt: r.revoked_at ? new Date(r.revoked_at).toISOString() : null,
      revokedBy: r.revoked_by,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : "",
    };
    ov.policyCompliance = evaluateOverridePolicyCompliance(ov);
    return ov;
  });
}

export async function createUserOverride(data: {
  userId: string;
  permissionKey: PermissionKey;
  effect: PermissionEffect;
  scopeType: ScopeType;
  branchCode?: string | null;
  reason: string;
  startsAt?: string;
  expiresAt?: string | null;
  actor: { id: string; name: string };
}): Promise<UserPermissionOverrideRecord> {
  if (!data.reason || !data.reason.trim()) {
    throw new Error("Alasan wajib diisi untuk setiap user permission override.");
  }

  // Canonical scope rule validation
  const scopeRule = getPermissionScopeRule(data.permissionKey);
  if (!scopeRule.allowedScopes.includes(data.scopeType)) {
    throw new Error(
      `Cakupan '${data.scopeType}' tidak diizinkan untuk hak akses '${data.permissionKey}'. Cakupan yang valid: ${scopeRule.allowedScopes.join(", ")}.`
    );
  }

  // Operational permissions must NEVER have ALL_BRANCHES scope
  if (isOperationalPermission(data.permissionKey) && data.scopeType === "ALL_BRANCHES") {
    throw new Error("Cakupan 'Semua Branch' tidak diizinkan untuk hak akses operasional.");
  }

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Supersede any existing active override for this user & permissionKey
    await client.query(
      `UPDATE user_permission_overrides
       SET revoked_at = NOW(), revoked_by = $1, updated_at = NOW()
       WHERE user_id = $2 AND permission_key = $3 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
      [`${data.actor.name} (Digantikan)`, data.userId, data.permissionKey]
    );

    const id = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const branchCode = data.scopeType === "SPECIFIC_BRANCH" ? (data.branchCode || null) : null;

    const res = await client.query(
      `INSERT INTO user_permission_overrides (
         id, user_id, permission_key, effect, scope_type, branch_code,
         reason, starts_at, expires_at, granted_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        id,
        data.userId,
        data.permissionKey,
        data.effect,
        data.scopeType,
        branchCode,
        data.reason.trim(),
        startsAt,
        expiresAt,
        data.actor.name,
      ]
    );

    // Audit log
    const auditAction = data.effect === "ALLOW" ? "USER_PERMISSION_GRANTED" : "USER_PERMISSION_DENIED";
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await client.query(
      `INSERT INTO permission_audit_logs (
         id, actor_user_id, actor_name, action, target_user_id,
         permission_key, effect, scope_type, branch_code, reason, expires_at, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        auditId,
        data.actor.id,
        data.actor.name,
        auditAction,
        data.userId,
        data.permissionKey,
        data.effect,
        data.scopeType,
        branchCode,
        data.reason.trim(),
        expiresAt,
      ]
    );

    await client.query("COMMIT");

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      permissionKey: r.permission_key,
      effect: r.effect,
      scopeType: r.scope_type,
      branchCode: r.branch_code,
      reason: r.reason,
      startsAt: new Date(r.starts_at).toISOString(),
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      grantedBy: r.granted_by,
      revokedAt: null,
      revokedBy: null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function revokeUserOverride(
  userId: string,
  overrideId: string,
  actor: { id: string; name: string }
): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const check = await client.query(
      `SELECT * FROM user_permission_overrides WHERE id = $1 AND user_id = $2`,
      [overrideId, userId]
    );

    if (check.rows.length === 0) {
      throw new Error("Override tidak ditemukan");
    }

    const current = check.rows[0];
    if (current.revoked_at) {
      // Already revoked
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `UPDATE user_permission_overrides
       SET revoked_at = NOW(), revoked_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [actor.name, overrideId]
    );

    // Audit Log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await client.query(
      `INSERT INTO permission_audit_logs (
         id, actor_user_id, actor_name, action, target_user_id,
         permission_key, effect, scope_type, branch_code, reason, created_at
       ) VALUES ($1, $2, $3, 'USER_PERMISSION_REVOKED', $4, $5, $6, $7, $8, $9, NOW())`,
      [
        auditId,
        actor.id,
        actor.name,
        userId,
        current.permission_key,
        current.effect,
        current.scope_type,
        current.branch_code,
        `Revoked by ${actor.name}`,
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// 5. AUDIT LOGS DATA ACCESS
// ============================================================

export async function getPermissionAuditLogs(limit = 50): Promise<PermissionAuditLogRecord[]> {
  const pool = getDbPool();
  const res = await pool.query(
    `SELECT id, actor_user_id, actor_name, action, target_role, target_user_id,
            permission_key, effect, scope_type, branch_code, reason, expires_at, created_at
     FROM permission_audit_logs
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return res.rows.map((r) => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    actorName: r.actor_name,
    action: r.action,
    targetRole: r.target_role,
    targetUserId: r.target_user_id,
    permissionKey: r.permission_key,
    effect: r.effect,
    scopeType: r.scope_type,
    branchCode: r.branch_code,
    reason: r.reason,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// ============================================================
// 6. CENTRAL PERMISSION RESOLVER
// ============================================================

export interface CheckPermissionParams {
  user: UserContext;
  permission: PermissionKey;
  targetBranch?: string | null;
  report?: IncidentRecord | null;
  overrides?: UserPermissionOverrideRecord[]; // Optional pre-fetched overrides for efficiency
}

export interface PermissionCheckResult {
  authorized: boolean;
  reason?: string;
  source?: "SYSTEM_ADMIN" | "USER_OVERRIDE_DENY" | "USER_OVERRIDE_ALLOW" | "ROLE_PERMISSION" | "DEFAULT_DENY";
}

/**
 * Resolves effective permission following strict precedence:
 * 1. System Role === 'ADMIN' -> Administrative capability
 * 2. Explicit active USER DENY -> DENIED
 * 3. Explicit active USER ALLOW -> ALLOWED (if scope matches)
 * 4. ROLE PERMISSION -> ALLOWED (if organizational scope matches)
 * 5. Default DENY
 */
export function hasAdminCapability(
  user: { systemRole: import("@/types/incident").SystemRole },
  capability: import("@/types/permission").AdminCapability
): boolean {
  return user.systemRole === "ADMIN";
}

export async function checkUserPermission(params: CheckPermissionParams): Promise<PermissionCheckResult> {
  const { user, permission, targetBranch, report } = params;

  // Branch normalization helper
  const cleanBranch = (b?: string | null) => (b ? b.trim().toLowerCase() : "");
  const contextBranch = cleanBranch(targetBranch || report?.branch);
  const userBranch = cleanBranch(user.branch);

  // 1. SYSTEM ADMIN CLASSIFICATION (ADMINISTRATIVE ≠ OPERATIONAL)
  // System Admin is a SYSTEM / DEVELOPER ADMINISTRATOR, not an operational actor.
  // - Administrative capabilities (manage users, roles, overrides, audit, system config) are inherent to ADMIN.
  // - Monitoring permissions (REPORT_VIEW_ALL, NOTIFICATION_VIEW, ESTIMATION_VIEW) are allowed for support/troubleshooting/audit.
  // - Operational permissions (REPORT_CONFIRM, REPORT_FOLLOW_UP, REPORT_UPDATE_PROGRESS, REPORT_CLOSE,
  //   MANAGEMENT_INSTRUCTION_CREATE, ESTIMATION_TRIGGER) are STRICTLY DENIED without exception.
  // - System Admin does NOT receive or use business permission overrides.
  if (user.systemRole === "ADMIN") {
    if (isOperationalPermission(permission)) {
      return {
        authorized: false,
        source: "SYSTEM_ADMIN",
        reason: "Anda tidak memiliki izin untuk melakukan tindakan ini.",
      };
    }

    if (isMonitoringPermission(permission)) {
      return {
        authorized: true,
        source: "SYSTEM_ADMIN",
        reason: "System Administrator memiliki akses pemantauan sistem (troubleshooting, support, audit).",
      };
    }

    return {
      authorized: false,
      source: "SYSTEM_ADMIN",
      reason: "Anda tidak memiliki izin untuk melakukan tindakan ini.",
    };
  }

  // 2. FETCH ACTIVE USER OVERRIDES (Evaluated for business users)
  let activeOverrides = params.overrides;
  if (!activeOverrides && user.id) {
    try {
      const allOverrides = await getUserOverrides(user.id);
      const now = new Date();
      activeOverrides = allOverrides.filter((ov) => {
        if (ov.revokedAt) return false;
        if (ov.startsAt && new Date(ov.startsAt) > now) return false;
        if (ov.expiresAt && new Date(ov.expiresAt) <= now) return false;
        return true;
      });
    } catch (err) {
      console.error("[PermissionResolver] Failed to load user overrides:", err);
      activeOverrides = [];
    }
  } else if (activeOverrides) {
    const now = new Date();
    activeOverrides = activeOverrides.filter((ov) => {
      if (ov.revokedAt) return false;
      if (ov.startsAt && new Date(ov.startsAt) > now) return false;
      if (ov.expiresAt && new Date(ov.expiresAt) <= now) return false;
      return true;
    });
  } else {
    activeOverrides = [];
  }

  // Filter overrides for this specific permission
  const matchingOverrides = activeOverrides.filter((ov) => ov.permissionKey === permission);

  // Helper to check if override applies to context branch
  const doesOverrideScopeMatch = (ov: UserPermissionOverrideRecord): boolean => {
    // Operational actions cannot match ALL_BRANCHES (must be specific branch or own branch)
    if (isOperationalPermission(permission) && ov.scopeType === "ALL_BRANCHES") {
      return false;
    }
    if (ov.scopeType === "ALL_BRANCHES") {
      return true;
    }
    if (ov.scopeType === "SPECIFIC_BRANCH") {
      if (!contextBranch) return true; // generic check
      return cleanBranch(ov.branchCode) === contextBranch;
    }
    if (ov.scopeType === "OWN_SCOPE") {
      if (user.scope === "HO") return true;
      if (!contextBranch) return true;
      return userBranch === contextBranch;
    }
    return false;
  };

  // CHECK EXPLICIT ACTIVE USER DENY
  const userDeny = matchingOverrides.find((ov) => ov.effect === "DENY" && doesOverrideScopeMatch(ov));
  if (userDeny) {
    return {
      authorized: false,
      source: "USER_OVERRIDE_DENY",
      reason: `Izin ditolak secara eksplisit melalui override user: ${userDeny.reason}`,
    };
  }

  // CHECK EXPLICIT ACTIVE USER ALLOW
  const userAllow = matchingOverrides.find((ov) => ov.effect === "ALLOW" && doesOverrideScopeMatch(ov));
  if (userAllow) {
    return {
      authorized: true,
      source: "USER_OVERRIDE_ALLOW",
      reason: `Izin diberikan melalui override user: ${userAllow.reason}`,
    };
  }

  // If user has no business role and is not admin, deny
  if (!user.role) {
    return {
      authorized: false,
      source: "DEFAULT_DENY",
      reason: "Pengguna tidak memiliki business role yang valid.",
    };
  }

  // 3. ROLE PERMISSION EVALUATION
  // First check if permission is part of this role's catalog
  if (!isPermissionInRoleCatalog(user.role, permission)) {
    return {
      authorized: false,
      source: "DEFAULT_DENY",
      reason: `Role '${user.role}' tidak memiliki kewenangan atas '${permission}'.`,
    };
  }

  const rolePerms = await getRolePermissions(user.role);
  const roleEffect = rolePerms[permission] || "DENY";

  if (roleEffect !== "ALLOW") {
    return {
      authorized: false,
      source: "ROLE_PERMISSION",
      reason: `Hak bawaan '${permission}' untuk role '${user.role}' sedang dinonaktifkan (OFF).`,
    };
  }

  // 4. ORGANIZATIONAL SCOPE EVALUATION (Scope-aware boundary)
  // Even if Role Permission allows, scope must be respected!

  // Viewing permissions
  if (permission === "REPORT_VIEW_ALL") {
    // Only HO roles have view all
    if (user.scope === "HO") {
      return { authorized: true, source: "ROLE_PERMISSION" };
    }
    return {
      authorized: false,
      source: "ROLE_PERMISSION",
      reason: "Akses seluruh laporan nasional terbatas untuk scope Head Office (HO).",
    };
  }

  if (permission === "REPORT_VIEW_OWN") {
    if (user.scope === "HO") {
      return { authorized: true, source: "ROLE_PERMISSION" };
    }
    if (!contextBranch || userBranch === contextBranch) {
      return { authorized: true, source: "ROLE_PERMISSION" };
    }
    return {
      authorized: false,
      source: "ROLE_PERMISSION",
      reason: "Hanya dapat melihat laporan cabang sendiri.",
    };
  }

  // Operational permissions: REPORT_CONFIRM, REPORT_FOLLOW_UP, REPORT_UPDATE_PROGRESS, REPORT_CLOSE, COMPLETION_SUBMIT, COMPLETION_APPROVE_COORDINATOR
  const isOperationalAction =
    permission === "REPORT_CONFIRM" ||
    permission === "REPORT_FOLLOW_UP" ||
    permission === "REPORT_UPDATE_PROGRESS" ||
    permission === "REPORT_CLOSE" ||
    permission === "ESTIMATION_TRIGGER" ||
    permission === "WORK_READINESS_UPDATE" ||
    permission === "COMPLETION_SUBMIT" ||
    permission === "COMPLETION_APPROVE_COORDINATOR";

  if (isOperationalAction) {
    // HO users CANNOT act on branch without explicit branch override (checked earlier in userAllow)
    if (user.scope === "HO") {
      return {
        authorized: false,
        source: "ROLE_PERMISSION",
        reason: "User dengan scope Head Office tidak memiliki izin operasional cabang tanpa user override.",
      };
    }

    // Branch staff: can ONLY act on their own branch!
    if (contextBranch && userBranch !== contextBranch) {
      return {
        authorized: false,
        source: "ROLE_PERMISSION",
        reason: `Aksi operasional hanya berlaku untuk cabang sendiri (${user.branch || "N/A"}), bukan ${contextBranch.toUpperCase()}.`,
      };
    }

    // Lifecycle guard: Technical processing requires store confirmation to be completed
    if (
      (permission === "ESTIMATION_TRIGGER" || permission === "REPORT_UPDATE_PROGRESS" || permission === "WORK_READINESS_UPDATE") &&
      report?.status === "pending_confirmation"
    ) {
      return {
        authorized: false,
        source: "ROLE_PERMISSION",
        reason: "Tindakan teknis belum dapat dilakukan karena laporan masih menunggu konfirmasi kondisi toko.",
      };
    }

    return { authorized: true, source: "ROLE_PERMISSION" };
  }

  // Management instruction
  if (permission === "MANAGEMENT_INSTRUCTION_CREATE") {
    if (user.scope === "HO" && (user.role === "gm_ho" || user.role === "sm_ho")) {
      return { authorized: true, source: "ROLE_PERMISSION" };
    }
    return {
      authorized: false,
      source: "ROLE_PERMISSION",
      reason: "Hanya GM/SM Head Office yang dapat membuat instruksi manajemen.",
    };
  }

  // Notifications & Estimations view
  if (permission === "NOTIFICATION_VIEW" || permission === "ESTIMATION_VIEW") {
    return { authorized: true, source: "ROLE_PERMISSION" };
  }

  // Default fallback
  return {
    authorized: false,
    source: "DEFAULT_DENY",
    reason: "Operasi ditolak oleh default security policy.",
  };
}

// ============================================================
// 7. SERVER-SIDE ASYNC AUTHORIZATION HELPERS
// ============================================================

export async function canViewReportAsync(
  user: UserContext,
  report: IncidentRecord
): Promise<boolean> {
  const result = await checkUserPermission({
    user,
    permission: "REPORT_VIEW_ALL",
    report,
  });
  if (result.authorized) return true;

  const ownResult = await checkUserPermission({
    user,
    permission: "REPORT_VIEW_OWN",
    report,
  });
  return ownResult.authorized;
}

export async function canConfirmReportAsync(
  user: UserContext,
  report: IncidentRecord
): Promise<boolean> {
  const result = await checkUserPermission({
    user,
    permission: "REPORT_CONFIRM",
    report,
  });
  return result.authorized;
}

export async function canFollowUpReportAsync(
  user: UserContext,
  report: IncidentRecord
): Promise<boolean> {
  const result = await checkUserPermission({
    user,
    permission: "REPORT_FOLLOW_UP",
    report,
  });
  return result.authorized;
}

export async function canUpdateProgressAsync(
  user: UserContext,
  report: IncidentRecord
): Promise<boolean> {
  const result = await checkUserPermission({
    user,
    permission: "REPORT_UPDATE_PROGRESS",
    report,
  });
  return result.authorized;
}

export async function canCloseReportAsync(
  user: UserContext,
  report: IncidentRecord
): Promise<boolean> {
  const result = await checkUserPermission({
    user,
    permission: "REPORT_CLOSE",
    report,
  });
  return result.authorized;
}

export async function canCreateManagementInstructionAsync(
  user: UserContext
): Promise<boolean> {
  const result = await checkUserPermission({
    user,
    permission: "MANAGEMENT_INSTRUCTION_CREATE",
  });
  return result.authorized;
}

/**
 * Server-side authorization guard for mutation operations.
 * Validates against central permission resolver (considering user overrides, role permissions, and branch scope).
 */
export async function checkMutationAuthorization(
  action: "confirm" | "act" | "follow_up" | "create_instruction" | "create_estimation" | "update_progress" | "close" | "submit_completion" | "approve_coordinator",
  user: UserContext,
  report: IncidentRecord
): Promise<{ authorized: boolean; reason?: string }> {
  let permKey: PermissionKey;

  switch (action) {
    case "create_instruction":
      permKey = "MANAGEMENT_INSTRUCTION_CREATE";
      break;
    case "confirm":
      permKey = "REPORT_CONFIRM";
      break;
    case "follow_up":
      permKey = "REPORT_FOLLOW_UP";
      break;
    case "act":
    case "update_progress":
      permKey = "REPORT_UPDATE_PROGRESS";
      break;
    case "create_estimation":
      permKey = "ESTIMATION_TRIGGER";
      break;
    case "submit_completion":
      permKey = "COMPLETION_SUBMIT";
      break;
    case "approve_coordinator":
      permKey = "COMPLETION_APPROVE_COORDINATOR";
      break;
    case "close":
      permKey = "REPORT_CLOSE";
      break;
    default:
      return { authorized: false, reason: "Aksi tidak dikenali" };
  }

  const result = await checkUserPermission({
    user,
    permission: permKey,
    report,
  });

  return {
    authorized: result.authorized,
    reason: result.reason,
  };
}
