# Form Pelaporan Insiden Baru Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dedicated "Manual Incident Modal" for creating new incident reports, removing the "Toko Aman/Rusak" toggle, and adding a Disaster Type dropdown and Role-based Store Selector.

**Architecture:** We will create a new component `ManualIncidentModal` in `components/incident/` to handle the manual report creation cleanly without polluting `StoreVerificationModal`. `app/page.tsx` will be updated to use this new modal.

**Tech Stack:** React, Next.js, Tailwind CSS, Lucide React

## Global Constraints

- No "Toko Aman / Ada Kerusakan" toggle.
- Must include a Disaster Type dropdown.
- Store Selector must be disabled/locked for Store Managers, but selectable for `ho_admin`.

---

### Task 1: Create ManualIncidentModal Component

**Files:**
- Create: `components/incident/manual-incident-modal.tsx`

**Interfaces:**
- Consumes: `IncidentRecord` types, `rawStores` for dropdown.
- Produces: `ManualIncidentModalProps` with `onConfirm` callback.

- [ ] **Step 1: Write the component scaffolding**

```tsx
"use client";

import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { DisasterType } from "@/types/incident";

interface ManualIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: string;
  rawStores: any[];
  onConfirm: (data: any) => void;
}

export function ManualIncidentModal({ isOpen, onClose, activeRole, rawStores, onConfirm }: ManualIncidentModalProps) {
  const [disasterType, setDisasterType] = useState<DisasterType>("other");
  const [storeId, setStoreId] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [severity, setSeverity] = useState("Sedang");
  const [operationalStatus, setOperationalStatus] = useState("Buka Normal");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Buat Laporan Baru</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const store = rawStores.find(s => s.kode_toko === storeId || s.id === storeId);
          onConfirm({
            disasterType,
            storeId,
            storeName: store?.nama_toko || "Unknown",
            branch: store?.cabang || "Unknown",
            locationCity: store?.kab_kota || "Unknown",
            categories,
            severity,
            operationalStatus,
            notes
          });
        }} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div>
            <label className="text-xs font-bold block mb-1">Toko (Auto-fill jika bukan Admin)</label>
            <select value={storeId} onChange={e => setStoreId(e.target.value)} disabled={activeRole !== "ho_admin"} className="w-full border p-2 rounded text-xs">
              <option value="">Pilih Toko...</option>
              {rawStores.map(s => <option key={s.id || s.kode_toko} value={s.id || s.kode_toko}>{s.nama_toko}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1">Jenis Kejadian</label>
            <select value={disasterType} onChange={e => setDisasterType(e.target.value as DisasterType)} className="w-full border p-2 rounded text-xs">
              <option value="earthquake">Gempa Bumi</option>
              <option value="flood">Banjir</option>
              <option value="fire">Kebakaran</option>
              <option value="theft">Pencurian</option>
              <option value="wind">Angin Kencang</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold rounded-lg p-2 mt-4">Kirim Laporan</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add full UI styling and fields**
Enhance the component with Tailwind styling matching the rest of the application. Add the Categories multiselect, Severity, Operational Status, and Notes textareas mirroring `StoreVerificationModal`.

- [ ] **Step 3: Commit**

```bash
git add components/incident/manual-incident-modal.tsx
git commit -m "feat: add manual incident modal"
```

### Task 2: Integrate ManualIncidentModal in page.tsx

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `ManualIncidentModal`, `incidents` list.
- Produces: Updated state handling for manual reports.

- [ ] **Step 1: Import and render component**

In `app/page.tsx`:
```tsx
import { ManualIncidentModal } from "@/components/incident/manual-incident-modal";
```
Add state `isManualModalOpen`:
```tsx
const [isManualModalOpen, setIsManualModalOpen] = useState(false);
```

- [ ] **Step 2: Update `handleOpenReportModal`**

```tsx
  const handleOpenReportModal = () => {
    setIsManualModalOpen(true);
  };
```

- [ ] **Step 3: Render and handle confirm**

```tsx
      <ManualIncidentModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        activeRole={activeRole}
        rawStores={rawStores}
        onConfirm={(data) => {
          const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
          const newIncident: IncidentRecord = {
            id: `INC-MAN-${Date.now()}`,
            storeId: data.storeId,
            storeName: data.storeName,
            branch: data.branch,
            locationCity: data.locationCity,
            disasterType: data.disasterType,
            date: new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: "investigating",
            progress: 30,
            verification: {
              confirmedBy: activeRole,
              confirmedAt: timestamp,
              isDamaged: true,
              categories: data.categories,
              severity: data.severity,
              operationalStatus: data.operationalStatus,
              notes: data.notes
            },
            maintenanceTicket: {
              ticketId: `SPM-MAN-${Date.now()}`,
              assignedTechnician: "Penugasan Wilayah Sparta Maintenance",
              workDescription: `Pemeriksaan kerusakan.`
            },
            timeline: [
              {
                stage: "Laporan Dibuat",
                label: "Laporan manual baru diinisiasi",
                timestamp,
                actor: activeRole,
              }
            ]
          };
          const updated = [newIncident, ...incidents];
          handleUpdateIncidents(updated);
          setIsManualModalOpen(false);
        }}
      />
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate manual incident modal"
```
