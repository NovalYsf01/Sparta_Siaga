# PRD & DDD Lengkap: Modul Pelaporan Bencana & Manajemen Insiden Terpadu

Dokumen ini merupakan *Product Requirements Document* (PRD) dan *Detailed Design Document* (DDD) komprehensif untuk Sistem Pelaporan Darurat SPARTA Siaga. Dokumen ini menjadi *Source of Truth* (sumber acuan utama) untuk fase pengembangan (coding).

---

## 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1.1. Latar Belakang & Masalah
Saat ini, pelaporan insiden darurat di cabang (toko/gudang) dilakukan secara manual via grup WhatsApp.
**Pain Points (Titik Masalah):**
1. **Tidak Terstruktur:** Setiap orang melaporkan dengan format berbeda, menyulitkan rekap data.
2. **Tertimbun Chat:** Laporan penting sering tenggelam oleh obrolan lain di grup WA.
3. **Rawan Kesalahan Manusia:** Keharusan mengetik NIK, Kode Toko, dan Jabatan saat panik memicu salah ketik (*typo*).
4. **Terpecah-pecah:** Update lanjutan dari sebuah kejadian yang sama sering terpencar dalam berbagai pesan yang terpisah jam/hari.

### 1.2. Solusi & Visi Produk
Membangun antarmuka pelaporan (*Fast-Entry Form*) terintegrasi yang:
- Mengotomatisasi penarikan identitas pelapor (Auto-Identity).
- Mewajibkan pengisian data terstruktur via *Smart Templates*.
- Menjadikan foto sebagai bukti wajib/pendukung utama.
- Menyediakan wadah *Timeline* untuk merekam *update* lanjutan dalam 1 tiket yang sama.

### 1.3. Kebutuhan Pengguna (User Stories Lengkap)

#### A. Aktor: Store Manager (Tim Lapangan)
1. **[Otomatisasi]** Sebagai Store Manager, saya ingin form laporan tidak lagi menanyakan NIK, Nama, dan Lokasi Toko saya, melainkan mendeteksinya dari akun login saya agar proses lapor lebih cepat (di bawah 1 menit).
2. **[Panduan]** Sebagai Store Manager, saya ingin mendapatkan *template* isian yang berubah sesuai jenis bencana yang saya pilih (Gempa vs Kebakaran vs Kemalingan), agar saya tahu persis informasi apa yang dibutuhkan pusat.
3. **[Bukti]** Sebagai Store Manager, saya ingin bisa mengunggah hingga 4 foto dari kamera HP saya untuk memperlihatkan kondisi terkini kerusakan.
4. **[Follow-up]** Sebagai Store Manager, saya ingin bisa menambahkan "Update Kronologi" ke laporan yang sudah saya buat (misal: "Api sudah padam") tanpa harus membuat tiket laporan baru.

#### B. Aktor: Fungsional Head Office (Tim Pusat)
5. **[Monitoring]** Sebagai Fungsional HO, saya ingin melihat ringkasan seluruh kejadian di semua cabang melalui sebuah *Dashboard Table* dan *Map* secara *Real-Time*.
6. **[Audit]** Sebagai Fungsional HO, saya ingin bisa membuka sebuah insiden dan membaca seluruh kronologi waktu (Timeline) kejadian dari awal hingga akhir lengkap dengan fotonya.

### 1.4. Template Keterangan Pintar (Smart Templates)
Sistem harus menyediakan draf teks otomatis berikut ke dalam kotak keterangan (Notes):

**A. Kategori "Kebakaran"**
```text
- Sumber/Titik Api: [isi disini]
- Area Terdampak: [isi disini]
- Status Saat Ini: [contoh: masih terbakar/proses pemadaman/sudah padam]
- Tindakan Darurat: [isi disini]
- Kondisi Panel/Genset: [isi disini]
```

**B. Kategori "Kebobolan / Pencurian"**
```text
- Kronologis Diketahui: [isi disini]
- Titik Akses Masuk Pelaku: [contoh: plafon jebol / gembok rusak]
- Kondisi CCTV: [contoh: mati / dirusak / hidup]
- Kerugian Barang (Estimasi): [isi disini]
- Kerugian Fisik Bangunan: [isi disini]
```

**C. Kategori "Bencana Alam (Gempa/Banjir)"**
```text
- Skala/Ketinggian Air: [isi disini]
- Kondisi Struktur Bangunan: [isi disini]
- Keselamatan Karyawan/Pengunjung: [isi disini]
- Kondisi Barang Dagangan: [isi disini]
```

---

## 2. DETAILED DESIGN DOCUMENT (DDD)

### 2.1. Skema Database (PostgreSQL)

Tabel `incidents` akan dipertahankan dan dimaksimalkan penggunaannya.

