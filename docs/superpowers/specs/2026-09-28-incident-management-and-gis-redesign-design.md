# SPARTA Siaga: Incident Management & GIS Redesign Specification

**Date:** 2026-09-28  
**Status:** Approved by User  
**Target Module:** SPARTA Siaga (`sparta-siaga`)  
**Ecosystem:** SPARTA Retail Suite (`login-sparta`, `sparta-siaga`, `sparta-maintenance`)

---

## 1. Executive Summary

SPARTA Siaga is the central disaster early warning, store safety monitoring, and incident response hub for SPARTA's retail store network (21,550+ stores across Indonesia).

This design specification upgrades SPARTA Siaga from a standalone map viewer to an enterprise-grade **Incident Management & GIS Platform** inspired by the modern RetailCare architecture:
1. **Responsive Multi-View Hub**: A desktop command-center dashboard (sidebar navigation, KPI statistics, trend lines, category donut, active incidents table with progress tracking) and a mobile app-like interface (quick incident reporting, disaster category grid, progress stepper, bottom navigation bar).
2. **End-to-End Disaster & Maintenance Workflow**: Automated BMKG earthquake detection $\rightarrow$ global safety broadcast to all stores $\rightarrow$ permission-gated verification by affected Store Managers / HO $\rightarrow$ standardized rapid damage reporting $\rightarrow$ automatic escalation and handoff to SPARTA Maintenance $\rightarrow$ status progression ($0\% \rightarrow 100\%$) $\rightarrow$ automatic archiving to History for audit and management review.
3. **Interactive Multi-Layer GIS with Smart Clustering**: Unified map view featuring floating layer controls (All, Earthquake BMKG, Store Network, Weather Radar) and smart marker clustering combining performant circle clusters with prominent pulsating emergency pins for at-risk stores.
4. **SPARTA SSO & Module Alignment**: Seamless identity and role compatibility with the `login-sparta` launcher.

---

## 2. User Roles & Access Control

| Role | Access Scope | Verification & Action Authority |
|---|---|---|
| **Admin HO (Head Office)** | National level (All branches & stores) | Full view, global broadcasts, can verify condition of any affected store, can override maintenance tickets, can export reports. |
| **Store Manager (Affected Store)** | Specific store within earthquake impact radius | Can confirm condition (Aman vs Rusak), fills rapid damage report form, uploads proof photos, sets store open/closed status. |
| **Store Manager (Non-Affected Store)** | Normal stores outside impact radius | Read-only broadcast alerts and disaster awareness feed. Verification buttons are disabled. |
| **SPARTA Maintenance Team** | Assigned facility repair tickets | Updates repair progress ($30\% \rightarrow 60\% \rightarrow 100\%$), assigns technician, logs physical repairs and resolution photos, marks ticket as "Selesai". |

---

## 3. UI/UX Architecture & Layouts

### 3.1. Desktop Command Center Layout (Width $\ge 1024$px)

- **Fixed Sidebar Navigation (Left, 260px)**
  - Brand header: SPARTA Siaga logo + subtitle *"Incident & Disaster Management"*.
  - Main Navigation:
    - 📊 **Dashboard**: Executive summary, analytics charts, active incidents table, next actions.
    - 🗺️ **Monitoring Peta**: Full-screen GIS hub with layer switches and cluster analysis.
    - 📋 **Laporan & Penanganan**: Incident queue, verification modals, maintenance tracking.
    - 🕒 **History / Riwayat**: Closed incidents archive, date filters, and export tools.
    - ⚙️ **Pengaturan & Role Switcher**: Switch simulated roles (Admin HO, Store Manager Toko Cibubur, Sparta Maintenance) for rapid testing.
  - Footer caption: *"Toko Aman, Operasional Lancar, Bersama Kita"*.

