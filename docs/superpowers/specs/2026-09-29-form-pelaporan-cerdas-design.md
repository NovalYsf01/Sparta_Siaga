# Spesifikasi Desain: Form Pelaporan Darurat Cerdas & Sistem Timeline

## 1. Pendahuluan
Dokumen ini mendefinisikan desain teknis untuk perombakan sistem pelaporan darurat di SPARTA Siaga. Berdasarkan diskusi dengan mentor dan analisis alur grup WhatsApp, sistem harus beralih dari form statis menjadi sistem pelaporan dinamis (Smart Templates) berbasis Timeline (Thread-based updates) dengan identitas otomatis (Auto-Magic Identity).

## 2. Arsitektur Komponen (UI)

### 2.1. `ManualIncidentModal.tsx` (Form Pembuatan Laporan)
- **Auto-Identity:** Dropdown pemilihan "Toko" akan dikunci/disembunyikan untuk akun ber-role `store_manager`. Sistem akan menyuntikkan `storeId` secara otomatis dari metadata Clerk. (Hanya `ho_admin` yang bisa melihat dropdown toko).
- **Smart Template Engine:** Sebuah fungsi `getTemplateForDisaster(type)` akan dijalankan saat `disasterType` berubah. Fungsi ini mengembalikan string berformat Markdown/Text yang di-inject ke dalam state `notes`.
  - *Contoh Kemalingan:* Kronologi, Status CCTV, Kerugian Sementara.
  - *Contoh Kebakaran:* Titik Api, Kondisi Area, Status Damkar.
- **Attachment:** Tambahan tombol `<input type="file" multiple accept="image/*">` untuk menerima bukti foto (maksimal 4 foto per laporan). 

### 2.2. `IncidentDetailModal.tsx` (Tampilan Thread/Timeline)
- **Layout Baru:** Membagi modal menjadi dua kolom utama (jika layar besar) atau bersusun vertikal (mobile).
  - *Bagian Atas/Kiri:* Informasi statis (Nama Toko, Jenis Bencana, Foto Bukti Awal).
  - *Bagian Bawah/Kanan:* **Timeline Activity Feed** (mirip UI Twitter/Jira).
- **Update Form:** Form kecil di bagian bawah timeline dengan input textarea "Tambah Update/Kronologi..." dan tombol "Kirim Update".

## 3. Desain Database & API

Karena kita sudah menggunakan PostgreSQL, skema yang ada tidak perlu dirombak total, cukup dimaksimalkan:

### 3.1. Struktur Data `timeline` (JSONB)
Kolom `timeline` yang sudah ada di tabel `incidents` akan diformat ulang menjadi array of objects:
```json
[
  {
    "id": "t-123",
    "timestamp": "2026-09-28T17:00:00Z",
    "actor": "SM Toko Cibubur",
    "message": "Masih ada kepulan asap tebal di sisi belakang",
    "photos": ["url_foto_1.jpg"]
  }
]
```

### 3.2. Penyesuaian Endpoint API
- `POST /api/incidents`: 
  - Diubah agar entri `notes` dari form pembukaan langsung didaftarkan sebagai indeks `[0]` di dalam array `timeline` dengan status "Laporan Dibuat".
- `PATCH /api/incidents/[id]/timeline`: (Endpoint Baru)
  - Khusus untuk melakukan push object baru ke dalam array `timeline` (menambahkan kronologi baru) tanpa mengubah status utama laporan.

## 4. Keamanan & Validasi
- **Validasi Role:** Di backend (API), verifikasi token Clerk untuk memastikan NIK/Toko yang dikirim sesuai dengan *claim* JWT-nya, mencegah eksploitasi API POST.
- **Validasi Input:** Keterangan (Notes) wajib diisi (minimal 20 karakter agar user tidak sekadar mengirim spasi).

## 5. Scope Implementasi (Batasan)
- Untuk iterasi pertama, *Upload Foto* akan diimplementasikan sebagai UI (Mock) atau disimpan dalam base64 di memori sementara, hingga infrastruktur Cloud Storage (seperti AWS S3 atau UploadThing) disetujui untuk diintegrasikan.
