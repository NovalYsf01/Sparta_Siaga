# SPARTA SIAGA — PANDUAN SIMULASI ATASAN & PENGUJIAN UAT

Dokumen ini memuat panduan langkah demi langkah bagi Manajemen dan Penguji untuk memvalidasi alur bisnis SPARTA SIAGA sesuai flowchart kanonikal 7 halaman.

---

## 🔑 Akun UAT Persona Pengujian

Seluruh akun di bawah ini telah diaktifkan dan siap digunakan dengan kata sandi: **`pass123`** (khusus System Admin gunakan password tersimpan atau login via impersonasi/sesi).

| No | Peran / Jabatan | Username / NIK / Email | Cabang | Fungsi Utama dalam Simulasi |
|---|---|---|---|---|
| 1 | **System Admin** | `usr_seed_admin` / `admin@sparta-siaga.local` | HO (Nasional) | Monitoring penuh, bypass pengujian lintas cabang, kelola user |
| 2 | **GM HO** | `USR-DEMO-GM` / `gm.ho@sparta-siaga.local` | HO (Nasional) | Monitoring nasional eksekutif, penerbit Instruksi Manajemen |
| 3 | **HO Admin** | `USR-HO-BUDI` / `ho.admin@sparta-siaga.local` | HO (Nasional) | Monitoring nasional read-only laporan seluruh cabang |
| 4 | **BnM Manajer** | `USR-BM-G001` / `bm.bandung@sparta-siaga.local` | BANDUNG | Persetujuan awal kerusakan & Case Close penutupan tiket |
| 5 | **BMC (Koordinator)** | `USR-DEMO-BMC` / `bmc.bandung@sparta-siaga.local` | BANDUNG | Review & verifikasi Serah Terima fisik gerai Toko |
| 6 | **BMS (PIC Toko)** | `USR-BMS-001` / `bms.bandung@sparta-siaga.local` | BANDUNG | Pemeriksaan lapangan toko, upload 5 milestone & Serah Terima |
| 7 | **BEC (Koordinator)** | `USR-DEMO-BEC` / `bec.bandung@sparta-siaga.local` | BANDUNG | Review & verifikasi Serah Terima fasilitas Gudang / DC |
| 8 | **BES (PIC DC)** | `USR-DEMO-BES` / `bes.bandung@sparta-siaga.local` | BANDUNG | Pemeriksaan lapangan DC, upload 5 milestone & Serah Terima DC |
| 9 | **BBC (Koordinator)** | `USR-DEMO-BBC` / `bbc.bandung@sparta-siaga.local` | BANDUNG | Review & verifikasi Serah Terima fisik Gedung Kantor Cabang |
| 10 | **BBS (PIC Gedung)** | `USR-DEMO-BBS` / `bbs.bandung@sparta-siaga.local` | BANDUNG | PIC fisik pemeliharaan gedung kantor cabang |

---

## 🏪 Skenario Simulasi 1: Penanganan Bencana Gerai Toko (End-to-End)

**Data Insiden:** `INC-UAT1-TOKO-001`  
**Lokasi:** Toko CICAHEUM (SAT-B081), Cabang BANDUNG  
**Bencana:** Banjir & Hujan Lebat (Plafon Gypsum Ambrol di Area Kasir)

### Langkah Demi Langkah:
1. **Langkah 1: Pemeriksaan Lapangan oleh BMS (`USR-BMS-001`)**
   - Login sebagai `USR-BMS-001` (`pass123`).
   - Buka menu **Laporan Kejadian** (`/reports`), klik tombol **Aksi / Periksa Lapangan** pada tiket `INC-UAT1-TOKO-001`.
   - Perhatikan form yang telah disederhanakan:
     - Identitas Toko & Laporan terisi otomatis.
     - Pilih **Ada Kerusakan**.
     - Ambil foto dari kamera atau pilih file foto bukti kerusakan dari galeri (min. 1 foto).
     - Isi keterangan singkat: *"Plafon gypsum kasir ambrol sepanjang 3 meter, butuh perbaikan segera."*
     - Klik **Kirim Hasil Pemeriksaan**. Status berpindah ke `pending_bm_approval`.

2. **Langkah 2: Keputusan BnM Manajer (`USR-BM-G001`)**
   - Login sebagai `USR-BM-G001` (`pass123`).
   - Masuk ke menu **Laporan Kejadian**, klik kartu tiket `INC-UAT1-TOKO-001`.
   - Tinjau rangkuman pemeriksaan lapangan dan foto bukti.
   - Klik **Setujui Penanganan** (status beralih ke `confirmed_affected`, pekerjaan pemeliharaan dimulai).

3. **Langkah 3: Pelaksanaan & Upload 5 Milestone Dokumen oleh BMS (`USR-BMS-001`)**
   - Login kembali sebagai BMS (`USR-BMS-001`).
   - Buka **Laporan Kejadian** -> Tab **Tracking Pekerjaan Fisik**:
     - **Milestone 10% (Ceklis Kerusakan):** Unggah dokumen ceklis fisik. Progres: 10%.
     - **Milestone 25% (Estimasi Biaya):** Unggah berkas PDF estimasi biaya. Progres: 25%.
     - **Milestone 30% (Approve Proxy):** Unggah bukti persetujuan estimasi. Progres: 30%.
     - **Milestone 50% (SPK):** Unggah Surat Perintah Kerja teknisi. Progres: 50%.
     - **Milestone 100% (Serah Terima):** Unggah Berita Acara Serah Terima pekerjaan fisik. Progres: 100%.

