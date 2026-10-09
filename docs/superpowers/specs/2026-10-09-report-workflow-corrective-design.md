# SPARTA SIAGA Report Workflow Corrective Design

**Date:** 2026-10-09  
**Priority:** P0/P1 pre-demo corrective  
**Branch:** `development` only  
**Approach:** Additive domain correction

## 1. Purpose and Scope

This design corrects the existing Task 1–7 report workflow without starting a
new Task 8 or replacing the existing technical completion pipeline. The
`incidents` table remains the operational anchor. New lifecycle, evidence,
decision, and deduplication behavior is added in a backward-compatible way.

The corrective covers:

- Tim Toko report and field-inspection submission.
- Same-branch Manager Branch initial confirmation.
- The three Manager Branch decisions.
- One earthquake incident per canonical event and canonical store.
- Protected, attributable initial and clarification evidence.
- Camera and gallery provenance.
- Manager Branch and HO evidence visibility.
- Accurate legacy override presentation.
- Regression protection for the existing technical workflow.

It excludes destructive conversion of historical incidents, automatic merging
of historical duplicates, Task 8, and any unverified WhatsApp or email claim.

## 2. Confirmed Current-State Findings

The audit found these concrete gaps:

1. `tim_toko` still receives `REPORT_CONFIRM` in the role catalog and defaults.
2. The confirmation endpoint accepts only `is_damaged: boolean`; it has no
   clarification decision, decision history, evidence validation, or transition
   concurrency guard.
3. The current automatic earthquake unit is one incident per event and branch,
   with multiple stores embedded in `affected_stores`. This conflicts with the
   required operational unit of one event plus one store.
4. The unique index covers `(earthquake_event_id, branch)` only for automatic
   reports. It does not prevent manual-first and automatic-first duplicates per
   store.
5. The daemon can automatically link a single time-window candidate. Time and
   branch alone are not sufficient evidence for a safe merge.
6. Initial photos are unstructured strings in `incidents.field_photos`; they do
   not consistently record origin, caption, uploader, source, or upload time.
7. Initial evidence has no dedicated protected serving layer. Existing progress
   and readiness evidence already demonstrate the appropriate private-storage
   and authorized-endpoint pattern.
8. Manual creation accepts a broad client-shaped `IncidentRecord` instead of a
   narrow server-owned command, allowing lifecycle fields to be client supplied.
9. The live camera implementation uses `getUserMedia`, preview, shutter, retake,
   and use-photo behavior. It must be preserved and integrated with normalized
   evidence rather than rewritten.
10. Existing detail views emphasize technical progress evidence and do not
    consistently present initial and clarification evidence to BM and HO.

Recent commits correctly prohibit operational `ALL_BRANCHES` overrides and fix
the camera Permissions Policy. Those working behaviors are retained.

## 3. Domain Model

### 3.1 Incident lifecycle

New incidents use explicit initial-workflow states:

| State | Meaning | Allowed next action |
|---|---|---|
| `draft` | Incomplete report retained by Tim Toko | Complete and submit |
| `preliminary_unverified` | Early external information; inspection unsafe or pending | Add field inspection |
| `field_inspection_required` | Automatic earthquake incident awaits store inspection | Tim Toko submits inspection |
| `awaiting_manager_confirmation` | Inspection submitted with evidence/exception | Same-branch BM decides |
| `clarification_required` | BM returned the same incident with a reason | Tim Toko updates and resubmits |
| `confirmed_affected` | BM confirmed damage | Existing technical workflow |
| `confirmed_safe` | BM confirmed no damage; displayed as `Tidak Terdampak` | Terminal monitoring/history |

Existing states remain valid. No historical row is rewritten merely to fit the
new model. Display-label derivation maps old `pending_confirmation` and
`verifying` records conservatively without changing stored values.

`confirmed_safe` is not equivalent to technical `resolved` or final `CLOSED`.
Technical routes must reject it. Existing completion approval remains the only
way to close work that entered the technical pipeline.

### 3.2 Submission and decision records

Initial inspection is modeled as append-only submissions linked to an incident.
Each submission records actor, time, notes, verification level, emergency
exception details, and the evidence snapshot reviewed by BM.

BM decisions are append-only records with one of:

- `DAMAGE_CONFIRMED`
- `NO_DAMAGE_CONFIRMED`
- `CLARIFICATION_REQUIRED`

Each decision records actor, canonical branch, reason/notes, decision time, and
the submission version reviewed. A database transaction locks the incident and
rejects stale, contradictory, or repeated decisions.

The latest lifecycle state remains denormalized on `incidents.status` for
compatibility and efficient filtering. Append-only records are the audit source
for the new initial workflow.

### 3.3 Evidence records

Initial and clarification evidence uses a normalized table with:

- incident and optional submission identifiers;
- phase: `INITIAL`, `CLARIFICATION`, or `FOLLOW_UP`;
- storage key and MIME metadata;
- caption;
- origin: `CAMERA_SELF`, `GALLERY_SELF`, or `GALLERY_THIRD_PARTY`;
- optional third-party source name and concise source description;
- uploader user ID and display name;
- upload timestamp;
- immutable audit timestamps.

Third parties never become users and receive no application access. Only the
authenticated authorized employee creates the evidence record.

Historical `field_photos` URLs remain readable through a compatibility adapter.
They are displayed as legacy evidence with unknown provenance. They are not
copied, deleted, or rewritten automatically.

## 4. Database and Migration Strategy

Add one idempotent migration containing only additive DDL:

1. Extend the accepted incident status constraint if a constraint exists.
2. Add `incident_inspection_submissions`.
3. Add `incident_confirmation_decisions`.
4. Add `incident_evidence`.
5. Add `incident_earthquake_match_reviews` for uncertain matches.
6. Add incident columns needed for canonical event/store identity and the latest
   inspection version without removing existing columns.
7. Add indexes for status queues, evidence lookup, and decision history.

Before adding an event/store unique index, run a read-only duplicate audit. The
audit groups non-archived earthquake incidents by normalized canonical event ID
and canonical store ID and produces a report only. It does not mutate rows.

If duplicates exist, the migration must not fail halfway or merge them. The
index is created only for records explicitly marked as using the new canonical
identity and only after the audit proves the indexed set is clean. Historical
branch-level incidents remain outside the new partial-index predicate.

The target invariant is enforced by a partial unique index equivalent to:

```sql
UNIQUE (canonical_earthquake_event_id, canonical_store_id)
WHERE earthquake_identity_version = 1
  AND canonical_earthquake_event_id IS NOT NULL
  AND canonical_store_id IS NOT NULL
```

No migration is executed against an operational database merely to run tests.
Before any live-affecting execution, capture a verified backup, document rollback
DDL, review the duplicate audit, and obtain explicit approval.

## 5. Authorization Model

| Role | Create/inspect | Initial confirm | Technical work | National view | Final closure |
|---|---:|---:|---:|---:|---:|
| Tim Toko | Own store/branch | No | No | No | No |
| Manager Branch (`bm`) | Review own branch | Own canonical branch only | Review/oversight | No | Existing final BM approval |
| BMS/BES/BBS | No initial submission | No | Existing scoped duties | No | No |
| HO roles | No operational submission | No | Read-only monitoring | Yes when permitted | No |
| System Admin | No | No | No | Administrative visibility only | No |

Official confirmation requires all of:

- authenticated active employee;
- business role exactly `bm`;
- non-admin operational identity;
- canonical user branch equal to canonical incident branch;
- active report in `awaiting_manager_confirmation`;
- review of the latest inspection submission;
- valid evidence or a documented emergency exception.

`REPORT_CONFIRM + ALL_BRANCHES` remains stored for legacy audit but is never an
effective operational grant. The admin UI labels it ineffective. A scoped
override cannot turn Tim Toko, HO, or System Admin into the initial confirming
authority; role eligibility and branch scope are separate mandatory checks.

Evidence upload, metadata, and file-serving endpoints apply the same incident
view/act authorization on the server. Cross-report key swapping, traversal, and
cross-branch access are rejected.

## 6. Workflow Behavior

### 6.1 Manual report

The client sends a narrow creation command. The server owns ID, reporter,
branch/store canonicalization, timestamps, origin, initial status, progress, and
timeline entries. A complete field report becomes
`awaiting_manager_confirmation`; incomplete information remains `draft` or
`preliminary_unverified`. Submission never auto-confirms.

For earthquake reports, creation first checks canonical event/store uniqueness.
If an incident exists, the API returns a typed duplicate response containing the
authorized report link. The UI displays `Laporan Gempa Sudah Tersedia` and
`Buka Laporan`.

### 6.2 Automatic earthquake report

The existing radius and affected-store selection logic remains the selector.
For each selected store only, the worker transactionally creates or retrieves an
incident in `field_inspection_required`. It does not generate incidents for
stores outside that selection.

Tim Toko opens the existing incident, adds actual-condition information and
evidence, and submits it to BM. Detection never implies damage and never opens
technical estimation.

### 6.3 Manager Branch decisions

`Ada Kerusakan` requires at least one relevant photo on the reviewed submission,
or a documented emergency exception. It transitions to `confirmed_affected` and
unlocks the existing technical readiness/estimation flow.

`Tidak Ada Kerusakan` requires at least one actual-condition photo, or a
documented emergency exception. It transitions to `confirmed_safe`, displays
`Tidak Terdampak`, and remains blocked from technical work.

`Perlu Klarifikasi` requires a reason, records the decision, transitions to
`clarification_required`, and notifies the responsible Tim Toko queue. Existing
evidence remains immutable. Resubmission creates a new submission version on the
same incident.

