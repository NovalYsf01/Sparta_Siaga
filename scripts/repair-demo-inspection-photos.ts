/**
 * Pemulihan URL foto pemeriksaan untuk SATU laporan simulasi Bandung.
 * Memperbaiki referensi yang hilang akibat callback UI lama, tanpa mengubah
 * hasil pemeriksaan, status, persetujuan, atau data master.
 *
 * pnpm tsx scripts/repair-demo-inspection-photos.ts
 *
 * HANYA untuk database sparta_siaga_isolated dan laporan LAP-EQ-DEMO-BDG-001.
 * Hanya memakai berkas watermark yang sudah pernah diunggah melalui API.
 */
import fs from "node:fs/promises";
import { getDbPool, closeDbPool } from "../lib/db";
import { assertIsolatedDatabase } from "../lib/database-safety";
import { getInspectionStorageDir } from "../lib/inspection-storage";

const ID = "LAP-EQ-DEMO-BDG-001";
const EVENT_ID = "SIMULASI-EQ-BANDUNG-DEMO-001";

type Report = {
  id: string;
  status: string;
  branch: string;
  report_origin: string;
  earthquake_event_id: string | null;
  verification: Record<string, unknown> | null;
  field_photos: string[] | null;
  created_at: Date | string;
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Tidak boleh berjalan dengan NODE_ENV=production.");
  }
  const pool = getDbPool();
  await assertIsolatedDatabase(pool);

  const res = await pool.query<Report>(
    "SELECT id, status, branch, report_origin, earthquake_event_id, " +
    "verification, field_photos, created_at FROM incidents WHERE id=$1",
    [ID]
  );
  const report = res.rows[0];
  if (!report) throw new Error("Laporan demo tidak ditemukan.");
  if (
    report.branch !== "BANDUNG" ||
    report.earthquake_event_id !== EVENT_ID ||
    report.report_origin !== "automatic_earthquake"
  ) {
    throw new Error("Identitas laporan bukan demo Bandung. Perbaikan dibatalkan.");
  }
  if (report.status !== "pending_bm_approval") {
    throw new Error(
      "Laporan tidak lagi menunggu approval BnM (" + report.status +
      "). Tidak mengubah foto pada status ini."
    );
  }
  if (!report.verification || typeof report.verification !== "object") {
    throw new Error("Data pemeriksaan tidak ditemukan. Perbaikan dibatalkan.");
  }
  if (Array.isArray(report.verification.photos) &&
      report.verification.photos.length > 0) {
    console.log("Foto pemeriksaan sudah tercatat di database (" +
      report.verification.photos.length + "). Tidak perlu pemulihan.");
    console.log("Jika galeri tetap kosong, muat ulang browser dan cek akses file.");
    return;
  }

  const storageDir = getInspectionStorageDir();
  let names: string[];
  try {
    names = await fs.readdir(storageDir);
  } catch {
    throw new Error("Direktori foto belum tersedia: " + storageDir);
  }

  const matched = names.filter(name =>
    /^wm_LAP-EQ-DEMO-BDG-001_\d+_[a-z0-9]+\.(jpg|png|webp)$/.test(name)
  );
  const createdMs = new Date(report.created_at).getTime();
  const files: string[] = [];
  for (const name of matched) {
    const info = await fs.stat(storageDir + "/" + name);
    if (info.isFile() && info.size > 0 &&
        info.mtimeMs >= createdMs - 60_000) {
      files.push(name);
    }
  }
  if (!files.length) {
    console.log("Foto belum ditemukan pada private storage aplikasi ini.");
    console.log("Tidak ada data yang diubah. Periksa PRIVATE_STORAGE_ROOT atau sesi upload.");
    return;
  }

  const urls = files.sort().map(name =>
    "/api/incidents/" + encodeURIComponent(ID) +
    "/inspection/evidence/" + encodeURIComponent(name)
  );
  const update = await pool.query(
    "UPDATE incidents " +
    "SET verification = jsonb_set(verification, '{photos}', to_jsonb($1::text[]), true), " +
    "field_photos = to_jsonb($1::text[]), updated_at = NOW() " +
    "WHERE id = $2 AND status = 'pending_bm_approval' " +
    "AND (verification->'photos' IS NULL OR verification->'photos' = '[]'::jsonb) " +
    "RETURNING id",
    [urls, ID]
  );
  if (update.rowCount !== 1) {
    throw new Error("Data berubah saat proses pemulihan; tidak melakukan penimpaan.");
  }
  console.log("FOTO PEMERIKSAAN DIPULIHKAN");
  console.log("Laporan  : " + ID);
  console.log("Jumlah   : " + urls.length + " foto");
  console.log("Status   : pending_bm_approval (tidak diubah)");
  console.log("Lanjut   : refresh Chrome, login BM0001, buka review laporan yang sama.");
}

main()
  .catch((error: unknown) => {
    console.error("[GAGAL] " + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  })
  .finally(async () => { await closeDbPool(); });
