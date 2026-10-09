# Report Workflow Corrective Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct SPARTA SIAGA report intake, field inspection, Manager Branch confirmation, earthquake deduplication, and protected evidence handling without disrupting historical data or the existing Task 1–7 technical workflow.

**Architecture:** Keep `incidents` as the compatibility anchor and add append-only inspection, decision, evidence, and match-review records. A single server-side workflow service owns lifecycle transitions and transactional event/store uniqueness; narrow APIs and role-specific UI consume it. Historical statuses, branch-level automatic incidents, and photo URLs remain readable through compatibility adapters and are never destructively rewritten.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, PostgreSQL/Aiven-compatible SQL, `pg`, private filesystem storage, existing script-based integration harness.

## Global Constraints

- Work only on Git `development`; do not merge to `main`.
- This is a corrective to Tasks 1–7, not Task 8.
- Preserve all operational incidents, evidence, audit history, accounts, permissions, and `usr_seed_admin`.
- Preserve canonical organizational branch mappings; stores never become organizational branches.
- Do not execute schema migration or mutate operational Aiven data without separate explicit approval.
- Before an operational migration, stop and provide exact SQL, affected objects, duplicate-audit results, verified backup evidence, risks, and rollback procedure.
- Do not silently merge uncertain manual/BMKG matches.
- Do not claim WhatsApp/email delivery unless an actual integration proves it.
- Report every verification as PASS, FAIL, BLOCKED, or UNVERIFIED.
- Use a failing test before each production behavior change.

## File Structure

### New files

- `types/report-workflow.ts` — lifecycle, submission, decision, evidence, and match-review contracts.
- `lib/report-workflow-policy.ts` — pure transition, role, evidence, and compatibility rules.
- `lib/report-workflow-service.ts` — transactional lifecycle and decision persistence.
- `lib/earthquake-incident-service.ts` — canonical event/store create-or-get and uncertain-match logic.
- `lib/incident-evidence-service.ts` — private initial-evidence storage and metadata persistence.
- `database/migrations/002_report_workflow_corrective.sql` — additive schema only.
- `database/migrations/002_report_workflow_corrective.rollback.sql.example` — reviewed manual rollback; excluded from automatic migration filename matching.
- `scripts/audit-report-workflow-migration.ts` — read-only duplicate/schema audit.
- `scripts/tsx-windows-user-shim.cjs` — local Windows runner workaround for the confirmed Node/tsx startup issue.
- `scripts/test-report-workflow-policy.ts` — pure lifecycle and authorization tests.
- `scripts/test-report-workflow-integration.ts` — isolated-database lifecycle tests.
- `scripts/test-earthquake-store-dedup.ts` — event/store uniqueness and race tests.
- `scripts/test-initial-evidence-security.ts` — evidence validation/access tests.
- `app/api/incidents/[id]/inspection/route.ts` — Tim Toko inspection/resubmission endpoint.
- `app/api/incidents/[id]/evidence/route.ts` — metadata listing and authorized upload.
- `app/api/incidents/[id]/evidence/[evidenceId]/route.ts` — protected evidence streaming.
- `components/incident/incident-evidence-gallery.tsx` — phase-separated evidence display.
- `components/incident/field-inspection-form.tsx` — Tim Toko inspection/resubmission UI.
- `components/incident/manager-confirmation-panel.tsx` — three-decision BM UI.

### Existing files modified

- `types/incident.ts` — additive status and compatibility fields.
- `types/permission.ts` — remove Tim Toko confirmation authority.
- `lib/permission-service.ts` — explicit BM role and canonical branch guard.
- `lib/incident-db.ts` — map additive identity fields and remove unsafe create upsert semantics.
- `lib/server-daemon.ts` — selected-store create-or-get flow.
- `lib/storage-config.ts` — initial-evidence private directory.
- `app/api/incidents/route.ts` — narrow server-owned manual creation command.
- `app/api/incidents/[id]/route.ts` — include authorized evidence metadata.
- `app/api/incidents/[id]/confirm/route.ts` — delegate three decisions to workflow service.
- Estimation/readiness/progress/completion/close routes — assert technical eligibility without changing their established internal stages.
- `components/incident/camera-capture.tsx` — preserve camera behavior; return typed evidence input.
- `components/incident/field-photo-uploader.tsx` — gallery provenance and source metadata.
- `components/incident/manual-incident-modal.tsx` — narrow create/submit flow and duplicate response.
- `components/incident/store-verification-modal.tsx` — replace legacy self-confirmation usage.
- `components/incident/maintenance-tracking-modal.tsx` — embed role-specific initial workflow and evidence gallery.
- Report/monitoring list components — lifecycle labels and task visibility.
- `package.json` — stable Windows-compatible test command using the preload shim.
- Production schema and QA documentation — additive baseline and actual verification report.

