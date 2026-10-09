import { randomUUID } from "node:crypto";
import { getDbPool } from "./db";
import { dbCreateIncident } from "./incident-db";
import type { IncidentRecord, ReportOrigin } from "../types/incident";

const ACTIVE_LEGACY_STATUSES = ["pending_confirmation", "verifying", "field_inspection_required", "awaiting_manager_confirmation", "clarification_required", "confirmed_affected", "investigating", "in_estimation", "awaiting_spk", "spk_issued", "in_maintenance", "in_construction", "awaiting_st"];

export interface EarthquakeIncidentInput {
  event: { id: string; magnitude: number; depth: string; title: string; time: string; latitude: number; longitude: number; source: string };
  store: { id: string; name: string; branch: string; city: string; distanceKm: number };
  origin: ReportOrigin;
  reporter?: IncidentRecord["reporter"];
}
export type EarthquakeDisposition = "CREATED" | "EXISTING" | "HISTORICAL_ACTIVE_SUPPRESSION" | "UNCERTAIN_MATCH_REVIEW";
export interface EarthquakeMatchReviewInput { candidateReportId: string; eventId: string; storeId: string; eventOccurredAt: string; timeDeltaSeconds: number; distanceKm?: number; confidenceScore: number }
export interface EarthquakeIncidentRepository {
  transaction<T>(work: (repository: EarthquakeIncidentRepository) => Promise<T>): Promise<T>;
  findExact(eventId: string, storeId: string): Promise<IncidentRecord | null>;
  findActiveLegacy(eventId: string, storeId: string): Promise<IncidentRecord | null>;
  findUnlinkedManualCandidates(storeId: string, eventTime: string): Promise<IncidentRecord[]>;
  insertCanonical(incident: IncidentRecord): Promise<{ incident: IncidentRecord; created: boolean }>;
  recordMatchReview(review: EarthquakeMatchReviewInput): Promise<void>;
}

