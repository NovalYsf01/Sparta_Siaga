import { getDbPool } from "./db";
import { SpartaRole, SystemRole, Scope } from "@/types/incident";

export interface UserModel {
  id: string;
  externalUserId?: string | null;
  nik: string | null;
  name: string;
  email?: string | null;
  systemRole: SystemRole;
  businessRole: SpartaRole | null;
  scope: Scope | null;
  branch: string | null;
  assignedStoreId?: string | null;
  status: "ACTIVE" | "INACTIVE";
  source: string;
  passwordHash?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToUser(row: any): UserModel {
  return {
    id: row.id,
    externalUserId: row.external_user_id,
    nik: row.nik,
    name: row.name,
    email: row.email,
    systemRole: row.system_role as SystemRole,
    businessRole: row.business_role as SpartaRole | null,
    scope: row.scope as Scope | null,
    branch: row.branch,
    assignedStoreId: row.assigned_store_id ?? null,
    status: row.status as "ACTIVE" | "INACTIVE",
    source: row.source || "LOCAL",
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export async function dbGetUserByNik(nik: string): Promise<UserModel | null> {
  const pool = getDbPool();
  const { rows } = await pool.query(`SELECT * FROM users WHERE nik = $1`, [nik]);
  if (rows.length === 0) return null;
  return rowToUser(rows[0]);
}

export async function dbGetUserById(id: string): Promise<UserModel | null> {
  const pool = getDbPool();
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (rows.length === 0) return null;
  return rowToUser(rows[0]);
}

export async function dbGetAllUsers(): Promise<UserModel[]> {
  const pool = getDbPool();
  const { rows } = await pool.query(`SELECT * FROM users ORDER BY created_at DESC`);
  return rows.map(rowToUser);
}

export async function dbUpsertUser(user: Partial<UserModel> & { id: string }): Promise<UserModel> {
  const pool = getDbPool();
  const existing = await dbGetUserById(user.id);

  const systemRole = user.systemRole ?? existing?.systemRole ?? "USER";
  const isSystemAdmin = systemRole === "ADMIN";

  const businessRole = isSystemAdmin ? null : (user.businessRole !== undefined ? user.businessRole : (existing?.businessRole ?? null));
  const scope = isSystemAdmin ? null : (user.scope !== undefined ? user.scope : (existing?.scope ?? null));
  const branch = isSystemAdmin || scope === "HO" ? null : (user.branch !== undefined ? user.branch : (existing?.branch ?? null));
  const name = user.name ?? existing?.name ?? "User";
  const avatarUrl = user.avatarUrl !== undefined ? user.avatarUrl : (existing?.avatarUrl ?? null);

  const { rows } = await pool.query(
    `INSERT INTO users (id, external_user_id, nik, name, email, system_role, business_role, scope, branch, status, source, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       system_role = EXCLUDED.system_role,
       business_role = EXCLUDED.business_role,
       scope = EXCLUDED.scope,
       branch = EXCLUDED.branch,
       avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
       status = EXCLUDED.status,
       updated_at = NOW()
     RETURNING *`,
    [
      user.id,
      user.externalUserId ?? existing?.externalUserId ?? null,
      user.nik !== undefined ? user.nik : (existing?.nik ?? null),
      name,
      user.email !== undefined ? user.email : (existing?.email ?? null),
      systemRole,
      businessRole,
      scope,
      branch,
      user.status ?? existing?.status ?? "ACTIVE",
      user.source ?? existing?.source ?? "LOCAL",
      avatarUrl
    ]
  );
  return rowToUser(rows[0]);
}

export async function dbCreateUser(user: Partial<UserModel> & { id: string, name: string, businessRole: SpartaRole | null }): Promise<UserModel> {
  const pool = getDbPool();
  const isSystemAdmin = user.systemRole === "ADMIN";
  const businessRole = isSystemAdmin ? null : user.businessRole;
  const scope = isSystemAdmin ? null : user.scope;
  const branch = isSystemAdmin || scope === "HO" ? null : (user.branch || null);

  const { rows } = await pool.query(
    `INSERT INTO users (id, external_user_id, nik, name, email, system_role, business_role, scope, branch, assigned_store_id, status, source, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      user.id,
      user.externalUserId || null,
      user.nik || null,
      user.name,
      user.email || null,
      user.systemRole || "USER",
      businessRole,
      scope,
      branch,
      businessRole === "tim_toko" ? user.assignedStoreId || null : null,
      user.status || "ACTIVE",
      user.source || "LOCAL",
      user.passwordHash || null
    ]
  );
  return rowToUser(rows[0]);
}

export async function dbAdminUpdateUser(id: string, updates: Partial<UserModel>): Promise<UserModel | null> {
  const pool = getDbPool();
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.systemRole !== undefined) {
    setClauses.push(`system_role = $${idx++}`);
    values.push(updates.systemRole);
  }
  if (updates.businessRole !== undefined) {
    setClauses.push(`business_role = $${idx++}`);
    values.push(updates.businessRole);
  }
  if (updates.scope !== undefined) {
    setClauses.push(`scope = $${idx++}`);
    values.push(updates.scope);
  }
  if (updates.branch !== undefined) {
    setClauses.push(`branch = $${idx++}`);
    values.push(updates.branch);
  }
  if (updates.assignedStoreId !== undefined) {
    setClauses.push(`assigned_store_id = $${idx++}`);
    values.push(updates.assignedStoreId);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${idx++}`);
    values.push(updates.status);
  }
  if (updates.email !== undefined) {
    setClauses.push(`email = $${idx++}`);
    values.push(updates.email);
  }
  if (updates.name !== undefined) {
    setClauses.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.nik !== undefined) {
    setClauses.push(`nik = $${idx++}`);
    values.push(updates.nik);
  }
  if (updates.avatarUrl !== undefined) {
    setClauses.push(`avatar_url = $${idx++}`);
    values.push(updates.avatarUrl);
  }
  if (updates.passwordHash !== undefined) {
    setClauses.push(`password_hash = $${idx++}`);
    values.push(updates.passwordHash);
  }

  if (setClauses.length === 0) {
    return dbGetUserById(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (rows.length === 0) return null;
  return rowToUser(rows[0]);
}

export async function dbCheckUserDependencies(id: string): Promise<{ hasDependencies: boolean; reasons: string[] }> {
  const pool = getDbPool();
  const reasons: string[] = [];

  // Check overrides
  const overridesRes = await pool.query(
    `SELECT COUNT(*)::int as count FROM user_permission_overrides WHERE user_id = $1`,
    [id]
  );
  const overrideCount = overridesRes.rows[0]?.count || 0;
  if (overrideCount > 0) {
    reasons.push(`${overrideCount} catatan hak akses khusus (user overrides)`);
  }

  // Check audit logs
  const auditRes = await pool.query(
    `SELECT COUNT(*)::int as count FROM permission_audit_logs WHERE actor_user_id = $1 OR target_user_id = $1`,
    [id]
  );
  const auditCount = auditRes.rows[0]?.count || 0;
  if (auditCount > 0) {
    reasons.push(`${auditCount} riwayat audit log perizinan`);
  }

  return {
    hasDependencies: reasons.length > 0,
    reasons,
  };
}

export async function dbDeleteUser(id: string): Promise<boolean> {
  if (id === "usr_seed_admin") {
    throw new Error("System Admin dilindungi dan tidak dapat dihapus.");
  }
  const existing = await dbGetUserById(id);
  if (existing?.systemRole === "ADMIN") {
    throw new Error("Akun dengan System Role ADMIN tidak dapat dihapus.");
  }

  const pool = getDbPool();
  const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1 AND source = 'LOCAL'`, [id]);
  return (rowCount ?? 0) > 0;
}