- **Header Top Bar**
  - Universal search input with keyboard shortcut hint (`Ctrl + K`).
  - Active date range selector (e.g., *"1 Sep 2026 - 30 Sep 2026"*).
  - Emergency notification bell with unread badge counter.
  - User identity badge (e.g., *"Budi Santoso - Admin HO"* or *"Manager Toko Cibubur"*).

- **Dashboard Content (Inspired by RetailCare Reference)**
  - **Welcome Banner**: *"Selamat Datang, [Nama] - Pantau dan kelola seluruh kejadian di toko secara real-time"*.
  - **KPI Metric Stat Cards (7 Cards Row)**:
    - Total Kejadian (with $\uparrow 20\%$ trend indicator).
    - Toko Kemalingan (Theft icon).
    - Kebakaran (Fire icon).
    - Gempa Bumi (Earthquake icon).
    - Banjir (Flood icon).
    - Angin Kencang (Wind/Storm icon).
    - Lainnya (Other icon).
  - **Analytics Grid**:
    - Line Chart: *Tren Kejadian Bulanan (Jan - Sep)* with distinct color per incident type.
    - Donut Chart: *Distribusi Kejadian* with percentage breakdown per disaster type.
  - **Active Incidents Table (Daftar Kejadian Terbaru)**:
    - Columns: `No` | `Tanggal` | `Toko` | `Jenis Kejadian (Badge)` | `Lokasi` | `Status (Pill badge)` | `Progress (Progress bar %)` | `Aksi (Lihat button)`.
    - Header action button: `+ Buat Laporan Baru`.
  - **Bottom Analytics & Actions**:
    - Status Penanganan Donut: Selesai ($33\%$), Dalam Penanganan ($42\%$), Investigasi ($13\%$), Verifikasi ($8\%$), Belum Ditangani ($4\%$).
    - Tindakan Selanjutnya List: Schedule of next operational actions by date.

### 3.2. Mobile App-Like Layout (Width $< 1024$px)

- **Compact App Header**: SPARTA Siaga emblem, store badge, emergency notification bell.
- **Hero Action Card**: Prominent card with `+ Buat Laporan Baru` or `Konfirmasi Gempa Terkini`.
- **Disaster Category Grid (2 rows x 3 columns)**:
  - Kemalingan, Kebakaran, Gempa Bumi, Banjir, Angin, Lainnya (soft pastel colored cards with icons).
- **Incident Summary Cards**: Mobile-optimized metric counters.
- **Progress Penanganan Stepper**: Horizontal stage tracker (*Laporan Masuk $\rightarrow$ Verifikasi SM $\rightarrow$ Perbaikan Maintenance $\rightarrow$ Selesai*) with percentage indicator.
- **Bottom Navigation Bar (Fixed bottom)**:
  - 🏠 Beranda | 📋 Laporan | 🗺️ Monitoring | 🔔 Notifikasi | 👤 Akun.

---

## 4. End-to-End Business Logic & Workflow

### 4.1. Earthquake Detection & Alert Broadcast
1. Real-time BMKG auto-polling detects earthquakes with $M \ge 5.0$ or shaking reports.
2. Broadcast notification is delivered to **all stores nationwide** for general situational awareness.
3. System calculates the damage radius using the Haversine formula based on magnitude:
   - High Risk: radius $< 50$ km
   - Moderate Risk: radius $50 - 150$ km
   - Low/Monitoring: radius $> 150$ km
4. **Automated Incident Creation (Option A)**: For every store located inside the High and Moderate risk zones, the system **automatically creates an Active Incident Report** without any HO intervention.
5. These auto-generated reports are immediately assigned the status **"Menunggu Verifikasi Toko"** (`verifying`) and pushed to the respective Store Managers.
6. HO Admin simply monitors the Active Incidents dashboard as these automated tickets populate and await store responses.