| Nama Kolom | Tipe Data | Keterangan Tambahan (Perubahan) |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `store_id` | `VARCHAR` | Foreign Key ke Toko (Diisi otomatis via Clerk Metadata) |
| `type` | `VARCHAR` | Enum: 'fire', 'theft', 'earthquake', 'flood', dll |
| `status` | `VARCHAR` | 'active', 'resolved', 'investigating' |
| `notes` | `TEXT` | Akan menyimpan intisari template. (Bisa digabung dengan timeline 0) |
| `timeline` | `JSONB` | **(CRITICAL)** Array of objects untuk *thread* kronologi. |
| `created_at` | `TIMESTAMP` | Waktu insiden awal dilaporkan. |
| `updated_at` | `TIMESTAMP` | Waktu update timeline terakhir. |

#### Struktur JSONB `timeline`:
Kolom ini adalah nyawa dari fitur "Thread Update".
```json
[
  {
    "id": "t-1704060000",
    "timestamp": "2026-09-29T10:00:00Z",
    "actor_id": "user_2a...",
    "actor_name": "Budi (SM)",
    "role": "store_manager",
    "message": "- Sumber/Titik Api: Gudang A15...",
    "photos": ["https://utfs.io/f/xyz123.jpg"]
  },
  {
    "id": "t-1704063600",
    "timestamp": "2026-09-29T11:00:00Z",
    "actor_id": "user_2a...",
    "actor_name": "Budi (SM)",
    "role": "store_manager",
    "message": "Update: Damkar sudah tiba, api mulai dipadamkan.",
    "photos": ["https://utfs.io/f/abc456.jpg"]
  }
]
```

### 2.2. Arsitektur Komponen UI (Next.js & shadcn)

#### A. Komponen: `ManualIncidentModal.tsx`
* **Tujuan:** Form input laporan darurat.
* **State Management:**
  * `disasterType` (Select Dropdown)
  * `notes` (Textarea, di-trigger pengisiannya otomatis oleh `disasterType` menggunakan useEffect).
  * `photos` (Array of Strings dari UploadThing callback).
* **Behavior:**
  * Cek `user.publicMetadata.role`. Jika `store_manager`, jangan tampilkan opsi pilih toko (Hidden Input `storeId = user.publicMetadata.storeId`).
* **Error Handling:** 
  * Jika tombol submit ditekan tapi `notes` hanya berisi template kosong (user tidak mengisi titik-titik), tolak dengan toast alert: *"Harap lengkapi detail keterangan"*.

#### B. Komponen: `IncidentDetailModal.tsx`
* **Tujuan:** Penampil Laporan & Antarmuka Update Timeline.
* **Layout Structure:**
  * **Header:** Title (INC-XXXX), Status Badge, Store Name.
  * **Body (Kiri):** Map Marker statis lokasi toko.
  * **Body (Kanan - Scrollable):** `TimelineFeed` component. Melakukan `.map()` pada data JSONB `timeline`.
* **Sub-Komponen: `TimelineForm`**
  * Terletak di paling bawah feed. Terdiri dari `Textarea` dan `UploadButton`.
  * Saat disubmit, memanggil `PATCH /api/incidents/[id]/timeline`.

### 2.3. Infrastruktur & Endpoint API

#### A. Penyimpanan File (Cloud Storage)
* **Provider:** **UploadThing** (Terintegrasi *native* dengan Next.js App Router).
* **Config:** `app/api/uploadthing/core.ts` akan membatasi:
  * Tipe: File Gambar (`image/jpeg`, `image/png`).
  * Ukuran Maksimal: `4MB` per file.
  * Batch Maksimal: 4 file per upload.

#### B. API Endpoint: `POST /api/incidents`
* **Fungsi:** Membuat tiket awal.
* **Proses:** 
  1. Validasi Autentikasi (Clerk `auth()`).
  2. Susun object `timeline` pertama menggunakan `notes` dan `photos` yang dilempar dari Frontend.
  3. Eksekusi `INSERT INTO incidents ...`.

#### C. API Endpoint: `PATCH /api/incidents/[id]/timeline`
* **Fungsi:** Menambahkan komentar/update kronologi.
* **Proses:**
  1. Frontend melempar payload `{ message: string, photos: string[] }`.
  2. Backend menyusun objek JSON baru: `{ id, timestamp, actor, message, photos }`.
  3. Query Postgres via pg library: 
     `UPDATE incidents SET timeline = timeline || $1::jsonb, updated_at = NOW() WHERE id = $2`

### 2.4. Matriks Akses (Role-Based Access Control)
| Fitur / Aksi | Store Manager (Cabang) | Fungsional HO (Pusat) |
| :--- | :--- | :--- |
| **Buat Laporan Baru** | ✅ (Hanya untuk tokonya sendiri) | ✅ (Bisa pilih toko mana saja) |
| **Lihat Detail (Semua Laporan)** | ❌ (Hanya laporan miliknya) | ✅ (Semua cabang) |
| **Tambah Update / Kronologi** | ✅ (Untuk laporan miliknya) | ✅ (Untuk merespons SM) |
| **Ubah Status Laporan (Resolved)**| ❌ | ✅ |
| **Hapus Laporan (Delete)** | ❌ | ✅ |

---
**Status Dokumen:** Siap untuk Eksekusi (Ready for Development)
