import { getDbPool } from "../lib/db";
import {
  PERMISSION_KEYS,
  PermissionKey,
  ROLE_PERMISSION_CATALOG,
  DEFAULT_ROLE_PERMISSIONS,
} from "../types/permission";

async function migratePermissions() {
  const pool = getDbPool();
  console.log("=== RUNNING ADDITIVE MIGRATION: PERMISSION SYSTEM ===");

  try {
    // 1. Role Permissions Table
    console.log("Creating role_permissions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id VARCHAR(64) PRIMARY KEY,
        business_role VARCHAR(64) NOT NULL,
        permission_key VARCHAR(64) NOT NULL,
        effect VARCHAR(16) NOT NULL DEFAULT 'ALLOW',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_role_permission UNIQUE (business_role, permission_key)
      );
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(business_role);
    `);

    // 2. User Permission Overrides Table
    console.log("Creating user_permission_overrides table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_permission_overrides (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_key VARCHAR(64) NOT NULL,
        effect VARCHAR(16) NOT NULL DEFAULT 'ALLOW',
        scope_type VARCHAR(32) NOT NULL DEFAULT 'OWN_SCOPE',
        branch_code VARCHAR(64),
        reason TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        granted_by VARCHAR(64),
        revoked_at TIMESTAMPTZ,
        revoked_by VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_overrides_user ON user_permission_overrides(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_overrides_active ON user_permission_overrides(user_id, permission_key) WHERE revoked_at IS NULL;
    `);

    // 3. Permission Audit Logs Table
    console.log("Creating permission_audit_logs table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permission_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        actor_user_id VARCHAR(64),
        actor_name VARCHAR(128),
        action VARCHAR(64) NOT NULL,
        target_role VARCHAR(64),
        target_user_id VARCHAR(64),
        permission_key VARCHAR(64) NOT NULL,
        effect VARCHAR(16) NOT NULL,
        scope_type VARCHAR(32),
        branch_code VARCHAR(64),
        reason TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_perm_audit_user ON permission_audit_logs(target_user_id);
      CREATE INDEX IF NOT EXISTS idx_perm_audit_role ON permission_audit_logs(target_role);
      CREATE INDEX IF NOT EXISTS idx_perm_audit_created ON permission_audit_logs(created_at DESC);
    `);

    // 4. Seed Default Role Permissions & Clean Non-Catalog Rows (Section 14)
    console.log("Cleaning up non-catalog role permissions...");
    for (const [role, catalogKeys] of Object.entries(ROLE_PERMISSION_CATALOG)) {
      await pool.query(
        `DELETE FROM role_permissions
         WHERE business_role = $1
         AND permission_key != ALL($2::text[])`,
        [role, catalogKeys]
      );
    }

    console.log("Seeding default role permissions (catalog only)...");
    for (const [role, catalogKeys] of Object.entries(ROLE_PERMISSION_CATALOG)) {
      for (const permKey of catalogKeys) {
        const id = `perm_${role}_${permKey.toLowerCase()}`;
        const defaultEffect = DEFAULT_ROLE_PERMISSIONS[role]?.[permKey] || "ALLOW";
        await pool.query(
          `INSERT INTO role_permissions (id, business_role, permission_key, effect, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (business_role, permission_key) DO NOTHING`,
          [id, role, permKey, defaultEffect]
        );
      }
    }

    // 5. Estimation Routing Table (Phase 1 TKP Toko)
    console.log("Creating report_estimation_routes table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_estimation_routes (
        id VARCHAR(64) PRIMARY KEY,
        report_id VARCHAR(64) NOT NULL UNIQUE,
        handler_type VARCHAR(32) NOT NULL,
        target_system VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        store_code VARCHAR(64),
        branch_code VARCHAR(64),
        external_reference_id VARCHAR(128),
        notes TEXT,
        created_by VARCHAR(64) NOT NULL,
        created_by_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_synced_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_estimation_routes_report ON report_estimation_routes(report_id);
      CREATE INDEX IF NOT EXISTS idx_estimation_routes_handler ON report_estimation_routes(handler_type);
    `);

    console.log("✓ Permission migration and seed completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migratePermissions();
