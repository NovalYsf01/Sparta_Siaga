import { getDbPool } from '../lib/db';
import { INITIAL_INCIDENTS } from '../lib/incident-store';

async function seed() {
  const pool = getDbPool();
  console.log('Seeding incidents...');

  for (const inc of INITIAL_INCIDENTS) {
    await pool.query(
      `INSERT INTO incidents (
        id, date, disaster_type, store_id, store_name, branch, location_city,
        status, progress, disaster_metadata, verification, maintenance_ticket,
        timeline, created_at, updated_at, closed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (id) DO NOTHING`,
      [
        inc.id,
        inc.date,
        inc.disasterType,
        inc.storeId,
        inc.storeName,
        inc.branch,
        inc.locationCity,
        inc.status,
        inc.progress,
        inc.disasterMetadata ? JSON.stringify(inc.disasterMetadata) : null,
        inc.verification ? JSON.stringify(inc.verification) : null,
        inc.maintenanceTicket ? JSON.stringify(inc.maintenanceTicket) : null,
        JSON.stringify(inc.timeline),
        inc.createdAt,
        inc.updatedAt,
        inc.closedAt ?? null,
      ]
    );
    console.log(`  ✅ Inserted: ${inc.id} — ${inc.storeName}`);
  }

  console.log(`\nSUCCESS: Seeded ${INITIAL_INCIDENTS.length} incidents.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('ERROR seeding incidents:', err);
  process.exit(1);
});