---

### Task 1: Stabilize the test runner and establish red baselines

**Files:**
- Create: `scripts/tsx-windows-user-shim.cjs`
- Create: `scripts/test-report-workflow-policy.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm run test:tsx -- <script>` that starts `tsx` on this Windows host without invoking the failing `os.userInfo()` path.
- Produces: initial failing policy assertions for Tasks 2–4.

- [ ] **Step 1: Add the minimal Windows preload shim**

```js
if (process.platform === "win32" && typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}
```

- [ ] **Step 2: Add a deterministic runner script**

```json
{
  "scripts": {
    "test:tsx": "node --require ./scripts/tsx-windows-user-shim.cjs ./node_modules/tsx/dist/cli.mjs"
  }
}
```

- [ ] **Step 3: Prove the blocker is isolated**

Run: `pnpm.cmd run test:tsx -- --version`  
Expected: prints `tsx v4.23.15` and Node `v24.x`, with no `uv_os_get_passwd` error.

- [ ] **Step 4: Write failing pure-policy tests**

```ts
assert.equal(canSubmitInspection(timTokoOwnStore, automaticOwnStore), true);
assert.equal(canSubmitInspection(timTokoOtherStore, automaticOwnStore), false);
assert.equal(canConfirmInitialReport(branchManagerOwnBranch, awaitingReport), true);
assert.equal(canConfirmInitialReport(timTokoOwnStore, awaitingReport), false);
assert.equal(canConfirmInitialReport(hoViewer, awaitingReport), false);
assert.equal(canConfirmInitialReport(systemAdmin, awaitingReport), false);
assert.equal(nextInitialStatus("awaiting_manager_confirmation", "NO_DAMAGE_CONFIRMED"), "confirmed_safe");
assert.equal(nextInitialStatus("awaiting_manager_confirmation", "CLARIFICATION_REQUIRED"), "clarification_required");
```

- [ ] **Step 5: Run the test and verify RED**

Run: `pnpm.cmd run test:tsx -- scripts/test-report-workflow-policy.ts`  
Expected: FAIL because `report-workflow-policy` does not exist.

- [ ] **Step 6: Commit the runner isolation and red test**

```text
test: isolate Windows tsx startup failure
```

### Task 2: Define additive workflow contracts and pure policy

**Files:**
- Create: `types/report-workflow.ts`
- Create: `lib/report-workflow-policy.ts`
- Modify: `types/incident.ts`
- Modify: `types/permission.ts`
- Test: `scripts/test-report-workflow-policy.ts`

**Interfaces:**
- Produces: `InitialWorkflowStatus`, `InspectionVerificationLevel`, `ManagerDecisionType`, `EvidenceOrigin`, `IncidentInspectionSubmission`, `IncidentConfirmationDecision`, `IncidentEvidence`.
- Produces: `canSubmitInspection(user, report)`, `canConfirmInitialReport(user, report)`, `validateInspectionSubmission(input)`, `nextInitialStatus(status, decision)`, `isTechnicalWorkflowEligible(report)`.

- [ ] **Step 1: Define exact domain unions**

```ts
export type InitialWorkflowStatus =
  | "draft"
  | "preliminary_unverified"
  | "field_inspection_required"
  | "awaiting_manager_confirmation"
  | "clarification_required";

export type ManagerDecisionType =
  | "DAMAGE_CONFIRMED"
  | "NO_DAMAGE_CONFIRMED"
  | "CLARIFICATION_REQUIRED";

export type EvidenceOrigin =
  | "CAMERA_SELF"
  | "GALLERY_SELF"
  | "GALLERY_THIRD_PARTY";
```

- [ ] **Step 2: Add backward-compatible statuses to `IncidentStatus`**

Add the five initial states while retaining every existing state, including
`pending_confirmation`, `verifying`, `confirmed_affected`, `confirmed_safe`,
technical states, `resolved`, and `archived`.

- [ ] **Step 3: Implement strict policy rules**

