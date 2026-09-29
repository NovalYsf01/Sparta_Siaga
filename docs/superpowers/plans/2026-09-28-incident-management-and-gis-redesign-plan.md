# SPARTA Sentinel: Refined Incident Management & GIS Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul SPARTA Sentinel to resolve all identified shortcomings: implement branch-level aggregation on zoom-out (titik percabang), compact & minimizable floating map controls, an interactive "Daftar 17 Gempa Terkini" modal, dynamic linking of live BMKG earthquakes into the active incident queue, and a completely cohesive responsive theme (desktop & mobile).

**Architecture:** Next.js 16 App Router client-side multi-view hub. GIS enhanced with branch centroid clustering for zoom $\le 7$ and individual store rendering for zoom $\ge 8$. Earthquake alert ticker upgraded with a dedicated national earthquake list modal. UI polished with corporate slate navy theme matching the RetailCare reference.

**Tech Stack:** Next.js 16.1.7, React 19.2.4, TypeScript 5.7, Tailwind CSS v4, Leaflet 1.9, Lucide React, Open-Meteo, Petabencana.id, BMKG InaTEWS.

---

## Global Constraints

- Zoom $\le 7$ must aggregate stores into branch DC points (`titik percabang`), not individual store points.
- Affected / damaged stores must always display pulsating emergency pins (`pulse-beacon`) at all zoom levels.
- Map controls must be compact and minimizable into a single button pill.
- The top alert bar must provide a full list modal of all active earthquakes in Indonesia.
- Active earthquakes impacting stores must dynamically enter the incident verification queue.
- Sidebar, header, and dashboard cards must share a unified, harmonious corporate theme without jarring color mismatches.

---

### Task 1: GIS Map - Branch-Level Aggregation (`Titik Percabang`) on Zoom-Out

**Files:**
- Modify: `components/map/map-inner.tsx`

**Interfaces:**
- Consumes: `stores: Store[]`, `currentZoom: number`, `showStoresLayer: boolean`
- Produces: Aggregated branch markers when `currentZoom <= 7` (e.g., `Cabang Bandung (1,240 Toko)`), individual store markers when `currentZoom >= 8`. Affected stores always rendered with pulsating alert pin.

- [ ] **Step 1: Compute Branch Aggregations in `map-inner.tsx`**
Calculate centroid coordinates and store count per `store.cabang`:
```typescript
interface BranchAggregation {
  cabang: string;
  latitude: number;
  longitude: number;
  totalStores: number;
  hasDanger: boolean;
  hasWarning: boolean;
}
```

- [ ] **Step 2: Render Branch Markers on Zoom $\le 7$**
When `currentZoom <= 7` and `showStoresLayer` is true, render `BranchAggregation` markers styled as prominent branch pins with badge numbers. Clicking a branch pin zooms into that branch (`zoom: 10`).

- [ ] **Step 3: Ensure Affected Stores Always Render**
Stores with `status === "danger"` or `status === "warning"` are always rendered as pulsating emergency pins regardless of zoom level.

- [ ] **Step 4: Run typecheck**
Run: `pnpm typecheck`  
Expected: PASS

---

### Task 2: Compact & Minimizable Floating Map Controls

**Files:**
- Modify: `components/map/map-controls.tsx`

**Interfaces:**
- Consumes: `activeLayer`, `onLayerChange`, `basemap`, `onChangeBasemap`
- Produces: A compact floating pill bar with an expand/minimize toggle that never obstructs the map and has no ugly vertical scrollbars.

- [ ] **Step 1: Implement Minimizable State in `map-controls.tsx`**
Add `isMinimized` toggle state. When minimized, render a sleek floating pill: `[ 🗺️ Kontrol Layer & Filter ]`.

- [ ] **Step 2: Compact the Expanded Layout**
Remove redundant bulky text and heights. Group layer pills (`Semua`, `Gempa`, `Toko`, `Cuaca`) and basemap pills into clean horizontal badges that fit in a single neat card without vertical scrollbars.

- [ ] **Step 3: Run typecheck**
Run: `pnpm typecheck`  
Expected: PASS

---

### Task 3: Interactive "Daftar 17 Gempa Terkini" Hub & Drawer

**Files:**
- Create: `components/disaster/earthquake-list-modal.tsx`
- Modify: `components/disaster/disaster-alert-bar.tsx`