### 4.2. Verification & Damage Reporting
1. Only the **Store Manager of the affected store** or **Admin HO** can confirm store condition.
2. Store Manager opens the verification modal:
   - **Option A: "Toko Aman (Tidak Ada Kerusakan)"** $\rightarrow$ Store marked safe, notes recorded (e.g. "Struktur dan rak barang stabil"), incident status set to `resolved` and archived to History.
   - **Option B: "Toko Mengalami Kerusakan"** $\rightarrow$ Triggers the **Form Standar Cepat**:
     - Damage categories (multi-select): Dinding/Struktur, Kaca/Pintu, Rak Barang Jatuh, Kelistrikan/AC, Plafon.
     - Severity: Ringan, Sedang, Berat.
     - Photographic proof: Image upload.
     - Operational status: Buka Normal vs Tutup Sementara.

### 4.3. Escalation to SPARTA Maintenance
1. When damage is reported, SPARTA Siaga automatically issues a maintenance ticket:
   - Ticket format: `#SPM-YYYYMMDD-XXXX` (e.g., `#SPM-20260901-0042`).
2. Ticket is routed to SPARTA Maintenance work queue.
3. Progress status transitions:
   - `Verifikasi Selesai` ($20\%$)
   - `Teknisi Ditugaskan / Investigasi` ($30\%$)
   - `Dalam Pengerjaan Fisik` ($60\%$)
   - `Perbaikan Selesai` ($100\%$)
4. Every status change updates the notification log and progress stepper with timestamp, actor name, and notes.

### 4.4. Transition to History & Archiving
1. Once an incident reaches $100\%$ completion (`resolved`), it automatically moves out of the Dashboard's **Daftar Kejadian Aktif**.
2. It is archived permanently into the **History / Riwayat Kejadian** tab.
3. Historical records remain fully accessible for:
   - Post-disaster management evaluation meetings.
   - Insurance and asset loss claims.
   - Export to CSV / Excel for executive reporting.

---

## 5. Interactive GIS Map & Smart Clustering Specification

### 5.1. Multi-Layer Control
Floating pill-based layer switcher situated on the map:
- 🔘 **Semua Layer (All Active)**: Overlays earthquakes, stores, and weather radar simultaneously.
- 🌋 **Layer Gempa BMKG**: Renders epicenter point, magnitude, depth, and colored MMI shake circles.
- 🏪 **Layer Titik Toko**: Displays all retail store positions.
- 🌧️ **Layer Cuaca & Radar**: BMKG rainfall and wind radar overlay.

### 5.2. Smart Marker Clustering Mechanism
- **Normal Stores (Zoom Out: Level $4 - 10$)**:
  - Clustered via Leaflet MarkerCluster into clean numeric circle badges (e.g., `[+120]`, `[+1,450]`).
  - Color-coded cluster badges based on density (green to amber).
- **Normal Stores (Zoom In: Level $11 - 18$)**:
  - Automatically spiderfies / unclusters into discrete retail store pins.
- **Affected / Emergency Stores (Pulsating Emergency Pins)**:
  - Custom DivIcon styled with high z-index and animated CSS pulsating glow (`@keyframes pulse-ring`).
  - Always prominently visible regardless of zoom level.
  - Surrounding cluster badges gain an emergency alert indicator (e.g., `⚠️ 2 Toko Terdampak`).

### 5.3. Interactivity
- **Fly-to Epicenter**: Clicking any earthquake notification or table entry smoothly pans and zooms the map to the event epicenter.
- **Store Quick Drawer / Sheet**: Clicking a store pin opens a detailed side panel (desktop) or bottom sheet (mobile) showing distance from earthquake, branch code, current status, and verification button.

---

## 6. Data Model & Architecture

### 6.1. Types & Interfaces