```ts
export function canConfirmInitialReport(user: UserContext, report: IncidentRecord): boolean {
  return user.systemRole !== "ADMIN"
    && user.scope === "BRANCH"
    && user.role === "bm"
    && sameCanonicalBranch(user.branch, report.branch)
    && report.status === "awaiting_manager_confirmation";
}

export function isTechnicalWorkflowEligible(report: IncidentRecord): boolean {
  return report.status === "confirmed_affected"
    || ["investigating", "in_estimation", "awaiting_spk", "spk_issued", "in_maintenance", "in_construction", "awaiting_st", "resolved"].includes(report.status);
}
```

- [ ] **Step 4: Remove `REPORT_CONFIRM` and `REPORT_CLOSE` from Tim Toko catalog/defaults**

Retain `REPORT_VIEW_OWN`, `REPORT_FOLLOW_UP`, and notification visibility needed
for store tasks. Do not modify BM final-closure permissions.

- [ ] **Step 5: Run policy tests and verify GREEN**

Run: `pnpm.cmd run test:tsx -- scripts/test-report-workflow-policy.ts`  
Expected: PASS for store-scoped inspection, BM-only confirmation, three decisions,
preliminary separation, and technical eligibility.

- [ ] **Step 6: Run existing permission regressions**

Run: `pnpm.cmd run test:tsx -- scripts/test-canonical-branch-and-legacy-overrides.ts`  
Run: `pnpm.cmd run test:tsx -- scripts/test-admin-permission-scopes.ts`  
Expected: PASS; update only assertions that previously encoded Tim Toko self-confirmation.

- [ ] **Step 7: Commit**

```text
fix(auth): reserve initial confirmation for BM

- Keep store inspection separate from branch confirmation
- Preserve final BM closure and legacy override audit behavior
```

### Task 3: Add and validate the non-destructive schema migration

**Files:**
- Create: `database/migrations/002_report_workflow_corrective.sql`
- Create: `database/migrations/002_report_workflow_corrective.rollback.sql.example`
- Create: `scripts/audit-report-workflow-migration.ts`
- Create: `scripts/test-report-workflow-migration.ts`
- Modify: `database/migrations/001_production_baseline.sql`
- Modify: `database/migrations/README.md`

**Interfaces:**
- Produces tables `incident_inspection_submissions`, `incident_confirmation_decisions`, `incident_evidence`, `incident_earthquake_match_reviews`.
- Produces incident columns `canonical_earthquake_event_id`, `canonical_store_id`, `earthquake_identity_version`, `latest_inspection_version`.
- Produces a partial unique index `uq_incident_event_store_v1`.

- [ ] **Step 1: Write a migration structure test and verify RED**

The test reads the SQL and asserts `CREATE TABLE IF NOT EXISTS` for all four new
tables, no `DROP TABLE`, no `DELETE`, no `TRUNCATE`, and the partial-index
predicate `earthquake_identity_version = 1`.

Run: `pnpm.cmd run test:tsx -- scripts/test-report-workflow-migration.ts`  
Expected: FAIL because migration `002` is absent.

- [ ] **Step 2: Write additive DDL**

```sql
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS canonical_earthquake_event_id TEXT,
  ADD COLUMN IF NOT EXISTS canonical_store_id TEXT,
  ADD COLUMN IF NOT EXISTS earthquake_identity_version SMALLINT,
  ADD COLUMN IF NOT EXISTS latest_inspection_version INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_event_store_v1
  ON incidents(canonical_earthquake_event_id, canonical_store_id)
  WHERE earthquake_identity_version = 1
    AND canonical_earthquake_event_id IS NOT NULL
    AND canonical_store_id IS NOT NULL;
```

The new child tables use foreign keys without cascade deletion for audit-bearing
records. Their IDs, decisions, origins, and phases use `CHECK` constraints.

- [ ] **Step 3: Add a read-only duplicate audit**

The script must execute only `SELECT` statements and report:

```sql
SELECT canonical_earthquake_event_id, canonical_store_id, COUNT(*) AS incident_count,
       ARRAY_AGG(id ORDER BY created_at) AS incident_ids
FROM incidents
WHERE earthquake_identity_version = 1
GROUP BY canonical_earthquake_event_id, canonical_store_id
HAVING COUNT(*) > 1;
```

It also reports historical branch-level automatic rows separately and flags
active in-flight rows so they can suppress new store tasks through the
compatibility resolver until manually reviewed.

