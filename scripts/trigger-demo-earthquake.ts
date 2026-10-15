/**
 * SPARTA SIAGA — Satu laporan gempa SIMULASI Bandung + satu notifikasi BMS.
 * pnpm tsx scripts/trigger-demo-earthquake.ts
 * HANYA untuk database development/staging sparta_siaga_isolated.
 * Tidak memakai kejadian BMKG/USGS atau mengirim email/WA.
 */
import { getDbPool, closeDbPool } from "../lib/db";
import { assertIsolatedDatabase } from "../lib/database-safety";
import { ensureEarthquakeReport } from "../lib/earthquake-report-service";
import { recordNotificationLog } from "../lib/notification-service";

const REPORT_ID = "LAP-EQ-DEMO-BDG-001";
const EVENT_ID = "SIMULASI-EQ-BANDUNG-DEMO-001";

type DemoStore = {
  kode_toko: string;
  nama_toko: string;
  cabang: string;
  fr_type: string | null;
  latitude: number | string;
  longitude: number | string;
};

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Trigger simulasi tidak boleh berjalan pada NODE_ENV=production.");
  }

  const pool = getDbPool();
  await assertIsolatedDatabase(pool);

  const current = await pool.query<{
    id: string;
    earthquake_event_id: string | null;
    branch: string;
  }>(
    "SELECT id, earthquake_event_id, branch FROM incidents WHERE id = $1",
    [REPORT_ID]
  );

  if (current.rows[0]) {
    if (
      current.rows[0].earthquake_event_id !== EVENT_ID ||
      current.rows[0].branch !== "BANDUNG"
    ) {
      throw new Error("ID laporan demo telah dipakai laporan lain.");
    }
  } else {
    const count = await pool.query<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM incidents"
    );
    if (count.rows[0]?.total !== 0) {
      throw new Error(
        "Database masih berisi laporan lain. Trigger ini hanya untuk demo dari data kosong; tidak menghapus data."
      );
    }
  }

  const stores = await pool.query<DemoStore>(
    "SELECT kode_toko, nama_toko, cabang, fr_type, latitude, longitude " +
    "FROM stores WHERE UPPER(TRIM(cabang)) = 'BANDUNG' " +
    "AND kode_toko IS NOT NULL AND kode_toko <> '' " +
    "AND nama_toko IS NOT NULL AND nama_toko <> '' " +
    "AND latitude IS NOT NULL AND longitude IS NOT NULL " +
    "ORDER BY CASE WHEN nama_toko ILIKE '%DAGO%' THEN 0 ELSE 1 END, kode_toko LIMIT 1"
  );
  const store = stores.rows[0];
  if (!store) {
    throw new Error("Tidak ada toko Bandung berkoordinat valid pada tabel stores.");
  }
  const latitude = Number(store.latitude);
  const longitude = Number(store.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Koordinat toko Bandung tidak valid.");
  }

  const report = await ensureEarthquakeReport({
    reportId: REPORT_ID,
    canonicalEventId: EVENT_ID,
    eventOccurredAt: new Date(),
    source: "SIMULASI INTERNAL - BUKAN DATA BMKG/USGS",
    location: {
      kind: "STORE",
      id: store.kode_toko,
      code: store.kode_toko,
      name: store.nama_toko,
      type: store.fr_type || "TOKO",
      branch: "BANDUNG",
      latitude,
      longitude,
    },
  });
  if (
    (report.outcome !== "created" && report.outcome !== "existing") ||
    report.incidentId !== REPORT_ID
  ) {
    throw new Error("Laporan simulasi tidak dibuat sesuai rencana.");
  }

  const existing = await pool.query<{ id: string }>(
    "SELECT id FROM notification_logs WHERE ticket_number = $1 " +
    "AND branch = 'BANDUNG' AND recipient_group = 'BMS' " +
    "AND notification_category = 'ASSIGNMENT' LIMIT 1",
    [REPORT_ID]
  );

  let notificationId = existing.rows[0]?.id;
  if (!notificationId) {
    const log = await recordNotificationLog({
      disasterId: REPORT_ID,
      canonicalEventId: EVENT_ID,
      disasterType: "earthquake",
      channel: "pwa_only",
      branch: "BANDUNG",
      recipientContact: "in-app://bms/bandung",
      recipientGroup: "BMS",
      category: "ASSIGNMENT",
      ticketNumber: REPORT_ID,
      title: "[TUGAS PENANGANAN] [SIMULASI] " + store.nama_toko,
      message:
        "SIMULASI RAPAT, bukan kejadian BMKG/USGS aktual. " +
        "BMS Bandung memeriksa toko " + store.nama_toko +
        ", mengunggah foto bukti, dan mengajukan hasil untuk " +
        "konfirmasi BnM Manajer sebelum tindak lanjut maintenance.",
      affectedStores: [{
        kode_toko: store.kode_toko,
        nama_toko: store.nama_toko,
        cabang: "BANDUNG",
        distance_km: 0,
        status: "PRIORITY_MONITOR",
        fr_type: store.fr_type || undefined,
      }],
    });
    notificationId = log.id;
  }

  const result = await pool.query<{ status: string }>(
    "SELECT status FROM incidents WHERE id = $1",
    [REPORT_ID]
  );
  console.log("SIMULASI SPARTA SIAGA — BERHASIL");
  console.log("Laporan       : " + REPORT_ID);
  console.log("Toko          : " + store.nama_toko);
  console.log("Cabang        : BANDUNG");
  console.log("Status        : " + (result.rows[0]?.status || "tidak diketahui"));
  console.log("Notifikasi BMS: " + notificationId + " (in-app, bukan email/WA)");
  console.log("Selanjutnya   : login BMS, buka lonceng, periksa toko + foto, ajukan ke BnM Manajer.");
}

main()
  .catch((error: unknown) => {
    console.error("[GAGAL] " + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDbPool();
  });
