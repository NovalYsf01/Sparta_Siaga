import { MILESTONE_ORDER, MILESTONE_CONFIG } from "../types/incident";
import { resolveApprovalRoute } from "../lib/completion-approval-service";

console.log("=== Testing Milestone & Serah Terima Workflow ===");

// 1. Verify 5 Milestones
if (MILESTONE_ORDER.length !== 5) {
  console.error(`FAIL: Expected 5 milestones, got ${MILESTONE_ORDER.length}`);
  process.exit(1);
}

const expectedMilestones = [
  { key: "CEKLIS", progress: 10 },
  { key: "ESTIMASI", progress: 25 },
  { key: "APPROVE_PROXY", progress: 30 },
  { key: "SPK", progress: 50 },
  { key: "SERAH_TERIMA", progress: 100 },
];

for (const expected of expectedMilestones) {
  const config = MILESTONE_CONFIG[expected.key as keyof typeof MILESTONE_CONFIG];
  if (!config) {
    console.error(`FAIL: Milestone ${expected.key} missing in MILESTONE_CONFIG`);
    process.exit(1);
  }
  if (config.progress !== expected.progress) {
    console.error(`FAIL: Milestone ${expected.key} progress is ${config.progress}, expected ${expected.progress}`);
    process.exit(1);
  }
}

// 2. Verify Domain Routing for Serah Terima
const tokoRoute = resolveApprovalRoute({ tkpType: "toko" } as any, null);
if (tokoRoute.picRole !== "bms" || tokoRoute.coordinatorRole !== "bmc") {
  console.error(`FAIL: Toko route mismatch: pic=${tokoRoute.picRole}, coord=${tokoRoute.coordinatorRole}`);
  process.exit(1);
}

const dcRoute = resolveApprovalRoute({ tkpType: "dc" } as any, null);
if (dcRoute.picRole !== "bes" || dcRoute.coordinatorRole !== "bec") {
  console.error(`FAIL: DC route mismatch: pic=${dcRoute.picRole}, coord=${dcRoute.coordinatorRole}`);
  process.exit(1);
}

const buildingRoute = resolveApprovalRoute({ tkpType: "building" } as any, null);
if (buildingRoute.picRole !== "bbs" || buildingRoute.coordinatorRole !== "bbc") {
  console.error(`FAIL: Building route mismatch: pic=${buildingRoute.picRole}, coord=${buildingRoute.coordinatorRole}`);
  process.exit(1);
}

console.log("✔ Milestone and Serah Terima Workflow logic verified successfully!");
