import assert from "node:assert/strict";
import { createEarthquakeIncidentService, type EarthquakeIncidentRepository } from "../lib/earthquake-incident-service";
import type { IncidentRecord } from "../types/incident";

const incidents: IncidentRecord[] = [];
const reviews: Array<{ candidateReportId: string }> = [];
let legacyResult: IncidentRecord | null = null;
let manualCandidates: IncidentRecord[] = [];
const repository: EarthquakeIncidentRepository = {
  transaction: async (work) => work(repository),
  findExact: async (eventId, storeId) => incidents.find((item) => item.canonicalEarthquakeEventId === eventId && item.canonicalStoreId === storeId) ?? null,
  findActiveLegacy: async () => legacyResult,
  findUnlinkedManualCandidates: async () => manualCandidates,
  insertCanonical: async (incident) => {
    const existing = incidents.find((item) => item.canonicalEarthquakeEventId === incident.canonicalEarthquakeEventId && item.canonicalStoreId === incident.canonicalStoreId);
    if (existing) return { incident: existing, created: false };
    incidents.push(incident);
    return { incident, created: true };
  },
  recordMatchReview: async (review) => { reviews.push(review); },
};
const service = createEarthquakeIncidentService(repository, () => new Date("2026-10-09T02:00:00.000Z"));
const input = {
  event: { id: "BMKG-EQ-001", magnitude: 6.1, depth: "10 km", title: "Banten", time: "2026-10-09T01:55:00.000Z", latitude: -6.2, longitude: 106.6, source: "BMKG" },
  store: { id: "TKO-001", name: "Alfamart Satu", branch: "CIKOKOL", city: "Tangerang", distanceKm: 12 },
  origin: "automatic_earthquake" as const,
};

const first = await service.createOrGet(input);
const second = await service.createOrGet(input);
assert.equal(first.disposition, "CREATED");
assert.equal(second.disposition, "EXISTING");
assert.equal(first.incident.id, second.incident.id);
assert.equal(incidents.length, 1);

const otherStore = await service.createOrGet({ ...input, store: { ...input.store, id: "TKO-002", name: "Alfamart Dua" } });
assert.equal(otherStore.disposition, "CREATED");
const otherEvent = await service.createOrGet({ ...input, event: { ...input.event, id: "BMKG-EQ-002" } });
assert.equal(otherEvent.disposition, "CREATED");
assert.equal(incidents.length, 3);

const parallel = await Promise.all(Array.from({ length: 10 }, () => service.createOrGet({ ...input, store: { ...input.store, id: "TKO-003", name: "Alfamart Tiga" } })));
assert.equal(new Set(parallel.map((item) => item.incident.id)).size, 1);

legacyResult = { ...first.incident, id: "LAP-LEGACY-ACTIVE", canonicalEarthquakeEventId: undefined, canonicalStoreId: undefined, earthquakeIdentityVersion: undefined };
const legacySuppressed = await service.createOrGet({ ...input, event: { ...input.event, id: "BMKG-EQ-LEGACY" }, store: { ...input.store, id: "TKO-LEGACY" } });
assert.equal(legacySuppressed.disposition, "HISTORICAL_ACTIVE_SUPPRESSION");
assert.equal(legacySuppressed.incident.id, "LAP-LEGACY-ACTIVE");
legacyResult = null;

manualCandidates = [{ ...first.incident, id: "LAP-MANUAL-UNLINKED", reportOrigin: "manual", earthquakeEventId: undefined, canonicalEarthquakeEventId: undefined, canonicalStoreId: undefined }];
const uncertain = await service.createOrGet({ ...input, event: { ...input.event, id: "BMKG-EQ-UNCERTAIN" }, store: { ...input.store, id: "TKO-UNCERTAIN" } });
assert.equal(uncertain.disposition, "UNCERTAIN_MATCH_REVIEW");
assert.equal(reviews.at(-1)?.candidateReportId, "LAP-MANUAL-UNLINKED");
assert.equal(incidents.some((item) => item.canonicalEarthquakeEventId === "BMKG-EQ-UNCERTAIN"), false);

console.log("[PASS] Earthquake event/store uniqueness and concurrent create-or-get scenarios");