**Interfaces:**
- Consumes: `earthquakes: Earthquake[]`, `onSelectEarthquake(eq: Earthquake): void`
- Produces: A comprehensive national earthquake drawer/modal displaying all current earthquakes with magnitude badges, depth, timestamps, and affected store counts.

- [ ] **Step 1: Create `earthquake-list-modal.tsx`**
Build a modal displaying a clean list of all 17 BMKG/USGS earthquakes. Each item shows:
- Magnitude badge (red for $M \ge 5.0$, amber for $< 5.0$)
- Epicenter location title
- Depth and timestamp
- Badge: `X Toko Terdampak`
- "Lihat di Peta" fly-to action button.

- [ ] **Step 2: Add List Trigger Button in `disaster-alert-bar.tsx`**
In the alert bar, add a prominent button: `[ 📋 Daftar Gempa Nasional (17) ]` that opens `earthquake-list-modal.tsx`.

- [ ] **Step 3: Run typecheck**
Run: `pnpm typecheck`  
Expected: PASS

---

### Task 4: Dynamic Linking of Live BMKG Earthquakes into Incident Queue

**Files:**
- Modify: `app/page.tsx`
- Modify: `lib/incident-store.ts`

**Interfaces:**
- Consumes: `computedStores: Store[]`, `disasterData: DisasterFeedResponse`
- Produces: Automatically injects stores in the danger zone of live earthquakes into the active incident queue with status `verifying` ("Menunggu Verifikasi Store Manager").

- [ ] **Step 1: Auto-generate Pending Incident Records from Affected Stores**
In `app/page.tsx`, when `computedStores` detects stores with `status === "danger"`, merge them into the active incident queue if not already present, setting `status: "verifying"`.

- [ ] **Step 2: Ensure Store Manager Verification Flow Works**
Clicking verify on a live earthquake incident opens `StoreVerificationModal`, allowing Store Manager or Admin HO to confirm damage or safe status.

- [ ] **Step 3: Run typecheck**
Run: `pnpm typecheck`  
Expected: PASS

---

### Task 5: Theme & UI Harmonization (RetailCare Reference Aesthetic)

**Files:**
- Modify: `components/layout/incident-app-shell.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: Harmonious color palettes across sidebar, header, and cards in both Light Mode (RetailCare navy slate + clean white cards) and Dark Mode.

- [ ] **Step 1: Unify Sidebar & Body Color Tokens**
Align sidebar to sleek Corporate Navy (`bg-slate-900 border-r border-slate-800`), header to crisp white with soft borders, and body background to light subtle slate (`bg-slate-100/70`).

- [ ] **Step 2: Synchronize Theme Toggle**
Ensure switching theme properly updates sidebar accents, cards, and map basemap without contrast clashes.

- [ ] **Step 3: Run typecheck**
Run: `pnpm typecheck`  
Expected: PASS

---

### Task 6: Mobile Experience Overhaul

**Files:**
- Modify: `components/mobile/mobile-incident-home.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: Seamless native smartphone UI with zero desktop bleed, touch-optimized cards, and bottom navigation.

- [ ] **Step 1: Optimize Mobile Spacing and Elements**
Eliminate horizontal overflow, ensure buttons and cards have comfortable touch targets ($44$px minimum).

- [ ] **Step 2: Ensure Mobile Map is Full-Screen with Mobile Bottom Sheet**
When opening the map on mobile, hide bulky controls and use touch-friendly bottom sheets.

- [ ] **Step 3: Run typecheck**
Run: `pnpm typecheck`  
Expected: PASS

---

### Task 7: End-to-End Build & Visual Verification

**Files:**
- Test: `app/page.tsx` and all modified components

- [ ] **Step 1: Run full typecheck**
Run: `pnpm typecheck`  
Expected: PASS with 0 errors.

- [ ] **Step 2: Visual Browser Verification**
Verify via browser:
1. Zoom out on map $\rightarrow$ stores cleanly aggregate into branch DC pins (`Cabang Bandung`, `Cabang Bekasi`, etc.).
2. Map controls minimize cleanly into a small pill button without vertical scrollbars.
3. Clicking `Daftar Gempa Nasional` opens the modal with all 17 earthquakes.
4. Clicking an earthquake flies the map directly to that epicenter.
5. Store verification and maintenance escalation workflows update seamlessly.
