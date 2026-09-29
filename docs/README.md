# SPARTA SIAGA - DOCUMENTATION REPOSITORY
**Pusat Dokumentasi Resmi, Blueprint, Proses Bisnis, QA, dan Log Perubahan**

Folder ini memuat seluruh dokumentasi terstruktur untuk modul **SPARTA Siaga** (`sparta-siaga`). Setiap dokumen dikelompokkan ke dalam kategori direktori masing-masing:

---

## Struktur Direktori Dokumentasi

```text
docs/
├── 01-prd-and-specs/
│   ├── PRD_SPARTA_MAPS_DISASTER_MONITORING.md   # PRD utama modul peta & monitoring bencana
│   └── SPARTA_SIAGA_EXPANSION_FEATURES.md       # Spesifikasi fitur lanjutan (Mode TV, slider, dll.)
│
├── 02-business-process/
│   └── BUSINESS_PROCESS_SPARTA_SIAGA.md         # Alur proses bisnis & logika sistem (Single Source of Truth)
│
├── 03-qa-and-testing/
│   └── QA_TEST_PLAN_SPARTA_SIAGA.md             # Matriks uji kualitas & tabel ceklis QA (100% Pass)
│
├── 04-progress-and-changelog/
│   └── PROGRESS_LOG_AND_CHANGELOG.md            # Log pengerjaan, riwayat perubahan, & isu teknis terkini
│
└── README.md                                    # Indeks panduan navigasi dokumentasi (File ini)
```

---

## Panduan Cepat Dokumen

| Kategori | File Dokumentasi | Deskripsi Singkat |
| :--- | :--- | :--- |
| **01. PRD & Spesifikasi** | [`PRD_SPARTA_MAPS_DISASTER_MONITORING.md`](01-prd-and-specs/PRD_SPARTA_MAPS_DISASTER_MONITORING.md) | Blueprint arsitektur, teknologi, format API BMKG/USGS, dan port modul. |
| **01. PRD & Spesifikasi** | [`SPARTA_SIAGA_EXPANSION_FEATURES.md`](01-prd-and-specs/SPARTA_SIAGA_EXPANSION_FEATURES.md) | Rancangan pengembangan lanjutan (Mode TV Command Center, slider radius). |
| **01. PRD & Spesifikasi** | [`PRODUCTION_AUTHORIZATION_INCIDENT_HANDLING_BLUEPRINT.md`](01-prd-and-specs/PRODUCTION_AUTHORIZATION_INCIDENT_HANDLING_BLUEPRINT.md) | Cetak biru otorisasi RBAC produksi: Validasi hak ceklis hanya untuk cabang terdampak dan HO Pusat. |
| **02. Proses Bisnis** | [`COMPLETE_BUSINESS_PROCESS_GUIDE_SPARTA_SIAGA.md`](02-business-process/COMPLETE_BUSINESS_PROCESS_GUIDE_SPARTA_SIAGA.md) | Panduan lengkap proses bisnis, perhitungan matematis gempa/hujan, dan alur SOP lapangan. |
| **03. QA & Pengujian** | [`QA_TEST_PLAN_SPARTA_SIAGA.md`](03-qa-and-testing/QA_TEST_PLAN_SPARTA_SIAGA.md) | 30 skenario kasus uji verifikasi sistem dan tabel status ceklis. |
| **04. Log & Changelog** | [`PROGRESS_LOG_AND_CHANGELOG.md`](04-progress-and-changelog/PROGRESS_LOG_AND_CHANGELOG.md) | Riwayat versi, analisis isu (watermark Carto & filter search), dan rencana perbaikan. |
