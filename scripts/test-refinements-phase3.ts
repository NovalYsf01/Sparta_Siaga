import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== RUNNING REFINEMENTS PHASE 3 TDD CONTRACT SUITE ===");

// 1. Audit app/api/locations/facilities/route.ts
const facilitiesRoute = fs.readFileSync("app/api/locations/facilities/route.ts", "utf8");
// Must not restrict national DC map visibility by branch_id = user.branch
assert.doesNotMatch(
  facilitiesRoute,
  /where\.push\(`branch_id = \$\{add\(user\.branch\)\}`\)/,
  "Facilities API must not restrict national DC visibility by user.branch"
);

// 2. Audit components/map/map-inner.tsx
const mapInner = fs.readFileSync("components/map/map-inner.tsx", "utf8");

// Task 2: Must not use broken querySelector('.leaflet-container')
assert.doesNotMatch(
  mapInner,
  /document\.querySelector\('\.leaflet-container'\)/,
  "Must not use broken querySelector for Leaflet map navigation"
);

// Task 2: Point action must be "Lihat Lokasi di Peta"
assert.match(
  mapInner,
  /Lihat Lokasi di Peta/,
  "Flood point action button must be labeled 'Lihat Lokasi di Peta'"
);

// Task 4: Store popup button must be "Lihat Detail", not "Detail & Aksi Laporan"
assert.doesNotMatch(
  mapInner,
  /Detail & Aksi Laporan/,
  "Store popup must no longer display 'Detail & Aksi Laporan'"
);
assert.match(
  mapInner,
  /Lihat Detail/,
  "Store popup button must be labeled 'Lihat Detail'"
);

// 3. Audit Task 6: "PIC Otomatis" replaced by "PIC Penanggung Jawab"
const activeTable = fs.readFileSync("components/dashboard/active-incidents-table.tsx", "utf8");
const reportCenter = fs.readFileSync("components/reports/operational-report-center.tsx", "utf8");

assert.doesNotMatch(
  activeTable,
  /<th[^>]*>PIC Otomatis<\/th>/,
  "ActiveIncidentsTable header must not say 'PIC Otomatis'"
);
assert.match(
  activeTable,
  /<th[^>]*>PIC Penanggung Jawab<\/th>/,
  "ActiveIncidentsTable header must say 'PIC Penanggung Jawab'"
);

assert.doesNotMatch(
  reportCenter,
  /<th[^>]*>PIC Otomatis<\/th>/,
  "OperationalReportCenter header must not say 'PIC Otomatis'"
);
assert.match(
  reportCenter,
  /<th[^>]*>PIC Penanggung Jawab<\/th>/,
  "OperationalReportCenter header must say 'PIC Penanggung Jawab'"
);

// 4. Audit Task 5: Status labels distinguishing Menunggu Pengajuan Serah Terima, Menunggu Persetujuan Koordinator, Menunggu Persetujuan Akhir, Case Close
const statusFile = fs.readFileSync("lib/operational-status.ts", "utf8");
assert.match(
  statusFile,
  /Menunggu Pengajuan Serah Terima/,
  "Must include Menunggu Pengajuan Serah Terima"
);
assert.match(
  statusFile,
  /Menunggu Persetujuan Koordinator/,
  "Must include Menunggu Persetujuan Koordinator"
);
assert.match(
  statusFile,
  /Menunggu Persetujuan Akhir/,
  "Must include Menunggu Persetujuan Akhir"
);
assert.match(
  statusFile,
  /Case Close/,
  "Must include Case Close"
);

import { getStandardizedOperationalStatus } from "../lib/operational-status";

// Test Babakan Sari case (100% progress but awaiting_st)
const babakanSari = {
  id: "INC-MAN-1792116839286",
  status: "awaiting_st",
  progress: 100,
  primaryPicUserId: null,
} as any;
const babakanStatus = getStandardizedOperationalStatus(babakanSari);
assert.equal(
  babakanStatus.label,
  "Menunggu Pengajuan Serah Terima",
  "Babakan Sari must display 'Menunggu Pengajuan Serah Terima'"
);

// Test Coordinator Approval
const coordApproval = {
  id: "INC-TEST-001",
  status: "in_maintenance",
  progress: 100,
  completionApprovalStatus: "WAITING_COORDINATOR_APPROVAL",
} as any;
assert.equal(
  getStandardizedOperationalStatus(coordApproval).label,
  "Menunggu Persetujuan Koordinator"
);

// Test Final Approval
const managerApproval = {
  id: "INC-TEST-002",
  status: "pending_final_approval",
  progress: 100,
  completionApprovalStatus: "WAITING_MANAGER_APPROVAL",
} as any;
assert.equal(
  getStandardizedOperationalStatus(managerApproval).label,
  "Menunggu Persetujuan Akhir"
);

// Test Case Close
const closedIncident = {
  id: "INC-TEST-003",
  status: "closed",
  progress: 100,
} as any;
assert.equal(
  getStandardizedOperationalStatus(closedIncident).label,
  "Case Close"
);

console.log("PASS: Refinements Phase 3 contract verified!");
