import { getDbPool, closeDbPool } from "../lib/db";
import { assertIsolatedDatabase } from "../lib/database-safety";
import bcrypt from "bcryptjs";

export async function seedDemoPersonas(): Promise<void> {
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);

  const devAdminPassword = process.env.DEV_ADMIN_PASSWORD || "admin123";
  const demoUserPassword = process.env.DEMO_USER_PASSWORD || "pass123";

  const adminHash = await bcrypt.hash(devAdminPassword, 10);
  const userHash = await bcrypt.hash(demoUserPassword, 10);

  const personas = [
    {
      id: "usr_seed_admin",
      nik: "ADM0001",
      external_user_id: "admin",
      name: "System Administrator",
      email: "admin@sparta-siaga.local",
      system_role: "ADMIN",
      business_role: null,
      scope: null,
      branch: null,
      status: "ACTIVE",
      password_hash: adminHash,
    },
    {
      id: "USR-BMS-001",
      nik: "BMS0001",
      external_user_id: "bms",
      name: "Demo BMS Bandung",
      email: "bms.bandung@sparta-siaga.local",
      system_role: "USER",
      business_role: "bms",
      scope: "BRANCH",
      branch: "BANDUNG",
      status: "ACTIVE",
      password_hash: userHash,
    },
    {
      id: "USR-DEMO-BES",
      nik: "BES0001",
      external_user_id: "bes",
      name: "Demo BES Bandung",
      email: "bes.bandung@sparta-siaga.local",
      system_role: "USER",
      business_role: "bes",
      scope: "BRANCH",
      branch: "BANDUNG",
      status: "ACTIVE",
      password_hash: userHash,
    },
    {
      id: "USR-BM-G001",
      nik: "BM0001",
      external_user_id: "bmm",
      name: "Demo Manager BMM Bandung",
      email: "bmm.bandung@sparta-siaga.local",
      system_role: "USER",
      business_role: "bm",
      scope: "BRANCH",
      branch: "BANDUNG",
      status: "ACTIVE",
      password_hash: userHash,
    },
    {
      id: "USR-HO-BUDI",
      nik: "HO0001",
      external_user_id: "ho",
      name: "Demo HO Monitoring",
      email: "ho.monitoring@sparta-siaga.local",
      system_role: "USER",
      business_role: "ho_admin",
      scope: "HO",
      branch: null,
      status: "ACTIVE",
      password_hash: userHash,
    },
    {
      id: "u-test-tim",
      nik: "1001",
      external_user_id: "tim_toko",
      name: "Tim Toko Cikokol (Nonaktif)",
      email: "tim.cikokol@sparta-siaga.local",
      system_role: "USER",
      business_role: "tim_toko",
      scope: "BRANCH",
      branch: "CIKOKOL",
      status: "INACTIVE",
      password_hash: userHash,
    },
  ];

  for (const p of personas) {
    await pool.query(
      `INSERT INTO users (id, nik, external_user_id, name, email, system_role, business_role, scope, branch, status, source, password_hash, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'LOCAL', $11, NOW())
       ON CONFLICT (id) DO UPDATE SET
         nik = EXCLUDED.nik,
         external_user_id = EXCLUDED.external_user_id,
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         system_role = EXCLUDED.system_role,
         business_role = EXCLUDED.business_role,
         scope = EXCLUDED.scope,
         branch = EXCLUDED.branch,
         status = EXCLUDED.status,
         password_hash = EXCLUDED.password_hash,
         updated_at = NOW()`,
      [
        p.id,
        p.nik,
        p.external_user_id,
        p.name,
        p.email,
        p.system_role,
        p.business_role,
        p.scope,
        p.branch,
        p.status,
        p.password_hash,
      ]
    );
  }

  console.log("Idempotent demo personas seed completed successfully on sparta_siaga_isolated.");
}

if (process.argv[1]?.endsWith("seed-demo-personas.ts")) {
  seedDemoPersonas()
    .then(async () => {
      await closeDbPool();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error("Error seeding demo personas:", e);
      await closeDbPool();
      process.exit(1);
    });
}
