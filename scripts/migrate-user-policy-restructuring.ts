import { getDbPool } from "../lib/db";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

function getIsolatedDbUrl(): string {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  let isolatedUrl = "";
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*SPARTA_ISOLATED_TEST_DATABASE_URL\s*=\s*(.*)?\s*$/);
    if (match) {
      isolatedUrl = match[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }

  if (!isolatedUrl) {
    throw new Error("SPARTA_ISOLATED_TEST_DATABASE_URL not found in .env.local");
  }

  const parsed = new URL(isolatedUrl);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (dbName !== "sparta_siaga_isolated") {
    console.error(`FATAL SAFETY CHECK: DATABASE IS NOT sparta_siaga_isolated (Found: ${dbName})`);
    process.exit(1);
  }

  return isolatedUrl;
}

async function runMigration() {
  const isolatedUrl = getIsolatedDbUrl();
  process.env.DATABASE_URL = isolatedUrl;
  process.env.DATABASE_SSL_MODE = "require";

  const pool = getDbPool();
  const dbCheck = await pool.query("SELECT current_database() as db");
  console.log(`[Safety Guard] Executing migration strictly on: ${dbCheck.rows[0].db}`);

  if (dbCheck.rows[0].db !== "sparta_siaga_isolated") {
    throw new Error("ABORT: Not connected to sparta_siaga_isolated");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("1. Modifying users table columns nullability...");
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN business_role DROP NOT NULL,
      ALTER COLUMN scope DROP NOT NULL,
      ALTER COLUMN branch DROP NOT NULL;
    `);

    console.log("2. Cleaning up System Admin records (business_role and scope to NULL)...");
    await client.query(`
      UPDATE users 
      SET business_role = NULL, scope = NULL, branch = NULL, updated_at = NOW()
      WHERE system_role = 'ADMIN';
    `);

    console.log("3. Deactivating BMC, BEC, and Tim Toko accounts (status = 'INACTIVE')...");
    const deactRes = await client.query(`
      UPDATE users 
      SET status = 'INACTIVE', updated_at = NOW()
      WHERE business_role IN ('bmc', 'bec', 'tim_toko') AND status = 'ACTIVE'
      RETURNING id, name, business_role;
    `);
    console.log(`   Deactivated ${deactRes.rowCount} user accounts:`, deactRes.rows);

    console.log("4. Ensuring canonical usr_seed_admin exists with pure ADMIN identity...");
    const adminHash = await bcrypt.hash("AdminSiaga2026!", 10);
    await client.query(`
      INSERT INTO users (id, nik, name, email, system_role, business_role, scope, branch, status, source, password_hash, updated_at)
      VALUES ('usr_seed_admin', 'ADM0001', 'System Administrator', 'admin@sparta-siaga.local', 'ADMIN', NULL, NULL, NULL, 'ACTIVE', 'LOCAL', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET
        system_role = 'ADMIN',
        business_role = NULL,
        scope = NULL,
        branch = NULL,
        status = 'ACTIVE',
        password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash),
        updated_at = NOW();
    `, [adminHash]);

    await client.query("COMMIT");
    console.log("✅ Migration completed successfully on sparta_siaga_isolated!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error("FATAL ERROR IN MIGRATION:", err);
  process.exit(1);
});
