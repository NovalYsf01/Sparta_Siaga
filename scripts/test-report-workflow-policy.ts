import assert from "node:assert/strict";
import {
  canConfirmInitialReport,
  canSubmitInspection,
  isTechnicalWorkflowEligible,
  nextInitialStatus,
} from "../lib/report-workflow-policy";
import type { IncidentRecord } from "../types/incident";
import type { UserContext } from "../lib/report-permissions";

function user(overrides: Partial<UserContext>): UserContext {
  return {
    id: "usr-test",
    name: "Test User",
    role: "tim_toko",
    systemRole: "USER",
    scope: "BRANCH",
    branch: "CIKOKOL",
    storeId: "TKO-001",
    ...overrides,
  } as UserContext;
}

function incident(overrides: Partial<IncidentRecord>): IncidentRecord {
  return {
    id: "LAP-TEST-001",
    date: "9 Okt 2026",
    disasterType: "earthquake",
    reportOrigin: "automatic_earthquake",
    storeId: "TKO-001",
    storeName: "Alfamart Test",
    branch: "CIKOKOL",
    locationCity: "Tangerang",
    status: "field_inspection_required",
    progress: 0,
    timeline: [],
    createdAt: "2026-10-09T00:00:00.000Z",
    updatedAt: "2026-10-09T00:00:00.000Z",
    ...overrides,
  };
}

const ownStoreReport = incident({});
const awaitingReport = incident({ status: "awaiting_manager_confirmation" });

assert.equal(
  canSubmitInspection(user({}), ownStoreReport),
  true,
  "Tim Toko assigned to the incident store can submit inspection",
);
assert.equal(
  canSubmitInspection(user({ storeId: "TKO-999" } as Partial<UserContext>), ownStoreReport),
  false,
  "Tim Toko from another store cannot submit inspection",
);
assert.equal(
  canConfirmInitialReport(user({ role: "bm", storeId: undefined } as Partial<UserContext>), awaitingReport),
  true,
  "same-branch Manager Branch can confirm",
);
assert.equal(canConfirmInitialReport(user({}), awaitingReport), false, "Tim Toko cannot confirm");
assert.equal(
  canConfirmInitialReport(user({ role: "gm_ho", scope: "HO", branch: null } as Partial<UserContext>), awaitingReport),
  false,
  "HO cannot confirm",
);
assert.equal(
  canConfirmInitialReport(user({ systemRole: "ADMIN", role: null } as Partial<UserContext>), awaitingReport),
  false,
  "System Admin cannot confirm",
);
assert.equal(
  canConfirmInitialReport(user({ role: "bm", branch: "SIDOARJO" } as Partial<UserContext>), awaitingReport),
  false,
  "another-branch Manager Branch cannot confirm",
);

assert.equal(
  nextInitialStatus("awaiting_manager_confirmation", "DAMAGE_CONFIRMED"),
  "confirmed_affected",
);
assert.equal(
  nextInitialStatus("awaiting_manager_confirmation", "NO_DAMAGE_CONFIRMED"),
  "confirmed_safe",
);
assert.equal(
  nextInitialStatus("awaiting_manager_confirmation", "CLARIFICATION_REQUIRED"),
  "clarification_required",
);

assert.equal(isTechnicalWorkflowEligible(incident({ status: "confirmed_affected" })), true);
assert.equal(isTechnicalWorkflowEligible(incident({ status: "confirmed_safe" })), false);
assert.equal(isTechnicalWorkflowEligible(incident({ status: "preliminary_unverified" })), false);

console.log("[PASS] Report workflow policy scenarios");
