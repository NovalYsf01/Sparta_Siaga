import { execSync } from "child_process";

const testScripts = [
  "scripts/test-detail-laporan-readonly.ts",
  "scripts/test-simplified-inspection.ts",
  "scripts/test-earthquake-rejection-guardrail.ts",
  "scripts/test-role-permissions-overhaul.ts",
  "scripts/test-milestone-serah-terima-flow.ts",
  "scripts/test-notifications-and-cleanup.ts",
  "scripts/test-pwa-push-architecture.ts",
  "scripts/test-mobile-responsive-modals.ts",
  "scripts/test-ui-menu-and-language.ts",
  "scripts/test-user-management-audit.ts",
  "scripts/verify-simulation-scenarios.ts",
];

console.log("==============================================================");
console.log("🏁 RUNNING ALL PROJECT SPARTA CORRECTIVE AUDIT SUITES");
console.log("==============================================================\n");

let passed = 0;
for (const script of testScripts) {
  try {
    console.log(`▶ Executing ${script}...`);
    execSync(`pnpm exec tsx ${script}`, { stdio: "inherit" });
    passed++;
    console.log(`✔ ${script} PASSED\n`);
  } catch (err: any) {
    console.error(`❌ ${script} FAILED`);
    process.exit(1);
  }
}

console.log("==============================================================");
console.log(`🏆 ALL ${passed}/${testScripts.length} AUDIT SUITES PASSED 100%!`);
console.log("==============================================================");
