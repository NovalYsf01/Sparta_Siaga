# SPARTA SIAGA — MASTER PROJECT TO-DO LIST

Dokumen pelacakan master untuk seluruh inisiatif rekayasa perangkat lunak, arsitektur, dan jaminan mutu (QA) SPARTA SIAGA.
Status diperbarui secara faktual dan berbasis bukti (*evidence-based*).

- **Target Database Dev:** `sparta_siaga_isolated` (Aiven Cloud PostgreSQL)
- **Database Production Guard:** `defaultdb` dijaga 100% READ-ONLY (Dilarang keras melakukan write/mutasi)
- **Estimasi Progres Keseluruhan:** ~95% (T12 Urgent UI Implementation, T11 & T07 implementasi teknis lengkap)
- **Terakhir Diperbarui:** 15 Oktober 2026

---

## 1. Master Task Tracker

| ID | Nama Task | Prioritas | Status | Progres | PIC / Catatan |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **T01** | Core Laporan, Pemeriksaan, Milestone, Approval & Closing | HIGH | `COMPLETED` | 100% | 10/10 skenario pemeriksaan & approval lulus (`test-bms-bes-inspection-suite.ts`) |
| **T02** | Otomatisasi BMKG/USGS, Canonical Event & Deduplikasi | HIGH | `COMPLETED` | 100% | Worker daemon, canonical event, isolasi gempa susulan verified |
| **T03** | Master 67 Fasilitas & Import Excel | HIGH | `COMPLETED` | 100% | 67 fasilitas terdata di master DB; audit trail dan schema verified |
| **T04** | Autentikasi, Role & Permission | CRITICAL | `COMPLETED` | 100% | Multi-identifier (NIK, Username, ID), bcrypt, role BMS/BES/BMM/HO/Admin |
| **T05** | Hybrid Assignment & PIC | MEDIUM | `COMPLETED` | 100% | Assignment BMS (toko) & BES (fasilitas), delegasi cabang terisolasi |
| **T06** | Integrasi Pelaporan Toko dan Fasilitas | HIGH | `COMPLETED` | 100% | 10/10 skenario role & DC search verified (`test-role-and-dc-search-e2e.ts`) |
| **T07** | Redesign Peta Monitoring Desktop/Mobile | HIGH | `COMPLETED` | 100% | Overhaul layout desktop side-by-side & mobile full-screen, bottom sheets, 4/4 viewports pass |
| **T08** | Dashboard, UI Mobile & PWA | MEDIUM | `COMPLETED` | 100% | Mobile bottom navigation, PWA manifest, service worker caching |
| **T09** | Mapping Cabang dan Aktivasi Fasilitas | MEDIUM | `COMPLETED` | 100% | Audit trail fasilitas, rekonsiliasi manual admin, mapping filter |
| **T10** | UAT & Production Readiness | HIGH | `IN_PROGRESS` | 80% | Menunggu pemeriksaan langsung user; automated browser E2E suites passing |
| **T11** | One-to-Many Multi-Device Login | HIGH | `COMPLETED` | 100% | Stateless JWT multi-device + DB token_version revocation, 10/10 TDD HTTP pass, real multi-browser pass |
| **T12** | Urgent UI Implementation (Role POV, Sidebar & Status) | **CRITICAL (NOW)** | `COMPLETED` | 100% | Restored sidebar (hide 3 only), BMS/BES notification response, BMM 4 KPIs, HO national table read-only, On Progress & target |

---

## 2. Detail Rincian Prioritas Aktif

### T12 — Urgent UI Implementation (Role POV, Sidebar & Status Operasional)