4. **Langkah 4: Pengajuan Serah Terima oleh BMS (`USR-BMS-001`)**
   - Pada kartu **Alur Persetujuan Penyelesaian**, klik **Ajukan Penyelesaian Fisik ke Koordinator (BMC)**.
   - Status beralih ke `WAITING_COORDINATOR_APPROVAL`.

5. **Langkah 5: Verifikasi & Persetujuan Koordinator BMC (`USR-DEMO-BMC`)**
   - Login sebagai BMC (`USR-DEMO-BMC`).
   - Buka laporan `INC-UAT1-TOKO-001`.
   - Klik **Setujui Penyelesaian Fisik**. Status beralih ke `WAITING_MANAGER_APPROVAL`.

6. **Langkah 6: Persetujuan Akhir & Case Close oleh BnM Manajer (`USR-BM-G001`)**
   - Login sebagai BnM Manajer (`USR-BM-G001`).
   - Buka laporan `INC-UAT1-TOKO-001`.
   - Klik tombol **Setujui Final & Tutup Laporan (Case Close)**.
   - Tiket berhasil ditutup secara resmi dengan status `closed` (100% selesai).

---

## 🏭 Skenario Simulasi 2: Fasilitas DC & Deteksi Gempa Otomatis Aman

Skenario ini membuktikan 2 alur bisnis sekaligus:
1. **Insiden Fasilitas DC:** Jalur `BES -> BEC -> BnM Manajer`.
2. **Peringatan Gempa Otomatis:** Konfirmasi **Kondisi Aman / Tanpa Kerusakan** yang langsung menutup tiket tanpa memerlukan pekerjaan lanjutan.

### Bagian A: Peringatan Gempa Otomatis Aman (`INC-UAT2-EQ-001`)
**Lokasi:** Toko BABAKAN SARI (SAT-B017), Cabang BANDUNG  
**Asal Laporan:** Otomatis BMKG (SPARTA SIAGA Sensor M 5.2)

1. **Langkah 1: Pemeriksaan Lapangan oleh BMS (`USR-BMS-001`)**
   - Login sebagai `USR-BMS-001`.
   - Buka tiket gempa `INC-UAT2-EQ-001`.
   - Klik **Periksa Lapangan**.
   - Pilih opsi **Tidak Ada Kerusakan** (Kondisi Aman).
   - Unggah foto kondisi toko yang rapi dan aman.
   - Tulis catatan: *"Seluruh struktur toko utuh, etalase kaca aman, operasional normal."*
   - Klik **Kirim Hasil Pemeriksaan**.

2. **Langkah 2: Konfirmasi Kondisi Aman oleh BnM Manajer (`USR-BM-G001`)**
   - Login sebagai BnM Manajer (`USR-BM-G001`).
   - Buka tiket `INC-UAT2-EQ-001`.
   - Perhatikan bahwa tombol **Tolak Laporan (Hoax)** dinonaktifkan/dilindungi secara sistem karena laporan berasal dari sensor otomatis BMKG.
   - Klik **Konfirmasi Kondisi Aman**.
   - Tiket langsung berpindah ke status `confirmed_safe` dan ditutup dengan aman tanpa membuka milestone perbaikan!

### Bagian B: Fasilitas DC Bandung (`INC-UAT2-DC-001`)
**Lokasi:** DC BANDUNG (BZ01)  
**Kerusakan:** Rel Rolling Door Loading Dock Macet Akibat Badai

1. **BES (`USR-DEMO-BES`)** memeriksa lapangan DC, mengunggah foto, dan melaporkan kerusakan rel rolling dock.
2. **BnM Manajer (`USR-BM-G001`)** menyetujui penanganan DC (`confirmed_affected`).
3. **BES (`USR-DEMO-BES`)** mengunggah 5 dokumen milestone DC dan mengajukan Serah Terima.
4. **BEC Koordinator (`USR-DEMO-BEC`)** mereview dan menyetujui pekerjaan rolling dock DC.
5. **BnM Manajer (`USR-BM-G001`)** menutup tiket DC secara resmi (Case Close).

---

## 🛡️ Catatan Keamanan & Batasan Operasional
1. **Detail Laporan 100% Read-Only:** Di dalam modal Detail Laporan tidak ada tombol ubah target tanggal, tombol input pemeriksaan, maupun submodal mutasi lainnya. Tombol navigasi peta dan unduh PDF laporan berfungsi penuh.
2. **Isolasi Cabang:** Akun cabang Bandung tidak dapat mengutak-atik laporan cabang lain.
3. **Monitoring HO:** Akun HO Admin dan GM HO memiliki hak baca nasional, namun tidak dapat melakukan manipulasi langsung terhadap laporan lokal cabang.