- [ ] **Step 4: Document rollback and operational stop gate**

Rollback removes only `uq_incident_event_store_v1`, the four new tables, and the
four new columns after confirming no application version still depends on them.
It never changes legacy incident fields or evidence URLs.

- [ ] **Step 5: Validate migration files without connecting to Aiven**

Run: `pnpm.cmd run db:deploy -- --validate-only`  
Run: `pnpm.cmd run test:tsx -- scripts/test-report-workflow-migration.ts`  
Expected: PASS.

- [ ] **Step 6: Test against an explicitly isolated PostgreSQL database**

Require an environment variable named `SPARTA_ISOLATED_TEST_DATABASE_URL` whose
database name matches `_test` or `_isolated`. The script refuses any other name.
Apply baseline plus `002`, insert fixtures, verify constraints, execute rollback
inside the isolated environment, and reapply. If no isolated database is
available, report BLOCKED; do not fall back to `DATABASE_URL`.

- [ ] **Step 7: Commit**

```text
feat(db): add corrective workflow schema

- Preserve legacy incidents outside the new partial identity index
- Require a read-only duplicate audit before operational rollout
```

### Task 4: Implement lifecycle persistence and BM decisions

**Files:**
- Create: `lib/report-workflow-service.ts`
- Create: `scripts/test-report-workflow-integration.ts`
- Modify: `lib/incident-db.ts`
- Modify: `lib/permission-service.ts`
- Modify: `app/api/incidents/route.ts`
- Create: `app/api/incidents/[id]/inspection/route.ts`
- Modify: `app/api/incidents/[id]/confirm/route.ts`

**Interfaces:**
- Produces: `createManualReport(command, actor)`, `submitInspection(command, actor)`, `decideInitialReport(command, actor)`.
- `decideInitialReport` accepts `{ reportId, submissionVersion, decision, reason?, operationalStatus? }`.
- Duplicate transitions throw typed errors with HTTP-safe codes.

- [ ] **Step 1: Write failing integration cases**

Cover manual submission awaiting BM, automatic field inspection, store mismatch,
BM own/other branch, Tim Toko/HO/Admin denial, damage/no-damage/clarification,
resubmission versioning, emergency exception review, and double confirmation.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm.cmd run test:tsx -- scripts/test-report-workflow-integration.ts`  
Expected: FAIL because the workflow service and tables are absent from the test DB.

- [ ] **Step 3: Replace client-shaped creation with a narrow command**

```ts
export interface CreateManualReportCommand {
  disasterType: DisasterType;
  storeId: string;
  locationCity: string;
  description: string;
  preliminaryUnverified: boolean;
  preliminaryReason?: string;
  earthquakeEventId?: string;
}
```

The server resolves store, branch, reporter, ID, origin, timestamps, and status.
It ignores any client attempt to supply confirmation, progress, or closure data.

- [ ] **Step 4: Implement transaction-owned inspection submission**

Use `SELECT ... FOR UPDATE` on the incident, verify exact Tim Toko store identity,
increment `latest_inspection_version`, insert the append-only submission, and
move to `awaiting_manager_confirmation`. A preliminary submission records
`PRELIMINARY_UNVERIFIED` and does not establish field verification.

- [ ] **Step 5: Implement transaction-owned BM decision**

Lock the incident, require the latest submission version, validate evidence or
exception, insert one decision, update status and compatibility `verification`,
and append a timeline entry. `CLARIFICATION_REQUIRED` requires a non-empty reason.

- [ ] **Step 6: Remove unsafe incident create upsert behavior**

`dbCreateIncident` must no longer overwrite an existing incident on ID conflict.
Use a strict insert for normal creation and a dedicated create-or-get transaction
for earthquake uniqueness.

- [ ] **Step 7: Run tests and verify GREEN**

Run policy and integration suites. Expected: PASS with immutable submission and
decision history.

- [ ] **Step 8: Commit**

```text
feat(workflow): add inspection and BM decisions

