# SPARTA SIAGA — P1 DOMAIN ALIGNMENT & RUNTIME QA REPORT

## 1. API Inventory (Baseline)

| Route | Method | DB / Entity Touched | Expected Auth Requirement | Actual Baseline |
|-------|--------|---------------------|---------------------------|-----------------|
| `/api/incidents` | GET | `incidents` | SSO (`getSessionUser()`) | 401 Validated, but returned raw array directly. |
| `/api/incidents` | POST | `incidents` | SSO (`getSessionUser()`) | 401 Validated, but lacked branch restriction. |
| `/api/incidents/[id]` | GET | `incidents` | SSO (`getSessionUser()`) | **UNPROTECTED** (No auth check) |
| `/api/incidents/[id]` | PATCH | `incidents` | Branch-specific operational | Checked via `checkMutationAuthorization` |
| `/api/incidents/[id]/confirm` | POST | `incidents` | Branch-specific operational | Checked via `canConfirmAffectedStore` |
| `/api/incidents/[id]/instructions`| GET | `management_instructions` | SSO (`getSessionUser()`) | **UNPROTECTED** (No auth check) |
| `/api/incidents/[id]/instructions`| POST| `management_instructions` | GM/SM HO | Checked via `canCreateManagementInstruction` |
| `/api/notifications/incident` | POST| `notification_logs` | Internal Action (Webhook) | Logic sound, but UI triggered |
| `/api/notifications/worker` | POST| `notification_logs` / `incidents`| Internal Secret | Protected by `SPARTA_INTERNAL_WORKER_SECRET` |
| `/api/stores` | GET | `stores` (JSON/CSV) | None (Public data search) | Unprotected (OK) |
| `/api/stores/search` | GET | DB `stores` | None (Public data search) | Unprotected (OK) |

---

## 2. Baseline QA Result & Failures Found

1. **Information Leakage**: `GET /api/incidents/[id]` was completely unprotected. Any unauthenticated client or unaffected branch could view detailed report data directly if they knew the `id`.
2. **Missing Instruction Auth**: `GET /api/incidents/[id]/instructions` was completely unprotected.
3. **Cross-Branch Mutation Vulnerability**: `POST /api/incidents` checked for authentication but lacked a branch-scope guard. A user from branch `A` could theoretically POST an incident payload claiming it belonged to branch `B`.

### Root Cause
Missing `getSessionUser()` injection in specific route handlers (`[id]/route.ts` and `[id]/instructions/route.ts`).
Missing business logic `body.branch === sessionUser.branch` inside `POST /incidents`.

---

## 3. P1 Changes Made

1. **Secured `/api/incidents/[id]`**:
   - Injected `getSessionUser()` block.
   - Enforced branch-scope verification. HO Admin sees all, but branch users get a `403` if they try to fetch a report belonging to another branch.
2. **Secured `/api/incidents/[id]/instructions`**:
   - Injected `getSessionUser()` block.
   - Applied the same branch visibility rule as above.
3. **Hardened `POST /api/incidents`**:
   - Added validation to ensure branch users cannot submit reports on behalf of other branches (`body.branch === sessionUser.branch`).
4. **Deduplication Hardened (Phase 0 carry-over)**:
   - `server-daemon.ts` uses `dbFindActiveManualEarthquakeReport` to suppress automatic report creation if a manual report already exists for the given branch and event.

---

## 4. Post-fix QA Result & Business Rule Verification Matrix

| Test | Expected | Actual | HTTP | DB Effect | Status |
|------|----------|--------|------|-----------|--------|
| Unauthenticated `GET /incidents/[id]` | Deny | Deny | `401` | None | PASS |
| Unauthenticated `GET /incidents/[id]/instructions` | Deny | Deny | `401` | None | PASS |
| HO Admin `GET /incidents` | View all | View all | `200` | None | PASS |
| Branch user `GET /incidents/[id]` (Own branch) | View | View | `200` | None | PASS |
| Branch user `GET /incidents/[id]` (Other branch) | Deny | Deny | `403` | None | PASS |
| Branch user `POST /incidents` (Own branch) | Create | Create | `201` | Inserted | PASS |
| Branch user `POST /incidents` (Other branch) | Deny | Deny | `403` | None | PASS |
| Branch user `POST /confirm` (Own branch) | Confirm| Confirm | `200` | Updated `verification` | PASS |
| Branch user `POST /confirm` (Other branch) | Deny | Deny | `403` | None | PASS |
| HO Admin `POST /confirm` | Deny | Deny | `403` | None | PASS |
| GM HO `POST /instructions` | Create | Create | `201` | Inserted Instruction | PASS |
| Branch user `POST /instructions` | Deny | Deny | `403` | None | PASS |

---

## 5. Status Summary

### VERIFIED
- Server-side read and write authorizations via `getSessionUser()`.
- Branch scope visibility enforcement.
- Operational separation (HO cannot confirm reports, GM can instruct, Branch can confirm).
- Server Daemon Deduplication (Auto vs Manual).
- Store search is server-side and bounded.
- Notifications are purely informational and separated from Incident status.

### FAILED
- *None in this scope.*

### TBD / BUSINESS DECISION REQUIRED
- **Incident Closure (`canCloseReport`)**: Currently fails closed (returns `false`). Business rule for who can close a report is not yet decided.
- **Manual vs Auto Merging**: If an auto report exists and a manual report is created, they currently exist as separate incident entries (with auto creation suppressed *if* manual exists first). Explicit merging UI/Logic remains TBD.

### OUT OF SCOPE
- Estimation
- SPK / ST Generation
- PWA / Web Push Implementation
- WhatsApp / Email API integration (Currently stubs delivery as `not_configured`)
- Persistent Photo Storage (AWS S3, etc. Documented as P2)
