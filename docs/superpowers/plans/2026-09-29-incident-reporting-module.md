# Incident Reporting Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dynamic incident reporting form with auto-identity, smart templates, photo uploads via UploadThing, and a threaded timeline view for updates.

**Architecture:** We will extend the existing PostgreSQL `incidents` schema to heavily utilize the `timeline` JSONB column. The UI will use `@uploadthing/react` for cloud file uploads and dynamic state for smart disaster templates.

**Tech Stack:** Next.js App Router, React, PostgreSQL (`pg`), UploadThing.

## Global Constraints
- Use Next.js App Router conventions.
- No testing frameworks (Jest/Vitest) exist. Testing steps must rely on `npm run typecheck` and manual testing (e.g. `curl` or browser).
- Avoid touching existing Dashboard components unnecessarily, focus on the Modals.
- Always run `npm run typecheck` to verify TypeScript validity after changes.

---

### Task 1: Setup UploadThing & Types

**Files:**
- Create: `app/api/uploadthing/core.ts`
- Create: `app/api/uploadthing/route.ts`
- Create: `lib/uploadthing.ts`
- Modify: `types/incident.ts`

**Interfaces:**
- Produces: `<UploadButton>` component and `TimelineEvent` type with `photos?: string[]`.

- [ ] **Step 1: Install UploadThing dependencies**
```bash
npm install uploadthing @uploadthing/react
```

- [ ] **Step 2: Update `types/incident.ts`**
Add `photos?: string[]` to `TimelineEvent`.
Add `id?: string` to `TimelineEvent`.
Ensure `IncidentRecord` is exported properly.

- [ ] **Step 3: Create UploadThing Core**
Create `app/api/uploadthing/core.ts` defining an `imageUploader` that accepts `image` with max file size 4MB and max file count 4.

- [ ] **Step 4: Create UploadThing Route**
Create `app/api/uploadthing/route.ts` exporting `GET` and `POST` handlers from `createRouteHandler({ router: ourFileRouter })`.

- [ ] **Step 5: Verify types**
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add .
git commit -m "feat: setup uploadthing and update types"
```

---

### Task 2: Update Database Utilities

**Files:**
- Modify: `lib/incident-db.ts`

**Interfaces:**
- Produces: `dbAddTimelineEvent(incidentId: string, event: TimelineEvent)`

- [ ] **Step 1: Implement `dbAddTimelineEvent`**
In `lib/incident-db.ts`, create a function that updates the JSONB timeline array for a specific incident ID.
```typescript
export async function dbAddTimelineEvent(id: string, event: TimelineEvent) {
  // Use sql: UPDATE incidents SET timeline = timeline || $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING *
}
```

- [ ] **Step 2: Ensure `dbCreateIncident` creates initial timeline**
Modify `dbCreateIncident` so that it ensures `timeline` array has at least one element (the initial report) if not provided by the client.

- [ ] **Step 3: Verify types**
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add lib/incident-db.ts
git commit -m "feat: db utilities for timeline updates"
```

---

### Task 3: Timeline API Endpoint

**Files:**
- Create: `app/api/incidents/[id]/timeline/route.ts`

**Interfaces:**
- Consumes: `dbAddTimelineEvent` from Task 2.
- Produces: `PATCH /api/incidents/[id]/timeline` endpoint.

- [ ] **Step 1: Implement PATCH handler**
Create the endpoint. Parse `request.json()` to get `{ message, photos, actor, role }`.
Construct a `TimelineEvent` object (generate a random ID or timestamp for `id`).
Call `dbAddTimelineEvent(params.id, event)`.

- [ ] **Step 2: Write a minimal test script**
Create `scripts/test-timeline-api.ts` (or just use curl) to send a PATCH request to an existing incident ID to verify it returns 200 OK.

- [ ] **Step 3: Verify types**
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add app/api/incidents
git commit -m "feat: add timeline patch endpoint"
```

---

### Task 4: Refactor ManualIncidentModal (Auto-Identity & Smart Templates)

**Files:**
- Modify: `components/map/manual-incident-modal.tsx` (or wherever it exists).

**Interfaces:**
- Consumes: UploadThing `<UploadButton>`

- [ ] **Step 1: Add Smart Templates logic**
Add a `useEffect` that listens to `disasterType`. When it changes to `fire`, set `notes` to a fire template. When `theft`, set to a theft template.

- [ ] **Step 2: Add Auto-Identity logic (Clerk simulation)**
Since Clerk is used, simulate or hook into `useUser()`. If role is `store_manager`, hide the Store Selector and force `storeId`.

- [ ] **Step 3: Integrate UploadThing Button**
Add `<UploadButton endpoint="imageUploader" onClientUploadComplete={(res) => { ... }}>` below the notes textarea. Store uploaded URLs in a new state `photos`.

- [ ] **Step 4: Modify Submit Handler**
Include `photos` in the POST payload to `/api/incidents`.

- [ ] **Step 5: Verify types**
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add components/
git commit -m "feat: smart templates and upload in manual incident form"
```

---

### Task 5: Refactor IncidentDetailModal (Timeline Feed)

**Files:**
- Modify: `components/map/incident-detail-modal.tsx` (or wherever it exists).

**Interfaces:**
- Consumes: `PATCH /api/incidents/[id]/timeline` from Task 3.

- [ ] **Step 1: Build the Timeline UI**
Modify the modal to split into two sections or a scrollable feed. Iterate over `incident.timeline` and render each `TimelineEvent` (showing `actor`, `timestamp`, `message`, and rendering `photos` as `<img>`).

- [ ] **Step 2: Build the Timeline Update Form**
Add a `<textarea>` and `<UploadButton>` at the bottom of the feed.

- [ ] **Step 3: Hook up the submit logic**
When the update form is submitted, call `PATCH /api/incidents/[incident.id]/timeline` with the new message and photos. Refresh the incident data after success.

- [ ] **Step 4: Verify types and UI**
Run: `npm run typecheck`
Check the browser to ensure the modal looks correct and can post updates.

- [ ] **Step 5: Commit**
```bash
git add components/
git commit -m "feat: incident detail timeline feed and update form"
```