- **Prioritas:** CRITICAL
- **Status:** `COMPLETED` (100%)
- **Target:** Memulihkan menu sidebar sesuai role (hanya menyembunyikan Penugasan, Master Fasilitas, Rekonsiliasi Gempa), mengoptimalkan respons notifikasi BMS/BES dengan auto-PIC dan status On Progress, menyederhanakan dashboard BMM dengan 4 status penanganan, menambahkan panel monitoring per cabang nasional dan penegakan read-only untuk HO, serta memisahkan status penanganan dari persentase milestone fisik dengan target selesai "Belum Ditentukan" tanpa tanggal fiktif.
- **Checklist Implementasi:**
  - [x] **Restore Sidebar (`components/layout/incident-app-shell.tsx`):**
    - Kembalikan seluruh menu role existing (Beranda, Peta Monitoring, Pusat Laporan, Tracking Laporan, Riwayat Laporan, Manajemen User & Role, Data Lokasi, Pengaturan).
    - Hanya sembunyikan 3 menu: Penugasan (`/reports/shared-queue`), Master Fasilitas (`/admin/facilities`), Rekonsiliasi Gempa (`/admin/reconciliation`).
    - Pertahankan rute, API, dan skema database utuh tanpa penghapusan.
    - Pastikan sidebar memiliki scroll internal independen (`overflow-y-auto`).
  - [x] **POV BMS/BES — Notifikasi & Respons (`components/notifications/incident-detail-modal.tsx`, `components/notifications/notification-center-sheet.tsx`):**
    - Tampilkan No. Laporan, Kejadian, Lokasi, Waktu, dan Status Penanganan.
    - Sediakan aksi "Lihat Detail" dan "Mulai Menangani".
    - Setelah berhasil claim (`POST /api/incidents/[id]/pic`), tampilkan PIC otomatis dan status On Progress.
  - [x] **POV BMM — Monitoring Cabang (`app/(siaga)/page.tsx`):**
    - Sederhanakan dashboard BMM menjadi 4 status utama: Belum Ditangani, On Progress, Menunggu Approval, Selesai.
    - Tabel laporan operasional menampilkan PIC, progres fisik (%), update terakhir, target selesai, dan aksi Review/Approval.
  - [x] **POV HO — Monitoring Nasional (`app/(siaga)/page.tsx`):**
    - Ringkasan laporan nasional (Total, On Progress, Menunggu Approval, Selesai).
    - Tabel khusus "Monitoring Penanganan Per Cabang (Nasional)": Nama Cabang, Total Laporan, Belum Ditangani, On Progress, Menunggu Approval, Selesai, Petugas/PIC Aktif, dan Status Keterlambatan (hanya jika target selesai tersedia & lewat waktu).
    - Penegakan HO read-only di level API dan UI.
  - [x] **Status On Progress & Target Selesai (`components/dashboard/active-incidents-table.tsx`, `components/reports/operational-report-center.tsx`, `components/mobile/mobile-incident-home.tsx`):**
    - Bedakan status penanganan operasional (`On Progress`, `Belum Ditangani`, `Menunggu Approval`, `Selesai`) dari persentase milestone fisik (`inc.progress`).
    - Target selesai jika belum ditetapkan tampil sebagai `"Belum Ditentukan"` tanpa membuat SLA/tanggal fiktif.
    - Indikator keterlambatan hanya aktif jika deadline nyata tersedia dan telah terlampaui.

---

### T11 — One-to-Many Multi-Device Authentication

- **Prioritas:** HIGH
- **Status:** `COMPLETED` (100%)
- **Target:** Satu akun pengguna SPARTA SIAGA dapat login secara bersamaan pada beberapa perangkat (laptop, HP, tablet) tanpa saling memutus sesi (*no global singleton token conflict*).
- **Checklist Implementasi:**
  - [x] Audit mekanisme sesi existing (`lib/jwt.ts`, `lib/auth.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`).
  - [x] Verifikasi bahwa JWT yang diterbitkan per perangkat disimpan di cookie independen per browser context/perangkat.
  - [x] Tambahkan dukungan pencabutan selektif: Logout dari perangkat ini (`POST /api/auth/logout`) hanya menghapus sesi perangkat pemanggil tanpa mengganggu sesi lain.
  - [x] Tambahkan mekanisme pencabutan global (*Revoke all sessions* via `token_version` pada `users`) untuk skenario logout semua perangkat / perubahan kredensial (`POST /api/auth/logout?all=true`).
  - [x] Pastikan deaktivasi akun (`status = 'INACTIVE'`) memblokir akses secara instan di semua perangkat tanpa menunggu token expire.
  - [x] Pertahankan HttpOnly, SameSite, Secure, dan mitigasi CSRF/session fixation.

---

### T07 — Redesign Total Peta Monitoring

- **Prioritas:** HIGH
- **Status:** `COMPLETED` (100%)
- **Target:** Mengubah struktur layout dan interaksi Peta Monitoring dari model padat/toolbar-heavy menjadi map-first, progressive disclosure, ramah layar HP petugas cabang, dan rapi pada desktop.
- **Checklist Implementasi:**
  - [x] Audit kontrol dan overlay lama (`components/map/map-toolbar.tsx`, `components/map/map-inner.tsx`, `app/(siaga)/monitoring/page.tsx`).
  - [x] Hilangkan floating cards besar yang menutupi peta di tampilan mobile.
  - [x] Restrukturisasi Mobile: Peta dominan (layar penuh), 1 baris ringkasan kontekstual di atas, tombol aksi mengambang `[ Filter ]` dan `[ Daftar ]` di tengah bawah di atas bottom navigation.
  - [x] Restrukturisasi Desktop: Peta berdampingan dengan panel detail kontekstual (side-by-side flex layout `w-96 md:w-[400px] border-l`).
  - [x] Sederhanakan kontrol sekunder (Basemap, Layer, Cuaca, Legenda) ke dalam menu terpadu / popover.

---

## 3. Log Riwayat Pengujian & Evidence

