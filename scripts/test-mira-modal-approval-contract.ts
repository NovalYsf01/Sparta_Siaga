import assert from "node:assert/strict";
import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

const appDialog = read("components/shared/app-dialog.tsx");
const dialogPrimitive = read("components/ui/dialog.tsx");
assert.match(appDialog, /<DialogContent/);
assert.match(appDialog, /<DialogTitle/);
assert.match(appDialog, /overlayClassName=/);
assert.match(dialogPrimitive, /<DialogPortal>/);
assert.match(dialogPrimitive, /overlayClassName/);

for (const path of [
  "components/incident/select-report-modal.tsx",
  "components/incident/maintenance-tracking-modal.tsx",
  "components/incident/progress-update-modal.tsx",
  "components/incident/store-verification-modal.tsx",
]) {
  const source = read(path);
  assert.match(source, /<AppDialog/ , `${path} must use the shared modal portal`);
  assert.doesNotMatch(source, /useBodyScrollLock\(isOpen\)/, `${path} must not use legacy body-lock`);
}

const details = read("components/incident/maintenance-tracking-modal.tsx");
assert.match(details, /<span>3\. Approval<\/span>/);
assert.doesNotMatch(details, /Estimasi & Approval|Ketentuan Estimasi Biaya SPARTA SIAGA/);
assert.match(details, /<CompletionApprovalCard[\s\S]*?readOnly\s*\/>/);

const approvalCard = read("components/incident/completion-approval-card.tsx");
assert.match(approvalCard, /!readOnly && !isResolved/);
assert.match(approvalCard, /!readOnly && activeModal/);
assert.match(approvalCard, /canClose && !isSysAdmin && isSameBranch/);

const service = read("lib/completion-approval-service.ts");
for (const method of ["approveByManager", "rejectByManager"]) {
  const start = service.indexOf(`static async ${method}(`);
  const end = service.indexOf("\n  static async ", start + 10);
  const methodCode = service.slice(start, end < 0 ? undefined : end);
  assert.match(methodCode, /WAITING_MANAGER_APPROVAL/);
  assert.doesNotMatch(methodCode, /WAITING_COORDINATOR_APPROVAL" && isSystemAdmin/);
}
console.log("PASS: Mira dialog portal, read-only approval, and same-branch action contract");
