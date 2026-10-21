import bcrypt from "bcryptjs";
import { getDbPool, closeDbPool } from "../lib/db";
import { assertIsolatedDatabase } from "../lib/database-safety";

export interface UatPersonaDefinition {
  id: string;
  nik: string;
  external_user_id: string;
  name: string;
  email: string;
  system_role: "USER" | "ADMIN";
  business_role: string;
  scope: "BRANCH" | "HO";
  branch: string | null;
  status: "ACTIVE";
  simulations: string;
  functionDesc: string;
}

export const UAT_PERSONAS: UatPersonaDefinition[] = [
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
    simulations: "Simulasi 1",
    functionDesc: "Pembuatan & pemeriksaan laporan manual toko, update milestone & serah terima",
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
    simulations: "Simulasi 2",
    functionDesc: "Pembuatan & pemeriksaan laporan DC/Warehouse, update milestone & serah terima",
  },
  {
    id: "USR-DEMO-BBS",
    nik: "BBS0001",
    external_user_id: "bbs",
    name: "Demo BBS Bandung",
    email: "bbs.bandung@sparta-siaga.local",
    system_role: "USER",
    business_role: "bbs",
    scope: "BRANCH",
    branch: "BANDUNG",
    status: "ACTIVE",
    simulations: "Kesiapan Operasional",
    functionDesc: "Dokumentasi & pelaporan gedung cabang/kantor",
  },
  {
    id: "USR-DEMO-BMC",
    nik: "BMC0001",
    external_user_id: "bmc",
    name: "Demo BMC Koordinator Bandung",
    email: "bmc.bandung@sparta-siaga.local",
    system_role: "USER",
    business_role: "bmc",
    scope: "BRANCH",
    branch: "BANDUNG",
    status: "ACTIVE",
    simulations: "Simulasi 1",
    functionDesc: "Pemeriksaan dan persetujuan koordinator untuk laporan toko (BMS)",
  },
  {
    id: "USR-DEMO-BEC",
    nik: "BEC0001",
    external_user_id: "bec",
    name: "Demo BEC Koordinator Bandung",
    email: "bec.bandung@sparta-siaga.local",
    system_role: "USER",
    business_role: "bec",
    scope: "BRANCH",
    branch: "BANDUNG",
    status: "ACTIVE",
    simulations: "Simulasi 2",
    functionDesc: "Pemeriksaan dan persetujuan koordinator untuk laporan DC (BES)",
  },
  {
    id: "USR-DEMO-BBC",
    nik: "BBC0001",
    external_user_id: "bbc",
    name: "Demo BBC Koordinator Bandung",
    email: "bbc.bandung@sparta-siaga.local",
    system_role: "USER",
    business_role: "bbc",
    scope: "BRANCH",
    branch: "BANDUNG",
    status: "ACTIVE",
    simulations: "Kesiapan Operasional",
    functionDesc: "Pemeriksaan dan persetujuan koordinator untuk laporan gedung cabang (BBS)",
  },
  {
    id: "USR-BM-G001",
    nik: "BM0001",
    external_user_id: "bmm",
    name: "Demo BnM Manajer Bandung",
    email: "bmm.bandung@sparta-siaga.local",
    system_role: "USER",
    business_role: "bm",
    scope: "BRANCH",
    branch: "BANDUNG",
    status: "ACTIVE",
    simulations: "Simulasi 1 & Simulasi 2",
    functionDesc: "Konfirmasi pemeriksaan lapangan & persetujuan/penolakan akhir Serah Terima",
  },
  {
    id: "USR-HO-BUDI",
    nik: "HO0001",
    external_user_id: "ho",
    name: "Demo HO Admin Monitoring",
    email: "ho.monitoring@sparta-siaga.local",
    system_role: "USER",
    business_role: "ho_admin",
    scope: "HO",
    branch: null,
    status: "ACTIVE",
    simulations: "Simulasi 1 & Simulasi 2",
    functionDesc: "Monitoring komprehensif seluruh cabang, Peta Monitoring, & unduh PDF",
  },
  {
    id: "USR-DEMO-GM",
    nik: "GM0001",
    external_user_id: "gm",
    name: "Demo GM HO Monitoring",
    email: "gm.monitoring@sparta-siaga.local",
    system_role: "USER",
    business_role: "gm_ho",
    scope: "HO",
    branch: null,
    status: "ACTIVE",
    simulations: "Simulasi 2",
    functionDesc: "Pemantauan eksekutif kejadian nasional, gempa otomatis, dan notifikasi",
  },
];

export async function prepareUatPersonas(): Promise<void> {
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);

  console.log("==============================================================");
  console.log("👥 PROVISIONING UAT DEMO PERSONAS (ZERO TOUCH ON ADMIN)");
  console.log("==============================================================");

  // 1. Audit and protect existing admins
  const adminRes = await pool.query(
    "SELECT id, nik, name, system_role FROM users WHERE system_role = 'ADMIN' OR id = 'usr_seed_admin' OR nik = 'ADM0001'"
  );
  const protectedAdminIds = new Set(adminRes.rows.map((r) => r.id));
  const protectedAdminNiks = new Set(adminRes.rows.map((r) => r.nik));

  console.log(`[Safety] Found ${adminRes.rows.length} System Administrator accounts to PRESERVE:`);
  adminRes.rows.forEach((adm) => {
    console.log(`  🛡️ [IMMUTABLE] ID: ${adm.id} | NIK: ${adm.nik} | Name: ${adm.name}`);
  });

  const demoUserPassword = process.env.DEMO_USER_PASSWORD || "pass123";
  const userHash = await bcrypt.hash(demoUserPassword, 10);

  // 2. Insert or update only UAT personas
  for (const p of UAT_PERSONAS) {
    if (protectedAdminIds.has(p.id) || protectedAdminNiks.has(p.nik)) {
      console.warn(`[Skip] Persona ${p.id} (${p.nik}) matches protected admin; skipping.`);
      continue;
    }

    await pool.query(
      `INSERT INTO users (
        id, nik, external_user_id, name, email, system_role,
        business_role, scope, branch, status, source, password_hash, updated_at
      )
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
        userHash,
      ]
    );

    console.log(`✔ [Provisioned] NIK: ${p.nik} | ID: ${p.id} | Name: ${p.name} | Role: ${p.business_role} | Branch: ${p.branch || 'ALL'}`);
  }

  // 3. Post-provisioning safety check on System Administrator
  const postAdminRes = await pool.query(
    "SELECT id, nik, name, status, password_hash FROM users WHERE nik = 'ADM0001'"
  );
  if (postAdminRes.rows.length === 0 || postAdminRes.rows[0].status !== "ACTIVE") {
    throw new Error("FATAL: System Administrator ADM0001 was lost or corrupted during provisioning!");
  }

  console.log("✔ [Safety Verified] System Administrator ADM0001 is 100% ACTIVE and untouched.");
  console.log("==============================================================");
  console.log("🎉 ALL UAT DEMO PERSONAS ARE READY!");
  console.log("==============================================================");
}

if (process.argv[1]?.endsWith("prepare-uat-personas.ts")) {
  prepareUatPersonas()
    .then(async () => {
      await closeDbPool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Provisioning Error]:", err);
      await closeDbPool();
      process.exit(1);
    });
}
