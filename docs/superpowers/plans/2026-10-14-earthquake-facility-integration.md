# Earthquake Facility Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate 67 facilities into SPARTA SIAGA's earthquake workflow without dummy stores, duplicate reports, production writes, or regressions to existing store reports.

**Architecture:** Add a facility master and typed incident-location fields alongside legacy store columns. Centralize isolated-database enforcement, parse Excel through a source adapter, and extend existing earthquake/report services instead of creating a second lifecycle.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL/pg, xlsx, Leaflet, existing script-based test harness.

**Spec:** `docs/superpowers/specs/2026-10-14-earthquake-facility-integration-design.md`

## Global Constraints

- All database writes must verify `current_database() = 'sparta_siaga_isolated'`.
- Never create dummy store records for facilities.
- Mainshocks and aftershocks remain separate canonical events; ambiguous events are never auto-merged.
- Preserve legacy incidents, permissions, inspection, milestones, approvals, private evidence, and PWA behavior.
- Do not commit, push, deploy, or write to `defaultdb`.
- Every behavioral change follows RED → GREEN and receives a stage-level test run.

### Task 1: Database safety and facility import domain

**Files:** Create `lib/database-safety.ts`, `lib/facility-import.ts`, `scripts/test-facility-import.ts`; modify `package.json` only if a script is needed.

**Produces:** `assertIsolatedDatabase(queryable)`, `parseFacilityRows(rows)`, `ExcelFacilitySource`.

- [ ] Write parser and database-guard tests covering 67-row composition, duplicate codes, shared coordinates, invalid coordinates, BRANCH→DC, and wrong database rejection.
- [ ] Run tests and confirm missing implementation failure.
- [ ] Implement minimal domain types, parser, Excel adapter, and active-database guard.
- [ ] Run stage tests to green.

### Task 2: Additive schema and importer

**Files:** Create `database/migrations/005_earthquake_facility_integration.sql`, `lib/facility-db.ts`, `scripts/import-facilities.ts`, `scripts/test-facility-schema.ts`.

**Consumes:** Task 1 parser and database guard.

**Produces:** facility master/import audit schema, typed incident locations, source-event provenance, reconciliation cases, atomic PIC history, repair links, preview/apply importer.

- [ ] Write static/schema integration tests for nullable legacy store identity and typed facility identity.
- [ ] Confirm tests fail before schema/service exists.
- [ ] Add migration and transactional preview/apply importer preserving branch and activation.
- [ ] Verify migration safety and stage tests.

### Task 3: Canonical correlation and report reconciliation

**Files:** Modify `lib/disaster-service.ts`, `lib/earthquake-db.ts`, `lib/incident-db.ts`; create focused correlation/reconciliation tests.

**Produces:** conservative correlation decision, advisory-lock reconciliation, generic event+location deduplication.

- [ ] Add failing tests for BMKG/USGS same-event correlation, aftershock separation, ambiguous non-merge, manual-first, automatic-first, closed replay, and concurrent creation.
- [ ] Implement conservative matching and transaction-safe reconciliation.
- [ ] Run earthquake and regression suites.

### Task 4: Facility worker, shared queue, PIC, and repair links

**Files:** Modify worker/services and incident APIs; add queue/PIC/repair tests.

**Consumes:** typed locations and canonical reports.

- [ ] Add failing authorization and concurrency tests for BMS/BES/BMM/HO/Admin.
- [ ] Extend radius evaluation to active mapped facilities and implement atomic PIC claim/transfer.
- [ ] Add verified many-to-many repair linking without copying cost/progress.
- [ ] Run stage suites.

### Task 5: Aggregated notifications and scoped APIs

**Files:** Modify notification services/routes; create facility admin/queue/map endpoints and tests.

- [ ] Add failing tests for event+branch+recipient-group summaries and retry updates.
- [ ] Implement idempotent summary updates isolated from report transactions.
- [ ] Implement server-scoped facility, queue, PIC, reconciliation, and map APIs.
- [ ] Run authorization and notification suites.

### Task 6: Admin, queue, map, dashboard, and responsive UI

**Files:** Add focused components/routes and minimally extend existing map/dashboard/navigation.

- [ ] Add source-level/UI behavior tests for required states and role visibility.
- [ ] Implement Master Fasilitas, Shared Queue, Mode Kejadian default, Mode Lokasi, and mobile bottom sheets using existing visual language.
- [ ] Verify keyboard, focus, loading/empty/error states, 44px targets, narrow viewport, and PWA regression.

### Task 7: Isolated migration, import, and final verification

**Files:** Create final implementation report under `docs/03-qa-and-testing/`.

- [ ] Verify active database name before migration.
- [ ] Apply migration and import Excel twice; confirm 67 records, category counts, idempotency, shared-coordinate preservation, and unmapped/disabled defaults.
- [ ] Run lint, typecheck, build, focused integration suites, and available E2E/mobile verification.
- [ ] Run antislop delivery gate and write actual PASS/FAIL evidence plus remaining work.