```typescript
export type DisasterType = 
  | "earthquake" 
  | "flood" 
  | "fire" 
  | "theft" 
  | "wind" 
  | "other";

export type IncidentStatus = 
  | "verifying"        // Menunggu verifikasi SM/HO
  | "investigating"    // Verifikasi ada kerusakan, teknisi ditugaskan
  | "in_maintenance"   // Sedang dalam perbaikan fisik
  | "resolved"         // Selesai ditangani
  | "archived";        // Diarsipkan di history

export interface IncidentRecord {
  id: string; // INC-2026-XXXX
  date: string;
  disasterType: DisasterType;
  storeId: string;
  storeName: string;
  branch: string;
  locationCity: string;
  status: IncidentStatus;
  progress: number; // 0 - 100
  disasterMetadata?: {
    magnitude?: number;
    depth?: string;
    coordinates?: [number, number];
    place?: string;
    time?: string;
  };
  verification?: {
    confirmedBy: string;
    confirmedAt: string;
    isDamaged: boolean;
    categories?: string[];
    severity?: "Ringan" | "Sedang" | "Berat";
    photos?: string[];
    operationalStatus?: "Buka Normal" | "Tutup Sementara";
    notes?: string;
  };
  maintenanceTicket?: {
    ticketId: string;
    assignedTechnician?: string;
    workDescription?: string;
    completedAt?: string;
    resolutionPhotos?: string[];
  };
  timeline: Array<{
    stage: string;
    label: string;
    timestamp: string;
    actor: string;
    notes?: string;
  }>;
}
```

### 6.2. State Management & Storage
- **Central Incident Context**: Reactive state handling active vs archived incidents.
- **Local Persistence (`localStorage`)**: Persists custom-reported incidents, verification updates, and simulated progress so that browser refreshes during reviews preserve state.
- **Ready for API/SSO**: Clean payload structure matching `@sparta/shared` session specifications (`fullName`, `branch`, `access`).

---

## 7. Analisis Perbandingan API & Justifikasi Arsitektur (Bahan Presentasi)

Bagian ini dirancang khusus sebagai materi argumen teknis dan bisnis dalam presentasi kepada manajemen/stakeholder.

### 7.1. Sumber Data Gempa Bumi & Kebencanaan (Disaster Feed API)

| Kriteria Evaluasi | **BMKG Open Data (InaTEWS)** *(Dipilih Utama)* | **USGS Earthquake API** *(Fallback)* | **GDACS (PBB / Global)** | **EMSC (Eropa-Mediterania)** |
|---|---|---|---|---|
| **Cakupan Sensor Indonesia** | **Maksimal (Paling Rapat)**. Memiliki ratusan seismograf lokal di seluruh kepulauan nusantara. | Cukup, namun hanya mengandalkan sensor gempa global jarak jauh. | Terbatas untuk gempa besar ($M \ge 6.0$). | Kurang rapat untuk wilayah Indonesia timur. |
| **Kecepatan Deteksi (Latensi)** | **Sangat Cepat ($1 - 3$ menit pasca guncangan)** untuk gempa lokal daratan dan pesisir. | $5 - 10$ menit lebih lambat untuk gempa kepulauan Indonesia. | $15 - 30$ menit (agregasi lintas benua). | $5 - 15$ menit. |
| **Informasi Dampak Lokal (MMI & Wilayah)** | **Sangat Spesifik**. Menyebutkan nama kota/kabupaten lokal terdampak beserta skala MMI (misal: "Dirasakan di Cianjur IV MMI, Bandung III MMI"). | Hanya derajat intensitas global, nama daerah dalam ejaan internasional. | Ringkasan naratif makro internasional. | Komentar saksi mata umum, kurang terstruktur. |
| **Legalitas & Standar Audit Retail** | **Sumber Resmi Negara Republik Indonesia**. Valid untuk dasar klaim asuransi properti toko dan SOP mitigasi darurat resmi. | Data sekunder riset global, bukan otoritas hukum bencana Indonesia. | Referensi kemanusiaan PBB. | Komunitas seismologi Eropa. |
| **Biaya & Kuota (Cost/Rate Limit)** | **100% Gratis & Open Data Publik** (tanpa API key, payload JSON/XML stabil). | Gratis, namun format GeoJSON global membutuhkan parsing filtering koordinat Indonesia. | Gratis RSS/GeoJSON. | Terbatas rate limit. |

