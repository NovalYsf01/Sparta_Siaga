# Task 6 Final Corrective Patch Design

## Goal

Close the remaining Task 6 blockers without changing the validated incident lifecycle: make notification reads session-scoped on the server, restore TypeScript/build health, remove safe Next.js tooling debt, rerun Task 1–6 regression, and update the final audit report.

## Authorization Design

`GET /api/notifications/logs` authenticates with `getSessionUser()` before reading any notification rows. It authorizes `NOTIFICATION_VIEW` through the central permission resolver. Unauthenticated requests return 401; authenticated users without permission return 403.

The server derives the data scope from trusted session identity:

- `systemRole === "ADMIN"`: monitoring access across branches, matching the existing monitoring architecture while retaining zero operational mutation permission.
- `scope === "HO"`: monitoring access across branches after `NOTIFICATION_VIEW` authorization.
- `scope === "BRANCH"`: mandatory normalized `sessionUser.branch`; a client-supplied `branch` parameter cannot widen or replace it.
- missing/invalid branch scope: deny with 403 instead of returning broad data.

For all-branch viewers, `branch` remains an optional narrowing filter. For branch viewers it is ignored and the session branch is always used.

## Test Boundary

A small pure typed policy function resolves the effective notification branch scope from an already authenticated and authorized user. A dedicated TypeScript test covers G001/G002 isolation, manipulated query handling, authorized HO access, System Admin monitoring, unauthenticated 401, and permission-denied 403. The route uses the same policy function, while authentication and permission checks remain in the route.

## TypeScript Corrections

Fix invalid narrowing rather than suppressing it: remove impossible comparisons, use the correct identity/system-role source, add the missing React import, replace the nonexistent `REPORT_CREATE` capability with the established operational rule, and make Task 6 fixtures conform to actual domain interfaces. No mass `any`, `ts-ignore`, compiler weakening, or test removal.

## Scoped Technical Debt

- Rename the Next.js 16 request boundary from `middleware.ts` to `proxy.ts` and export `proxy`.
- Resolve `turbopack.root` to an absolute path based on `next.config.mjs`.
- Add `tsx` as a devDependency because repository scripts directly invoke it.
- Do not delete the parent workspace lockfile; it is outside the repository and is environment-level. The absolute Turbopack root prevents it from changing the application root.

## Verification

Run the notification test RED then GREEN, `pnpm run typecheck`, all nine Task 1–6 regression scripts, and `pnpm run build`. Final status is DONE only when notification isolation, regression, typecheck, and build all pass.

