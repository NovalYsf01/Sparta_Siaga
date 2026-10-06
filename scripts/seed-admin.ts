import { getDbPool } from '../lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const pool = getDbPool();
  console.log('Seeding Sample Admin...');

  try {
    const adminId = 'usr_seed_admin';
    const nik = 'ADM0001';
    
    const adminPassword = process.env.DEV_ADMIN_PASSWORD;
    let passwordHash = null;
    if (adminPassword) {
      passwordHash = await bcrypt.hash(adminPassword, 10);
    }
    
    // Upsert seed admin
    await pool.query(
      `INSERT INTO users (id, nik, name, system_role, business_role, scope, branch, status, source, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         system_role = EXCLUDED.system_role,
         business_role = EXCLUDED.business_role,
         scope = EXCLUDED.scope,
         branch = EXCLUDED.branch,
         status = EXCLUDED.status,
         password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
         updated_at = NOW()`,
      [
        adminId,
        nik,
        'Admin SPARTA SIAGA',
        'ADMIN',
        null, // business_role is NULL for System Admin
        null, // scope is NULL
        null, // branch is NULL
        'ACTIVE',
        'LOCAL',
        passwordHash
      ]
    );

    console.log('SUCCESS: Sample Admin created or updated!');
  } catch (err) {
    console.error('ERROR seeding admin:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
