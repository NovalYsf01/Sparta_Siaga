/**
 * Pure PR #7 smoke tests: no database, production secrets, or external network.
 * Live browser / authenticated API UAT remains a separate manual sign-off.
 */
import assert from "node:assert/strict";
import React from "react";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import type { IncidentRecord } from "../types/incident";
import type { UserContext } from "../lib/report-permissions";
import { canViewReport } from "../lib/report-permissions";
import { isEvidencePhotoLinked } from "../lib/inspection-photo-access";
import { getHoAttentionReasons, getReportTarget, isFinalPdfAvailable } from "../lib/ho-report-monitoring";
import { generateMonitoringReportPdf } from "../lib/pdf-generator";
import { appendInspectionEvidencePages } from "../lib/pdf-evidence-appendix";
import { HoReportMonitoring } from "../components/reports/ho-report-monitoring";

const reportA: IncidentRecord = {
  id: "LAP-HO-TEST-A",
  date: "19 Okt 2026",
  createdAt: "2026-10-19T08:00:00+07:00",
  updatedAt: "2026-10-19T09:00:00+07:00",
  disasterType: "earthquake",
  reportOrigin: "automatic_earthquake",
  storeId: "STORE-001",
  storeName: "Toko Contoh Bandung",
  branch: "BANDUNG",
  locationCity: "Bandung",
  status: "pending_bm_approval",
  progress: 0,
  fieldPhotos: ["/api/incidents/LAP-HO-TEST-A/inspection/evidence/wm_LAP-HO-TEST-A_1790000000000_abc.jpg"],
  timeline: [{ stage: "Laporan Masuk", label: "Laporan dicatat", timestamp: "2026-10-19", actor: "System" }],
};
const reportB: IncidentRecord = {
  ...reportA,
  id: "LAP-HO-TEST-B",
  storeName: "Toko Contoh Jakarta",
  branch: "JAKARTA",
  status: "in_maintenance",
  progress: 55,
  maintenanceTicket: { ticketId: "TCK-B", completedAt: "2026-10-17T23:59:00+07:00" },
  fieldPhotos: [],
};
const branchUser: UserContext = {
  id: "u-bdg", name: "Petugas Bandung", systemRole: "USER", scope: "BRANCH", branch: "BANDUNG", role: "bms",
};
const hoUser: UserContext = {
  id: "u-ho", name: "HO", systemRole: "USER", scope: "HO", branch: null, role: "ho_admin",
};
assert.equal(canViewReport(branchUser, reportA), true, "Same-branch user should view");
assert.equal(canViewReport(branchUser, reportB), false, "Cross-branch user must be blocked");
assert.equal(canViewReport(hoUser, reportB), true, "HO reads reports nationally");
assert.equal(getReportTarget(reportB), "2026-10-17T23:59:00+07:00");
assert.ok(getHoAttentionReasons(reportA).some(reason => reason.includes("BnM")), "Pending BnM must require attention");
assert.ok(getHoAttentionReasons(reportB, Date.parse("2026-10-19T09:00:00+07:00")).some(reason => reason.includes("terlewati")), "Overdue target");
assert.equal(isFinalPdfAvailable(reportA), false, "No final PDF for unfinished report");
assert.equal(isFinalPdfAvailable({ ...reportB, status: "closed" }), true);
assert.equal(isEvidencePhotoLinked(reportA, reportA.id, "wm_LAP-HO-TEST-A_1790000000000_abc.jpg"), true);
assert.equal(isEvidencePhotoLinked(reportA, reportA.id, "wm_LAP-HO-TEST-B_1790000000000_abc.jpg"), false, "Unlinked photo must be blocked");
assert.equal(isEvidencePhotoLinked(reportB, reportB.id, "wm_LAP-HO-TEST-A_1790000000000_abc.jpg"), false, "Other report evidence must not leak");

const html = renderToStaticMarkup(React.createElement(HoReportMonitoring, { incidents: [reportA, reportB] }));
assert.ok(html.includes("Semua Laporan (2)"), "All-report tab rendered");
assert.ok(html.includes("Perlu Perhatian (2)"), "Attention count rendered");
assert.ok(html.includes("Toko Contoh Bandung"), "Table rows rendered");
assert.ok(html.includes("Toko Contoh Jakarta"), "Second branch visible to HO");
assert.ok(!html.includes("Update Progress"), "HO has no progress action in monitoring");
assert.ok(!html.includes("Buat Laporan"), "HO has no report creation action");
const pdf = generateMonitoringReportPdf(reportB);
assert.ok(pdf.subarray(0, 8).toString("latin1").startsWith("%PDF-1.4"), "PDF header");
assert.ok(pdf.toString("latin1").includes("BUKAN DOKUMEN FINAL"), "Monitoring PDF must be non-final");
assert.ok(pdf.toString("latin1").includes("TCK-B"), "Actual maintenance ticket must appear");
const samplePhoto = await sharp({
  create: { width: 64, height: 48, channels: 3, background: { r: 35, g: 65, b: 95 } },
}).png().toBuffer();
const pdfWithEvidence = await appendInspectionEvidencePages(pdf, [{ buffer: samplePhoto }]);
assert.ok(pdfWithEvidence.length > pdf.length, "Photo appendix increases PDF length");
assert.ok(pdfWithEvidence.toString("latin1").includes("/Count 2"), "PDF document has evidence page");
console.log("HO PR #7 smoke tests PASS (render, tabs, status, PDF, photo appendix and branch/photo rules)");
