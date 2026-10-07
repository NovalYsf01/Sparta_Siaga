# Task 6 Final Corrective Patch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear Task 6 notification, TypeScript, build, and scoped tooling blockers without changing the validated business lifecycle.

**Architecture:** Authenticate and authorize notification reads in the App Router endpoint, derive scope from the trusted session, and push the effective branch into the existing parameterized notification query. Correct type contracts at their source and perform only safe Next.js/tooling maintenance.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL, pnpm, tsx.

**Spec:** `docs/superpowers/specs/2026-10-07-task-6-final-corrective-patch-design.md`

## Global Constraints

- Preserve the already-passing incident business flow and F1–F20 behavior.
- No mass `ts-ignore`, excessive `any`, disabled typechecking, or deleted tests.
- Do not start Task 7.

---

### Task 1: Notification Branch Isolation

**Files:**
- Create: `lib/notification-access.ts`
- Create: `scripts/test-notification-branch-isolation.ts`
- Modify: `app/api/notifications/logs/route.ts`

**Interfaces:**
- Produces: `resolveNotificationReadScope(user, requestedBranch)` returning an authorized server-derived branch scope.
- Consumes: `getSessionUser`, `checkUserPermission`, and `getRecentNotificationLogs`.

- [ ] Write isolation tests for branch G001, manipulated G002 query, HO, System Admin, unauthenticated, and permission denied.
- [ ] Run the test and verify RED because the policy module/route enforcement does not exist.
- [ ] Implement the pure scope policy and route authentication/authorization.
- [ ] Run the notification test and verify GREEN.

### Task 2: TypeScript Contract Repair

**Files:**
- Modify: `components/incident/manual-incident-modal.tsx`
- Modify: `components/incident/select-report-modal.tsx`
- Modify: `components/reports/operational-report-center.tsx`
- Modify: `scripts/test-final-integration-task6.ts`

**Interfaces:**
- Consumes: existing `UserIdentity`, `IncidentRecord`, `DamageReport`, and `PermissionKey` contracts.
- Produces: type-safe components and fixtures with unchanged runtime business behavior.

- [ ] Run `pnpm run typecheck` and record the exact baseline failures.
- [ ] Correct each mismatch at its source without suppressions.
- [ ] Repeat typecheck until exit 0.

### Task 3: Safe Technical Debt Cleanup

**Files:**
- Create: `proxy.ts`
- Delete: `middleware.ts`
- Modify: `next.config.mjs`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: the same authentication boundary under Next.js 16 proxy convention, absolute Turbopack root, and deterministic `tsx` scripts.

- [ ] Rename the middleware convention to proxy without changing matcher/auth behavior.
- [ ] Resolve Turbopack root absolutely from the config file.
- [ ] Add `tsx` as a devDependency using pnpm.
- [ ] Run typecheck and build to detect configuration regressions.

### Task 4: Full Verification and Report

**Files:**
- Modify: `docs/03-qa-and-testing/TASK_6_FINAL_INTEGRATION_AUDIT_REPORT.md`

**Interfaces:**
- Consumes: results from the notification test, nine regression suites, typecheck, build, and technical-debt audit.

- [ ] Run the notification isolation test.
- [ ] Run all nine Task 1–6 regression scripts and total results.
- [ ] Run `pnpm run typecheck` and require exit 0.
- [ ] Run `pnpm run build` and require exit 0.
- [ ] Update the report with root causes, file changes, evidence, remaining issues, and readiness status.

## Review Focus

- No notification payload crosses branch boundaries before response serialization.
- Query parameters never widen branch access.
- System Admin retains monitoring-only behavior.
- The proxy migration preserves all public paths and matchers.
- Type fixes do not broaden permissions or alter lifecycle transitions.