> **Argumen Presentasi (Mengapa BMKG?):**  
> *"BMKG adalah satu-satunya otoritas resmi Republik Indonesia dengan jaringan sensor seismik terpadat di tanah air. Menggunakan BMKG memastikan deteksi tercepat, pencantuman wilayah terdampak berstandar MMI lokal, sah secara legalitas audit operasional toko, dan 100% bebas biaya lisensi. Sistem juga dilengkapi secondary fallback ke USGS jika terjadi kendala jaringan."*

---

### 7.2. Engine Peta & Tile Provider (Web Mapping GIS)

| Kriteria Evaluasi | **Leaflet.js + OSM/Esri/Carto** *(Dipilih)* | **Google Maps JavaScript API** | **Mapbox GL JS** |
|---|---|---|---|
| **Biaya Lisensi (21.550+ Toko)** | **Rp 0 / Bulan (Open Source & Zero Cost)**. Bebas diakses ribuan pengguna internal toko & HO tanpa tagihan per-load. | **Sangat Mahal ($7.00 per 1.000 load)**. Dengan ribuan toko dan refresh konstan, biaya bulanan bisa mencapai jutaan hingga puluhan juta rupiah. | Berbayar setelah free tier (berbasis Map Loads & monthly active users). |
| **Performa Clustering Titik Masif** | **Sangat Cepat dengan `leaflet.markercluster`**. Sanggup merender puluhan ribu toko dengan pengelompokan angka mulus (60 FPS). | Cenderung lambat/berat jika memuat puluhan ribu marker DOM tanpa library kustom yang rumit. | Sangat baik untuk vector rendering 3D, namun setup bundler dan lisensi v2/v3 berbayar. |
| **Kemandirian & Ketahanan Sistem** | **Maksimal**. Tidak bergantung pada billing kartu kredit perusahaan yang bisa terblokir atau kuota habis saat kondisi darurat. | Rentan *quota limit* atau *billing card expiration* saat traffic bencana melonjak. | Ketergantungan API key Mapbox token. |
| **Kustomisasi Tampilan (Dark & Light)** | Mendukung penuh Basemap Tiles modern: *CartoDB Dark Matter* untuk Command Center HO dan *Positron/OSM* untuk Mobile Toko. | Kustomisasi styling JSON terbatas dan berbayar tambahan. | Sangat fleksibel, namun butuh tool Mapbox Studio. |

> **Argumen Presentasi (Mengapa Leaflet + OSM/Esri/Carto?):**  
> *"Untuk memantau lebih dari 21.000 toko retail secara real-time, menggunakan Google Maps akan membebani operasional perusahaan dengan biaya lisensi ribuan dolar per bulan hanya untuk me-render peta. Leaflet.js dipadukan dengan CartoDB/OSM/Esri memberikan performa rendering clustering toko yang super ringan, mendukung tema Dark Mode Command Center yang futuristik, dan 100% bebas biaya selamanya."*

---

### 7.3. Cuaca, Radar & Presipitasi (Weather & Cyclone Engine)

Di SPARTA Siaga, kebutuhan cuaca dibagi menjadi 2 aspek: **Visualisasi Hamparan Radar di Peta GIS** dan **Prakiraan Cuaca Numerik Per Koordinat Toko**.