An emergency exception records reason, actor, and timestamp. It permits
submission for BM review but never confirms the incident automatically. BM may
still return it for clarification or additional evidence.

## 7. Earthquake Matching and Race Protection

Canonical event identity prefers the persisted provider event identity already
used by the earthquake event store. Canonical store identity uses the existing
store master code; branch names are never substituted for store IDs.

The transaction sequence is:

1. Canonicalize event and store.
2. Query the unique operational incident key.
3. Insert with the new identity marker.
4. On unique conflict, retrieve and return the existing incident.
5. Never overwrite descriptions, evidence, decisions, or audit history.

Manual-first reports with an explicit event ID participate immediately in the
same invariant. Reports without an event ID are scored only as possible matches
using store identity, event time window, location, and event characteristics.
They are written to the match-review queue. Automation does not link or merge
them silently and does not create a second incident when a deterministic match
already exists.

Separate events, separate stores, and non-earthquake reports remain independent.

## 8. Evidence Storage and Access

New evidence is written outside `public/`, following the existing private
progress/readiness storage pattern. Upload processing validates size, allowed
MIME type, magic bytes, and image decoding before metadata is committed.

Evidence download routes:

- authenticate the requester;
- load the evidence and owning incident;
- verify incident visibility and branch scope;
- verify that the storage key belongs to that evidence record;
- stream with safe content type and private caching headers.

The detail API returns metadata plus protected endpoint URLs, never disk paths.
Manager Branch sees own-branch evidence. Authorized HO viewers see national
evidence read-only. Neither can modify evidence unless their operational role
and workflow state explicitly allow it.

## 9. UI Design

The existing live-camera experience remains: real preview, shutter, preview,
retake, use-photo, and graceful denial/unavailable handling.

Gallery selection adds a required provenance choice:

- `Foto diambil sendiri`; or
- `Foto diterima dari pihak lain`.

Third-party selection accepts known or unknown source identity and a concise
description such as customer, resident, security officer, or employee. It does
not request unnecessary personal information.

Role-specific queues and actions are:

- Tim Toko: `Perlu Pemeriksaan Lapangan`, `Perlu Klarifikasi`, and own drafts.
- BM: `Menunggu Konfirmasi Manager Branch` with the three decisions.
- HO: national monitoring and evidence preview, with no mutation actions.
- System Admin: permission administration only; no operational buttons.

Report detail separates initial/clarification evidence from technical progress
and completion photos. Each card shows thumbnail, caption, origin, uploader, and
upload time, with an authorized preview.

## 10. API Boundaries

The implementation introduces narrow commands instead of accepting arbitrary
incident objects:

- create manual report;
- submit or resubmit field inspection;
- upload initial/clarification evidence;
- record BM decision;
- fetch protected evidence;
- resolve deterministic earthquake duplicate;
- list uncertain earthquake match reviews for authorized review.

All lifecycle transitions run through one server-side transition service. UI
checks improve usability but are never treated as authorization.

## 11. Testing and Verification

Tests are written first for each changed behavior and observed failing before
production implementation. The automated suite covers all 20 acceptance
scenarios, including:

- role and canonical branch isolation;
- manual and automatic lifecycle transitions;
- three BM decisions and stale/double-decision rejection;
- server-side evidence/exception rules;
- auto-first and manual-first event/store deduplication;
- concurrent insert conflict handling;
- uncertain-match review without merge;
- protected evidence access and cross-branch rejection;
- legacy evidence compatibility;
- technical workflow regressions;
- ineffective legacy national operational overrides.

Verification commands are:

```text
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Relevant integration scripts run separately with exact outputs recorded. Browser
acceptance covers camera, gallery provenance, role queues, evidence preview, and
the three BM decisions. Browser checks are reported independently as PASS,
FAIL, BLOCKED, or UNVERIFIED.

The current local `tsx` execution blocker (`uv_os_get_passwd ... ENOMEM`) is
investigated and isolated before implementation verification. It is not treated
as a passing or failing application test until the runner executes.

## 12. Delivery and Recovery

Work is delivered as small reviewable commits:

1. Design and implementation plan.
2. Test scaffolding and additive migration.
3. Authorization and lifecycle service.
4. Earthquake event/store deduplication.
5. Protected evidence domain and endpoints.
6. Tim Toko/BM/HO UI integration.
7. Regression corrections and final verification report.

No commit merges to `main`. No operational seed data is created. The
`usr_seed_admin` record is untouched.

Application commits can be reverted individually. The additive migration has a
separate documented rollback that removes only newly introduced objects, and is
never applied to an operational database without backup verification, duplicate
audit review, approval, and a recovery window. Historical records are never
deleted during rollback.

## 13. Completion Rule

The corrective is complete only when core authorization, lifecycle,
deduplication, and evidence scenarios have been demonstrated. Any unexecuted
browser or environment-dependent check remains explicitly `UNVERIFIED` or
`BLOCKED`; it is never reported as PASS.
