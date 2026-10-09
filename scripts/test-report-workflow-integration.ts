import assert from "node:assert/strict";
import { createReportWorkflowService, type ReportWorkflowRepository } from "../lib/report-workflow-service";
import type { IncidentRecord } from "../types/incident";
import type { IncidentConfirmationDecision, IncidentInspectionSubmission } from "../types/report-workflow";

const report: IncidentRecord = {
  id: "LAP-EQ-TEST-001", date: "9 Okt 2026", disasterType: "earthquake",
  reportOrigin: "automatic_earthquake", storeId: "TKO-001", storeName: "Toko 1",
  branch: "CIKOKOL", locationCity: "Tangerang", status: "field_inspection_required",
  progress: 0, timeline: [], createdAt: "2026-10-09T00:00:00.000Z",
  updatedAt: "2026-10-09T00:00:00.000Z", latestInspectionVersion: 0,
};
const submissions: IncidentInspectionSubmission[] = [];
const decisions: IncidentConfirmationDecision[] = [];
const repository: ReportWorkflowRepository = {
  transaction: async (work) => work(repository),
  lockIncident: async () => report,
  countEvidenceForReport: async () => 1,
  insertSubmission: async (submission) => { submissions.push(submission); },
  getSubmission: async (_, version) => submissions.find((item) => item.version === version) ?? null,
  insertDecision: async (decision) => { decisions.push(decision); },
  updateIncident: async (_, patch) => { Object.assign(report, patch); return report; },
};
const service = createReportWorkflowService(repository, () => new Date("2026-10-09T01:00:00.000Z"));

const timToko = { id: "u-store", name: "Tim Toko", role: "tim_toko" as const, systemRole: "USER" as const, scope: "BRANCH" as const, branch: "CIKOKOL", storeId: "TKO-001" };
const bm = { id: "u-bm", name: "Manager", role: "bm" as const, systemRole: "USER" as const, scope: "BRANCH" as const, branch: "CIKOKOL", storeId: null };

const submitted = await service.submitInspection({ reportId: report.id, verificationLevel: "FIELD_VERIFIED", conditionNotes: "Rak dan dinding sudah diperiksa", evidenceCount: 1 }, timToko);
assert.equal(submitted.status, "awaiting_manager_confirmation");
assert.equal(submitted.latestInspectionVersion, 1);
assert.equal(submissions.length, 1);

const clarified = await service.decideInitialReport({ reportId: report.id, submissionVersion: 1, decision: "CLARIFICATION_REQUIRED", reason: "Foto sisi belakang belum jelas" }, bm);
assert.equal(clarified.status, "clarification_required");
assert.equal(decisions.length, 1);

const resubmitted = await service.submitInspection({ reportId: report.id, verificationLevel: "FIELD_VERIFIED", conditionNotes: "Foto sisi belakang ditambahkan", evidenceCount: 2 }, timToko);
assert.equal(resubmitted.latestInspectionVersion, 2);
assert.equal(submissions.length, 2);
assert.equal(decisions.length, 1, "clarification decision history remains intact");

await assert.rejects(
  () => service.decideInitialReport({ reportId: report.id, submissionVersion: 1, decision: "DAMAGE_CONFIRMED" }, bm),
  (error: Error & { code?: string }) => error.code === "STALE_SUBMISSION",
);

await assert.rejects(
  () => service.decideInitialReport(
    { reportId: report.id, submissionVersion: 2, decision: "NO_DAMAGE_CONFIRMED" },
    { ...bm, id: "u-other-bm", branch: "SIDOARJO" },
  ),
  (error: Error & { code?: string }) => error.code === "CONFIRMATION_FORBIDDEN",
);

const safe = await service.decideInitialReport(
  { reportId: report.id, submissionVersion: 2, decision: "NO_DAMAGE_CONFIRMED" },
  bm,
);
assert.equal(safe.status, "confirmed_safe");
assert.equal(safe.verification?.isDamaged, false);

console.log("[PASS] Report inspection, clarification, resubmission, and stale-decision scenarios");