export function createEarthquakeIncidentService(repository: EarthquakeIncidentRepository, now = () => new Date()) {
  return { async createOrGet(input: EarthquakeIncidentInput): Promise<{ incident: IncidentRecord; disposition: EarthquakeDisposition }> {
    return repository.transaction(async (tx) => {
      const eventId = input.event.id.trim();
      const storeId = input.store.id.trim().toUpperCase();
      const exact = await tx.findExact(eventId, storeId);
      if (exact) return { incident: exact, disposition: "EXISTING" };
      const legacy = await tx.findActiveLegacy(eventId, storeId);
      if (legacy) return { incident: legacy, disposition: "HISTORICAL_ACTIVE_SUPPRESSION" };
      if (input.origin === "automatic_earthquake") {
        const candidates = await tx.findUnlinkedManualCandidates(storeId, input.event.time);
        if (candidates.length > 0) {
          for (const candidate of candidates) {
            const delta = Math.abs(new Date(candidate.createdAt).getTime() - new Date(input.event.time).getTime()) / 1000;
            await tx.recordMatchReview({ candidateReportId: candidate.id, eventId, storeId, eventOccurredAt: input.event.time,
              timeDeltaSeconds: Math.round(delta), distanceKm: input.store.distanceKm, confidenceScore: delta <= 3600 ? 0.75 : 0.5 });
          }
          return { incident: candidates[0], disposition: "UNCERTAIN_MATCH_REVIEW" };
        }
      }
      const timestamp = now().toISOString();
      const incident: IncidentRecord = {
        id: `LAP-EQ-${randomUUID().slice(0, 12).toUpperCase()}`, date: now().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
        disasterType: "earthquake", reportOrigin: input.origin, reporter: input.reporter,
        earthquakeEventId: eventId, canonicalEarthquakeEventId: eventId, canonicalStoreId: storeId, earthquakeIdentityVersion: 1,
        earthquakeSource: input.event.source, earthquakeProvenance: `Kejadian ${input.event.source} ${eventId}; identitas toko ${storeId}.`,
        tkpType: "toko", storeId, storeName: input.store.name, branch: input.store.branch, locationCity: input.store.city,
        status: input.origin === "automatic_earthquake" ? "field_inspection_required" : "draft", progress: 0, latestInspectionVersion: 0,
        disasterMetadata: { magnitude: input.event.magnitude, depth: input.event.depth, coordinates: [input.event.latitude, input.event.longitude], place: input.event.title, time: input.event.time, distanceKm: input.store.distanceKm },
        affectedStores: [{ kode_toko: storeId, nama_toko: input.store.name, cabang: input.store.branch, distance_km: input.store.distanceKm, exposure_zone: "MONITOR", confirmation_status: "pending" }],
        affectedStoreCount: 1, dangerStoreCount: 0, fieldPhotos: [],
        timeline: [{ stage: "Laporan Otomatis Dibuat", label: "Perlu Pemeriksaan Lapangan", timestamp, actor: "SPARTA SIAGA", notes: "Deteksi gempa tidak menyatakan kerusakan." }],
        createdAt: timestamp, updatedAt: timestamp,
      };
      const inserted = await tx.insertCanonical(incident);
      return { incident: inserted.incident, disposition: inserted.created ? "CREATED" : "EXISTING" };
    });
  } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function postgresRepository(client?: any): EarthquakeIncidentRepository {
  const pool = getDbPool(); const queryable = client ?? pool;
  return {
    async transaction<T>(work: (repository: EarthquakeIncidentRepository) => Promise<T>): Promise<T> {
      if (client) return work(postgresRepository(client));
      const connection = await pool.connect();
      try { await connection.query("BEGIN"); const result = await work(postgresRepository(connection)); await connection.query("COMMIT"); return result; }
      catch (error) { await connection.query("ROLLBACK"); throw error; } finally { connection.release(); }
    },
    async findExact(eventId, storeId) { const { rows } = await queryable.query("SELECT * FROM incidents WHERE canonical_earthquake_event_id = $1 AND canonical_store_id = $2 AND earthquake_identity_version = 1 LIMIT 1", [eventId, storeId]); return rows[0] ? mapIncident(rows[0]) : null; },
    async findActiveLegacy(eventId, storeId) { const { rows } = await queryable.query(`SELECT * FROM incidents i WHERE i.earthquake_event_id = $1 AND COALESCE(i.earthquake_identity_version, 0) <> 1 AND i.status = ANY($3::text[]) AND (UPPER(i.store_id) = UPPER($2) OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(i.affected_stores, '[]'::jsonb)) s WHERE UPPER(s->>'kode_toko') = UPPER($2))) ORDER BY i.created_at DESC LIMIT 1`, [eventId, storeId, ACTIVE_LEGACY_STATUSES]); return rows[0] ? mapIncident(rows[0]) : null; },
    async findUnlinkedManualCandidates(storeId, eventTime) { const { rows } = await queryable.query(`SELECT * FROM incidents WHERE disaster_type = 'earthquake' AND report_origin = 'manual' AND earthquake_event_id IS NULL AND UPPER(store_id) = UPPER($1) AND created_at BETWEEN $2::timestamptz - INTERVAL '2 hours' AND $2::timestamptz + INTERVAL '2 hours' ORDER BY created_at`, [storeId, eventTime]); return rows.map(mapIncident); },
    async insertCanonical(incident) { try { return { incident: await dbCreateIncident(incident), created: true }; } catch (error) { if ((error as { code?: string }).code !== "23505") throw error; const existing = await this.findExact(incident.canonicalEarthquakeEventId!, incident.canonicalStoreId!); if (!existing) throw error; return { incident: existing, created: false }; } },
    async recordMatchReview(review) { await queryable.query(`INSERT INTO incident_earthquake_match_reviews (id, candidate_report_id, canonical_earthquake_event_id, canonical_store_id, event_occurred_at, time_delta_seconds, distance_km, confidence_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`, [`match_${randomUUID()}`, review.candidateReportId, review.eventId, review.storeId, review.eventOccurredAt, review.timeDeltaSeconds, review.distanceKm ?? null, review.confidenceScore]); },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIncident(row: any): IncidentRecord {
  return { id: row.id, date: row.date, disasterType: row.disaster_type, reportOrigin: row.report_origin, reporter: row.reporter ?? undefined, earthquakeEventId: row.earthquake_event_id ?? undefined, canonicalEarthquakeEventId: row.canonical_earthquake_event_id ?? undefined, canonicalStoreId: row.canonical_store_id ?? undefined, earthquakeIdentityVersion: row.earthquake_identity_version ?? undefined, earthquakeSource: row.earthquake_source ?? undefined, earthquakeProvenance: row.earthquake_provenance ?? undefined, tkpType: row.tkp_type ?? undefined, storeId: row.store_id, storeName: row.store_name, branch: row.branch, locationCity: row.location_city, status: row.status, progress: row.progress, disasterMetadata: row.disaster_metadata ?? undefined, affectedStores: row.affected_stores ?? undefined, affectedStoreCount: row.affected_store_count ?? undefined, dangerStoreCount: row.danger_store_count ?? undefined, verification: row.verification ?? undefined, fieldPhotos: row.field_photos ?? [], timeline: row.timeline ?? [], latestInspectionVersion: row.latest_inspection_version ?? 0, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(), closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : undefined };
}
export const earthquakeIncidentService = createEarthquakeIncidentService(postgresRepository());
