import assert from "node:assert/strict";
import { canReadIncidentEvidence, canUploadIncidentEvidence, validateEvidenceMetadata } from "../lib/incident-evidence-service";
import type { IncidentRecord } from "../types/incident";

const report: IncidentRecord = { id: "LAP-1", date: "9 Okt 2026", disasterType: "earthquake", reportOrigin: "automatic_earthquake", storeId: "TKO-1", storeName: "Toko", branch: "CIKOKOL", locationCity: "Tangerang", status: "field_inspection_required", progress: 0, timeline: [], createdAt: "2026-10-09T00:00:00Z", updatedAt: "2026-10-09T00:00:00Z" };
const timToko = { id: "u1", name: "Tim", role: "tim_toko" as const, systemRole: "USER" as const, scope: "BRANCH" as const, branch: "CIKOKOL", storeId: "TKO-1" };
const bm = { ...timToko, id: "u2", role: "bm" as const, storeId: null };
const ho = { ...timToko, id: "u3", role: "gm_ho" as const, scope: "HO" as const, branch: null, storeId: null };

assert.equal(canUploadIncidentEvidence(timToko, report), true);
assert.equal(canUploadIncidentEvidence({ ...timToko, storeId: "TKO-2" }, report), false);
assert.equal(canUploadIncidentEvidence(bm, report), false);
assert.equal(canReadIncidentEvidence(bm, report), true);
assert.equal(canReadIncidentEvidence({ ...bm, branch: "SIDOARJO" }, report), false);
assert.equal(canReadIncidentEvidence(ho, report), true);
assert.equal(canReadIncidentEvidence({ ...ho, systemRole: "ADMIN", role: null }, report), true);

assert.deepEqual(validateEvidenceMetadata({ caption: "Kondisi rak", origin: "GALLERY_SELF" }), { valid: true });
assert.equal(validateEvidenceMetadata({ caption: "", origin: "GALLERY_SELF" }).code, "CAPTION_REQUIRED");
assert.equal(validateEvidenceMetadata({ caption: "Info warga", origin: "GALLERY_THIRD_PARTY" }).code, "THIRD_PARTY_SOURCE_REQUIRED");
assert.deepEqual(validateEvidenceMetadata({ caption: "Info warga", origin: "GALLERY_THIRD_PARTY", thirdPartySourceDescription: "Petugas keamanan setempat" }), { valid: true });

console.log("[PASS] Initial evidence provenance and authorization scenarios");