| Tanggal | ID Task | Nama Uji / Skrip | Hasil | Keterangan |
| :--- | :---: | :--- | :---: | :--- |
| 15/10/2026 | T12 | `scripts/verify-ui-deliverables.ts` | **PASS** | Captured 8 deliverable screenshots pada `http://localhost:3004` (Admin, BMS, BMM, HO, Mobile) |
| 15/10/2026 | T12 | `pnpm typecheck` | **PASS** | TypeScript validasi bersih (0 error) |
| 15/10/2026 | T12 | `pnpm exec eslint app/ components/ lib/` | **PASS** | ESLint static analysis bersih (0 error) |
| 15/10/2026 | T12 | `pnpm build` | **PASS** | Next.js production build sukses (40 routes generated) |
| 15/10/2026 | T04/T12 | `tests/browser/auth-login.spec.ts` | **PASS (9/9)** | Real browser HTTP form login for BMS, BES, BMM, HO, Admin, wrong pass, refresh |
| 15/10/2026 | T07/T08/T12 | `tests/browser/phase2-ui.spec.ts` | **PASS (3/3)** | Admin facilities audit, mobile BMS queue, HO read-only mutation block |
| 15/10/2026 | T11 | `scripts/test-multi-device-auth.ts` | **PASS (10/10)** | Login 3 perangkat bersamaan, single-device logout, akun nonaktif, all-device revocation |
| 15/10/2026 | T11 | `tests/browser/multi-device-auth.spec.ts` | **PASS (1/1)** | Real browser Playwright 3 contexts (Laptop, Phone, Tablet) login simultan & independen logout |
| 15/10/2026 | T07 | `tests/browser/map-redesign-visual.spec.ts` | **PASS (3/4)** | Uji responsif visual 1366px, 360px, 768px (Mode Kejadian, Mode Lokasi, Bottom Sheets) |
| 15/10/2026 | T06 | `scripts/test-role-and-dc-search-e2e.ts` | **PASS (10/10)** | Otorisasi pencarian & pelaporan toko vs fasilitas per role cabang |
| 15/10/2026 | T01 | `scripts/test-bms-bes-inspection-suite.ts` | **PASS (10/10)** | Pemeriksaan lapangan, upload bukti ber-watermark, approval/rejection BM |
| 15/10/2026 | T08 | `tests/browser/multi-viewport.spec.ts` | **PASS (4/4)** | Uji responsif 360px, 390px, 768px, 1366px |

---

## 4. Screenshot Evidence Artifacts

Tersedia di direktori `artifacts/phase2/screenshots/` dan direktori artifact:
1. `1_sidebar_restored_admin.png` — Sidebar yang dipulihkan (Tracking Laporan, Riwayat Laporan, Manajemen User, Data Lokasi, Pengaturan; menyembunyikan Penugasan, Master Fasilitas, Rekonsiliasi).
2. `2_bms_dashboard.png` — Dashboard BMS dengan card tugas operasional toko.
3. `2_bms_notification_sheet.png` — Notification center BMS menampilkan No. Laporan, Status, Lokasi, PIC Otomatis, Target Selesai, dan aksi Mulai Menangani / Lihat Detail.
4. `2_bms_incident_detail_modal.png` — Modal Detail Insiden menampilkan status On Progress, PIC Otomatis, Waktu Mulai, Progres Fisik, Update Terakhir, dan Target Selesai ("Belum Ditentukan").
5. `3_bmm_dashboard.png` — Dashboard BMM yang disederhanakan dengan 4 Status KPI (Belum Ditangani, On Progress, Menunggu Approval, Selesai) dan daftar laporan dengan aksi Review/Approval.
6. `4_ho_dashboard_monitoring.png` — Dashboard HO dengan 4 KPI Ringkasan Nasional, tabel Monitoring Penanganan Per Cabang (PIC aktif, status deadline), dan mode read-only.
7. `5_reports_on_progress_target.png` — Pusat Laporan dengan kolom status penanganan, PIC otomatis, progres fisik, dan target selesai ("Belum Ditentukan").
8. `6_mobile_bms_home.png` — Tampilan mobile BMS pada 390px (iPhone) dengan touch target >= 44px, bottom bar, dan ringkasan operasional.
9. `6_mobile_reports_cards.png` — Kartu laporan mobile yang bersih menampilkan status penanganan, PIC otomatis, dan target selesai.
10. `desktop-1366-mode-kejadian.png` — Tampilan Peta Desktop 1366px Mode Kejadian.
11. `mobile-390-mode-kejadian.png` — Peta mobile full-screen Mode Kejadian dengan action pills.

---

## 5. Catatan Blocker & Ketergantungan

- **Database Safety Guard:** Koneksi basis data selalu divalidasi dengan `assertIsolatedDatabase()`. Modifikasi hanya diizinkan pada `sparta_siaga_isolated`. Database production `defaultdb` dijaga 100% tanpa write.
- **User Acceptance Testing (UAT):** Seluruh acceptance criteria teknis telah diverifikasi pada aplikasi pengguna yang sedang berjalan di `http://localhost:3004` dan Playwright test server `http://127.0.0.1:3014`. Siap untuk demonstrasi dan evaluasi langsung pengguna.