| Kriteria Evaluasi | **Open-Meteo API** *(Dipilih untuk Toko)* | **RainViewer Tile API** *(Dipilih untuk Peta)* | **OpenWeatherMap 2.0** | **Windy Web API** |
|---|---|---|---|---|
| **Fungsi Utama** | **Data Numerik Titik Koordinat**: Memberikan suhu, kecepatan angin, kelembapan, dan prakiraan hujan 7 hari per toko. | **Visual Layer Peta (GIS Tile)**: Menampilkan lapisan animasi visual radar Doppler awan hujan di atas peta. | Kombinasi data numerik dan tile berbayar. | Visual animasi angin interaktif via iframe khusus. |
| **Format Output** | JSON respon berbasis koordinat latitude/longitude toko. | Standard XYZ Map Tile (`{z}/{x}/{y}.png`). | JSON & Map Tile terpisah. | WebGL Iframe / SDK embed. |
| **Kebutuhan Lisensi & API Key** | **100% Bebas API Key & Gratis** hingga 10.000 panggilan/hari (Open Source berbasis model ECMWF/GFS). | **Gratis** untuk visualisasi radar publik. | Wajib API Key berbayar untuk akses data per jam & layer resolusi tinggi. | Wajib lisensi enterprise tahunan berbayar mahal. |
| **Peran di SPARTA Siaga** | **Widget Cuaca Detail Toko** (Memberi info angin kencang/hujan ekstrem di toko terpilih). | **Layer Cuaca Peta GIS** (Menampilkan hamparan awan hujan/badai di seluruh Indonesia). | Alternatif cadangan berbayar. | Terlalu berat dan mahal untuk kebutuhan operasional retail. |

> **Argumen Presentasi (Sinergi Open-Meteo & RainViewer):**  
> *"Kita menerapkan strategi komplementer terbaik tanpa biaya: **RainViewer** digunakan untuk menampilkan visual gumpalan awan hujan/badai secara real-time di layer peta GIS, sedangkan **Open-Meteo** digunakan untuk memberikan data cuaca spesifik per koordinat toko (suhu, kecepatan angin, dan prediksi hujan 7 hari) ketika toko diklik. Keduanya 100% open-source, bebas biaya lisensi, dan tidak membebani anggaran perusahaan."*

---

### 7.4. Deteksi Bencana Banjir & Genangan Air (Flood Monitoring Engine)

Banjir adalah salah satu bencana paling sering melanda gerai retail di Indonesia. Di SPARTA Siaga, pemantauan banjir dirancang memiliki 2 lapisan: **Deteksi Titik Genangan Aktual di Lapangan** dan **Peringatan Dini Prediksi Luapan Sungai**.

| Kriteria Evaluasi | **Petabencana.id Open API** *(Dipilih untuk Titik Riil)* | **Open-Meteo Flood API** *(Dipilih untuk Prediksi)* | **Pantau Banjir BPBD DKI Jakarta** | **GDACS Global Flood Feed (PBB)** |
|---|---|---|---|---|
| **Penyedia & Otoritas** | **BNPB (Badan Nasional Penanggulangan Bencana)** & Yayasan Peta Bencana. | **Copernicus European Union (GloFAS)** & Open-Meteo. | **Pemerintah Provinsi DKI Jakarta** & BPBD DKI. | **PBB (UN OCHA)** & European Commission. |
| **Cakupan Wilayah** | **Indonesia** (Fokus kota-kota padat: Jabodetabek, Bandung, Semarang, Surabaya, dll.). | **Global & Seluruh Indonesia** (Berbasis koordinat latitude/longitude toko). | Terbatas hanya wilayah **DKI Jakarta & sekitarnya**. | Skala makro lintas benua. |
| **Jenis Informasi Bencana** | **Titik genangan aktual terverifikasi** (ketinggian air dalam cm, foto lokasi, status jalan/area terendam). | **Model prediksi luapan debit sungai** harian (*river discharge* $\text{m}^3/\text{s}$ & probabilitas banjir 2-20 tahunan). | **Status Siaga Pintu Air** (Tinggi Muka Air Katulampa, Manggarai, Depok: Siaga 1-4). | Notifikasi bencana makro internasional yang telah terjadi. |
| **Kemudahan Integrasi ke GIS** | **Format GeoJSON standar** (`FeatureCollection`). Langsung ter-render sebagai marker genangan dan polygon area banjir di Leaflet. | Respon JSON time-series debit air per koordinat toko. | REST API / Scraper status pintu air. | RSS / GeoJSON global (perlu filter bbox Indonesia). |
| **Biaya & Kuota API** | **100% Gratis & Open Access** (Inisiatif kemanusiaan publik, tanpa token/key). | **100% Gratis & Bebas Key** (Open-source limit 10.000 call/hari). | Open data publik. | Gratis publik. |