- Keep preliminary reports unverified
- Preserve clarification and resubmission history
```

### Task 5: Guard the existing technical lifecycle

**Files:**
- Modify: `app/api/incidents/[id]/estimation/route.ts`
- Modify: `app/api/incidents/[id]/readiness/route.ts`
- Modify: `app/api/incidents/[id]/progress/route.ts`
- Modify: `app/api/incidents/[id]/progress/final/route.ts`
- Modify: `app/api/incidents/[id]/completion/submit/route.ts`
- Modify: `app/api/incidents/[id]/completion/approve/route.ts`
- Modify: `app/api/incidents/[id]/close/route.ts`
- Modify: `lib/estimation-service.ts`
- Modify: `lib/progress-service.ts`
- Test: `scripts/test-report-workflow-integration.ts`
- Test: existing Task 1–7 regression scripts

**Interfaces:**
- Consumes: `isTechnicalWorkflowEligible(report)`.
- Preserves: estimation route statuses, readiness requirements, PIC progress,
  coordinator approval, and final BM closure state machine.

- [ ] **Step 1: Add failing technical-boundary tests**

Assert `draft`, `preliminary_unverified`, `field_inspection_required`,
`awaiting_manager_confirmation`, `clarification_required`, and `confirmed_safe`
cannot create estimation/readiness/progress/completion records. Assert
`confirmed_affected` enters the current estimation path. Assert final BM closure
still requires coordinator approval and completed technical work.

- [ ] **Step 2: Run and verify RED**

Expected: at least one current technical endpoint accepts a non-damage initial state.

- [ ] **Step 3: Add a shared eligibility guard at each entry boundary**

Return HTTP 422 with `TECHNICAL_WORKFLOW_NOT_ELIGIBLE`; do not alter downstream
Task 1–7 state names or approval rules.

- [ ] **Step 4: Run existing lifecycle regressions**

Run `test-estimation-flow-task2`, `test-work-readiness-task3`,
`test-progress-task4`, `test-completion-approval-task5`, and
`test-final-integration-task6`. Expected: PASS.

- [ ] **Step 5: Commit**

```text
fix(lifecycle): gate technical work on BM damage
```

### Task 6: Implement event/store deduplication and historical compatibility

**Files:**
- Create: `lib/earthquake-incident-service.ts`
- Create: `scripts/test-earthquake-store-dedup.ts`
- Modify: `lib/incident-db.ts`
- Modify: `lib/server-daemon.ts`
- Modify: `app/api/incidents/route.ts`
- Modify: `scripts/test-dedup.ts`

**Interfaces:**
- Produces: `createOrGetEarthquakeIncident({ event, store, origin, actor })` returning `{ incident, disposition: "CREATED" | "EXISTING" | "HISTORICAL_ACTIVE_SUPPRESSION" }`.
- Produces: `recordUncertainMatchReview(candidate)` without linking either report.

- [ ] **Step 1: Write failing deduplication tests**

Cover auto-first, manual-first with event ID, simultaneous inserts, distinct
event/same store, same event/different store, unrelated disaster, uncertain
manual report, and active historical branch-level suppression.

- [ ] **Step 2: Verify RED**

Run: `pnpm.cmd run test:tsx -- scripts/test-earthquake-store-dedup.ts`  
Expected: FAIL because current uniqueness is event/branch.

- [ ] **Step 3: Implement canonical identity**

Use persisted earthquake event ID and store master code. Never use branch as a
store key. Normalize through existing store and branch utilities.

- [ ] **Step 4: Implement transactional create-or-get**

Insert identity-version-1 incidents and handle `23505` on
`uq_incident_event_store_v1` by selecting the existing row. Never update user
description, evidence, decisions, or timeline in the conflict path.

- [ ] **Step 5: Add historical active-report compatibility**

Before creating store incidents, detect an active legacy branch-level automatic
incident for the same event whose `affected_stores` contains the store. Return
`HISTORICAL_ACTIVE_SUPPRESSION` and route the user to that existing report. Do
not split, convert, or mark historical data automatically. Archived or safely
terminal legacy rows do not suppress a new explicitly reviewed workflow unless
the event/store key is already represented.

- [ ] **Step 6: Replace unsafe time-only automatic linking**

Unlinked manual reports create match-review rows containing store, event, time
delta, distance, and score. Automation does not set `earthquake_event_id` or
discard either incident. A deterministic explicit event/store match returns the
existing incident.

- [ ] **Step 7: Preserve affected-store selection**

The daemon iterates only the stores already selected by the existing radius and
exposure logic. Each selected store receives `field_inspection_required` unless
create-or-get returns an existing/suppressed incident.

- [ ] **Step 8: Verify GREEN and race behavior**

Run the new suite twice and execute the concurrent insert case with at least ten
parallel attempts. Expected: one incident ID and no overwritten audit fields.

- [ ] **Step 9: Commit**

```text
fix(earthquake): enforce event-store uniqueness

- Suppress duplicates against active legacy branch reports
- Queue uncertain manual matches without silent merging
```

### Task 7: Add normalized protected initial evidence

**Files:**
- Create: `lib/incident-evidence-service.ts`
- Create: `scripts/test-initial-evidence-security.ts`
- Create: `app/api/incidents/[id]/evidence/route.ts`
- Create: `app/api/incidents/[id]/evidence/[evidenceId]/route.ts`
- Modify: `lib/storage-config.ts`
- Modify: `app/api/incidents/[id]/route.ts`
- Modify: `lib/report-workflow-service.ts`

**Interfaces:**
- Produces: `saveIncidentEvidence(input, actor)`, `listIncidentEvidence(reportId, actor)`, `getIncidentEvidenceFile(reportId, evidenceId, actor)`.
- Evidence URLs always target `/api/incidents/{id}/evidence/{evidenceId}`.

- [ ] **Step 1: Write failing evidence tests**

Cover authorized Tim Toko upload, external-user impossibility, MIME/magic-byte
validation, metadata persistence, BM own/other branch, HO read-only access,
System Admin mutation denial, cross-report key swapping, path traversal, and
legacy URL compatibility.

- [ ] **Step 2: Verify RED**

Run: `pnpm.cmd run test:tsx -- scripts/test-initial-evidence-security.ts`  
Expected: FAIL because the service and routes do not exist.

- [ ] **Step 3: Extend private storage configuration**

Add `storage/incidents` outside `public/` and include it in storage health probes.
Never return a physical path to clients.

- [ ] **Step 4: Implement upload validation and metadata**

Accept JPEG, PNG, and WebP within the configured limit; validate magic bytes and
image decoding. Require caption and origin. For `GALLERY_THIRD_PARTY`, require a
source description and allow an optional concise source name.

- [ ] **Step 5: Implement protected listing and streaming**

Use server authorization and evidence ownership checks. Return private cache
headers and safe content disposition. HO/BM are read-only; authorized Tim Toko
may upload only while the report accepts inspection or clarification.

- [ ] **Step 6: Add legacy compatibility adapter**

Map each historical `field_photos` string to a display-only item labeled
`LEGACY_UNKNOWN`, without moving, deleting, or rewriting the URL. Reject legacy
URLs outside allowed historical prefixes from direct proxying.

- [ ] **Step 7: Enforce server-side submission evidence rules**

The reviewed inspection submission must reference at least one valid evidence
record or contain an emergency exception reason, actor, and timestamp. The
exception changes submission admissibility only; it never sets damage status.

- [ ] **Step 8: Verify GREEN and commit**

```text
feat(evidence): protect initial report photos