> **Argumen Presentasi (Mengapa Petabencana.id & Open-Meteo Flood?):**  
> *"Banjir adalah ancaman operasional retail nomor satu di musim penghujan. Kita memadukan **Petabencana.id (resmi didukung BNPB)** untuk memetakan titik genangan air aktual secara real-time (lengkap dengan ketinggian sentimeter air di sekitar toko), dan **Open-Meteo Flood API** untuk membaca kenaikan debit sungai sebelum banjir meluap ke gerai. Sinergi ini memberikan waktu berharga bagi Store Manager untuk menyelamatkan stok barang di rak bawah, mematikan panel listrik utama, dan meminta bantuan pompa darurat ke tim SPARTA Maintenance sebelum kerugian membesar."*

---

### 7.5. Protokol Integrasi Internal (SPARTA SSO & Maintenance)

| Kriteria Evaluasi | **Native SPARTA Token Exchange (`@sparta/shared`)** *(Dipilih)* | **Third-Party Service Desk (Jira / Zendesk API)** |
|---|---|---|---|
| **Pengalaman Pengguna (UX)** | **Single Sign-On (1 Pintu)**. Store Manager dan HO tidak perlu login ulang atau berganti aplikasi eksternal. | Petugas harus memiliki akun Jira terpisah, membuka form tiket eksternal yang lambat diakses di HP. |
| **Kecepatan Tindakan Darurat** | **Instan (< 1 detik)**. Form konfirmasi langsung men-generate tiket `#SPM-XXXX` di antrean tim Sparta Maintenance. | Memerlukan waktu setup webhook, mapping custom fields, dan berisiko gagal sync API. |
| **Keamanan Data Aset & Toko** | **100% On-Premise / Internal Server**. Data operasional, omzet dampak, dan foto internal toko tidak keluar ke cloud publik pihak ketiga. | Data toko dan insiden disimpan di server cloud pihak ketiga (SaaS vendor). |
| **Biaya Berlangganan (TCO)** | **Rp 0 biaya tambahan**, memaksimalkan ekosistem SPARTA Building & Maintenance yang sudah ada. | Biaya lisensi per-agen (per user seat per bulan). |

> **Argumen Presentasi (Mengapa Native SPARTA Ecosystem?):**  
> *"Menghubungkan langsung SPARTA Siaga dengan Sparta Maintenance melalui arsitektur SSO bersama menjamin respon darurat dalam hitungan detik, pengalaman terpadu tanpa login ganda bagi Store Manager, kerahasiaan data internal toko tetap aman, dan menghemat biaya berlangganan software pihak ketiga."*

---

## 8. Verification & Testing Criteria

1. **Responsive Testing**:
   - Desktop view ($\ge 1280$px): Sidebar, KPI cards, charts, active table, status donuts properly rendered.
   - Mobile view ($375$px - $430$px): Bottom navigation, category cards, stepper, responsive table cards.
2. **Workflow Verification**:
   - Simulate an earthquake $\rightarrow$ All stores receive notification $\rightarrow$ Affected store marked as pending verification.
   - Switch role to non-affected Store Manager $\rightarrow$ Verify button disabled.
   - Switch role to affected Store Manager $\rightarrow$ Complete Form Standar Cepat $\rightarrow$ Ticket generated.
   - Advance maintenance progress to $100\%$ $\rightarrow$ Incident vanishes from active list and appears in History.
3. **Map Verification**:
   - Toggle layers (Gempa, Toko, Cuaca, All) $\rightarrow$ Map updates without page reload.
   - Zoom out $\rightarrow$ Stores cluster into numbers, but affected store pin pulses brightly with emergency badge.
4. **Data Export Verification**:
   - History tab filters by category and date, and exports clean CSV/Excel files.