- Record provenance and uploader metadata
- Preserve historical URLs as read-only compatibility evidence
```

### Task 8: Integrate Tim Toko, BM, and HO user interfaces

**Files:**
- Create: `components/incident/incident-evidence-gallery.tsx`
- Create: `components/incident/field-inspection-form.tsx`
- Create: `components/incident/manager-confirmation-panel.tsx`
- Modify: `components/incident/camera-capture.tsx`
- Modify: `components/incident/field-photo-uploader.tsx`
- Modify: `components/incident/manual-incident-modal.tsx`
- Modify: `components/incident/store-verification-modal.tsx`
- Modify: `components/incident/maintenance-tracking-modal.tsx`
- Modify: `components/reports/operational-report-center.tsx`
- Modify: `components/reports/tracking-report-center.tsx`
- Modify: `components/reports/historical-report-browser.tsx`
- Modify: `components/monitoring/monitoring-detail-panel.tsx`
- Test: `scripts/test-camera-and-evidence-workflow.ts`
- Test: `scripts/test-notification-and-report-personas.ts`

**Interfaces:**
- Consumes workflow/evidence API responses and typed duplicate response
  `{ code: "EARTHQUAKE_REPORT_EXISTS", reportId, openUrl }`.
- Preserves the existing `CameraCapture` live stream lifecycle.

- [ ] **Step 1: Extend static/UI tests and verify RED**

Assert the Tim Toko queue labels, three BM decisions, no HO/Admin mutation
actions, duplicate message/action, gallery provenance fields, and separated
initial versus technical evidence sections.

- [ ] **Step 2: Preserve and type the camera output**

`CameraCapture` returns `{ file, origin: "CAMERA_SELF" }`. Keep `getUserMedia`,
preview, shutter, retake, use-photo, secure-context, denial, unavailable-camera,
and stream-cleanup behavior unchanged.

- [ ] **Step 3: Add gallery provenance**

After file selection require self/third-party choice. Third-party mode provides
optional source name and required source description. Do not request account,
NIK, phone number, or address for the outside source.

- [ ] **Step 4: Add role-specific workflow panels**

Tim Toko sees inspection/resubmission only for its canonical store. BM sees the
latest submission and three decisions for its canonical branch. HO sees evidence
and history without action controls. System Admin sees no operational controls.

- [ ] **Step 5: Add evidence gallery and duplicate navigation**

Group `INITIAL`, `CLARIFICATION`, `FOLLOW_UP`, and technical evidence separately.
Show thumbnail, caption, origin, uploader, and time. Display `Laporan Gempa Sudah
Tersedia` with `Buka Laporan` when the API returns the duplicate code.

- [ ] **Step 6: Run UI/static tests and commit**

```text
feat(ui): add scoped inspection and BM review
```

### Task 9: Complete regression, browser, and production verification

**Files:**
- Create: `docs/03-qa-and-testing/REPORT_WORKFLOW_CORRECTIVE_REPORT.md`
- Modify only files required by failures reproduced during this task.

**Interfaces:**
- Produces the required final report with root causes, files, schema, workflow,
  permission matrix, deduplication, evidence, camera/gallery, exact results,
  blockers, and commit hashes.

- [ ] **Step 1: Run focused corrective suites**

```text
pnpm.cmd run test:tsx -- scripts/test-report-workflow-policy.ts
pnpm.cmd run test:tsx -- scripts/test-report-workflow-migration.ts
pnpm.cmd run test:tsx -- scripts/test-report-workflow-integration.ts
pnpm.cmd run test:tsx -- scripts/test-earthquake-store-dedup.ts
pnpm.cmd run test:tsx -- scripts/test-initial-evidence-security.ts
pnpm.cmd run test:tsx -- scripts/test-camera-and-evidence-workflow.ts
pnpm.cmd run test:tsx -- scripts/test-canonical-branch-and-legacy-overrides.ts
```

- [ ] **Step 2: Run Task 1–7 regressions**

Run lifecycle, estimation, readiness, progress, completion, final-integration,
notification isolation, permissions, and production-readiness scripts. Record
each command and exit code; do not collapse failures into a single summary.

- [ ] **Step 3: Run required static and production checks**

```text
pnpm.cmd exec tsc --noEmit
pnpm.cmd run lint
pnpm.cmd run build
```

- [ ] **Step 4: Perform real browser acceptance**

With `next dev` running, verify Tim Toko manual report, automatic inspection,
camera live preview/shutter/retake, gallery provenance, BM three decisions,
clarification resubmission, duplicate navigation, BM/HO evidence preview, and
absence of HO/Admin mutation controls. If camera hardware, secure context,
browser tooling, or persona accounts are unavailable, mark the affected case
UNVERIFIED or BLOCKED.

- [ ] **Step 5: Confirm operational database remained untouched**

Record that no `db:deploy`, migration script, seed, fixture insertion, or update
was executed against the operational Aiven connection. Include isolated database
name if one was used, without exposing credentials.

- [ ] **Step 6: Write the final report and commit**

```text
docs(qa): report corrective verification
```

- [ ] **Step 7: Stop**

Do not merge to `main`, start Task 8, or execute the operational migration. If an
operational rollout is requested later, first present the exact SQL, affected
objects, duplicate-audit output, backup verification, risks, and rollback plan.

## Plan Self-Review

- Every approved design requirement maps to Tasks 2–9.
- Active historical branch-level incidents suppress duplicate store tasks but
  are never converted or merged.
- Tim Toko authorization uses canonical store identity; BM uses canonical branch.
- Uncertain manual-first matches are review records, not automatic links.
- Preliminary external information and emergency exceptions do not establish
  damage.
- Existing technical APIs receive only a shared entry guard; their internal
  Task 1–7 lifecycle remains intact.
- Migration execution is limited to an explicitly named isolated database and
  refuses the operational connection.
- Historical evidence remains display-only through a constrained adapter.
- The Node/tsx issue has a verified local isolation strategy before application
  test results are reported.
- No placeholders or destructive operational actions remain in the plan.
