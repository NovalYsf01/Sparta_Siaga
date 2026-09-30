# FITUR INOVASI & PENGEMBANGAN LANJUTAN: SPARTA SIAGA

Dokumen ini memuat detail spesifikasi fungsional, alur teknis, dan rancangan antarmuka (UI/UX) untuk fitur-fitur inovasi operasional pada **SPARTA SIAGA (Disaster & Branch Maps Monitoring System)**.

---

## 📑 DAFTAR ISI
1. [Prioritas Utama: Quick SitRep ke WhatsApp & Ringkasan Cepat](#1-prioritas-utama-quick-sitrep-ke-whatsapp--ringkasan-cepat)
2. [Prioritas Utama: Filter Radius Kustom Dinamis](#2-prioritas-utama-filter-radius-kustom-dinamis)
3. [Pengembangan Lanjutan: Mode TV Command Center (War Room Mode)](#3-pengembangan-lanjutan-mode-tv-command-center-war-room-mode)
4. [Pengembangan Lanjutan: Layer Radar Cuaca & Curah Hujan Interaktif](#4-pengembangan-lanjutan-layer-radar-cuaca--curah-hujan-interaktif)
5. [Pengembangan Lanjutan: Pembedaan Aset DC (Distribution Center) vs Toko](#5-pengembangan-lanjutan-pembedaan-aset-dc-distribution-center-vs-toko)

---

## 1. Prioritas Utama: Quick SitRep ke WhatsApp & Ringkasan Cepat

### 1.1 Latar Belakang & Masalah
Saat bencana terjadi (misal: gempa bumi M 5.5+ atau banjir besar), pimpinan operasional (Direksi, GM Operation, Branch Manager) membutuhkan laporan cepat (*Situation Report / SitRep*) dalam hitungan menit untuk koordinasi di grup WhatsApp tanggap darurat. Mengetik daftar toko terdampak satu per satu memakan waktu berharga dan rentan salah ketik.

### 1.2 Rancangan Solusi
Menyediakan tombol **"Salin SitRep WhatsApp"** dan **"Unduh Tangkapan Peta (PNG)"** langsung di panel ringkasan bencana.

### 1.3 Alur Kerja & Mekanisme Teknis
1. Pengguna membuka detail bencana tertentu pada peta.
2. Sistem otomatis mengumpulkan seluruh toko yang berada di dalam radius bahaya terpilih.
3. Tombol **"Salin SitRep"** akan memformat data menjadi string teks terstruktur dengan emoji dan tag resmi.
4. Teks otomatis disalin ke clipboard dan dapat langsung di-paste ke WhatsApp Web atau aplikasi mobile.
5. Tombol **"Kirim ke WhatsApp"** (`https://wa.me/?text=...`) membuka WhatsApp dengan draf pesan yang sudah terisi otomatis.

### 1.4 Format Teks SitRep WhatsApp
```text
🚨 *[SITREP DARURAT - SPARTA SIAGA]*
Laporan Situasi Bencana & Dampak Jaringan Toko

📅 *Waktu Kejadian:* 23 September 2026, 16:42:15 WIB
📍 *Lokasi Bencana:* 12 km Barat Daya Kab. Cianjur - Jawa Barat
⚡ *Magnitudo:* 5.8 SR | *Kedalaman:* 10 km (Gempa Dangkal)
🌊 *Potensi Tsunami:* TIDAK BERPOTENSI
🎯 *Ambang Radius Pantau:* 50 km

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *RINGKASAN DAMPAK JARINGAN TOKO:*
• Total Toko di Radius Bahaya: *6 Toko*
• Cabang Terkait: *Cabang Cianjur & Bandung Barat*

🏢 *DAFTAR TOKO DALAM RADIUS:*
1. *[SAT012] Alfamart Raya Cianjur*
   - Jarak ke Episentrum: *14.2 km*
   - Alamat: Jl. Raya Sukabumi No. 45
   - PIC Toko: Budi Santoso (0812-3456-7890)
   - Status Terkini: Menunggu Verifikasi

2. *[SAT088] Alfamart Ciranjang Pasar*
   - Jarak ke Episentrum: *21.5 km*
   - Alamat: Jl. Pasar Ciranjang No. 12
   - PIC Toko: Hendra (0813-9876-5432)
   - Status Terkini: Menunggu Verifikasi

3. *[SAT104] Alfamart Cibeber Permai*
   - Jarak ke Episentrum: *27.8 km*
   - Alamat: Jl. Raya Cibeber KM 5
   - PIC Toko: Ahmad Fauzi (0856-1122-3344)
   - Status Terkini: Menunggu Verifikasi

━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ *Instruksi Tindak Lanjut:*
Area Coordinator (AC) & Area Manager (AM) terkait diinstruksikan segera mengecek kondisi fisik bangunan, kelistrikan PLN/Genset, dan keselamatan personil toko.

_Generated automatically by SPARTA SIAGA - Real-Time Store Disaster Monitoring_
```

### 1.5 Fitur Ekspor Gambar Peta (Map Snapshot)
- Menggunakan library `html-to-image` / Canvas snapshot.
- Mengambil tangkapan layar peta yang mencakup titik pusat gempa, lingkaran radius, dan seluruh pin toko di sekitarnya.
- Diberi watermark otomatis: Logo SPARTA SIAGA, tanggal/jam kejadian, dan parameter gempa.

---

## 2. Prioritas Utama: Filter Radius Kustom Dinamis

### 2.1 Latar Belakang & Masalah
Tingkat bahaya gempa bumi sangat bervariasi bergantung pada **magnitudo dan kedalaman hiposentrum**:
- Gempa dangkal (kedalaman < 15 km) bermagnitudo 5.0 dapat menimbulkan guncangan parah di radius 30 km.
- Gempa dalam (kedalaman > 150 km) bermagnitudo 6.0 sering kali hanya terasa getaran ringan dan tidak merusak bangunan.
Oleh karena itu, radius bahaya tidak boleh kaku pada 1 angka tetap saja.

### 2.2 Rancangan Solusi
Komponen **Interactive Radius Selector** pada panel bencana:
- **Preset Buttons:** `[ 25 km ]`, `[ 50 km ]`, `[ 100 km ]`, `[ 150 km ]`
- **Slider Interaktif:** Geser dari 5 km hingga 250 km.
- **Visualisasi Dinamis:** Lingkaran (*Circle Layer*) di atas peta otomatis membesar atau mengecil secara real-time saat slider digeser.

### 2.3 Perhitungan Real-Time & Feedback Visual
1. Saat radius diubah, fungsi *Haversine* langsung menghitung ulang daftar toko yang masuk ke dalam radius baru dalam hitungan milidetik.
2. Angka *badge* jumlah toko langsung ter-update (contoh: *"8 Toko Terancam"* berubah jadi *"19 Toko Terancam"*).
3. Toko yang baru masuk radius langsung menyala dengan animasi berkedip merah.

---

## 3. Pengembangan Lanjutan: Mode TV Command Center (War Room Mode)

### 3.1 Latar Belakang & Masalah
Dashboard pemantauan sering kali diproyeksikan pada layar TV monitor besar di ruang rapat darurat atau kantor operasional wilayah (*Command Center / War Room*). Dalam skenario ini, tidak ada pengguna yang aktif menggeser kursor mouse.

### 3.2 Fitur-Fitur Khusus Mode TV:
1. **Fullscreen Toggle (Mode Layar Penuh):**
   - Menghilangkan navigasi browser dan header yang tidak perlu, memaksimalkan area peta visual.
2. **Auto-Polling Background (Interval 2 - 3 Menit):**
   - Secara senyap memeriksa endpoint BMKG untuk gempa bumi atau peringatan baru tanpa perlu me-refresh halaman web secara manual.
3. **Audio Siren & Visual Strobe (Alarm Audio-Visual):**
   - **Kondisi:** Jika terdeteksi gempa bumi baru dengan M ≥ 5.0 atau gempa yang berjarak < 100 km dari salah satu cabang dalam 15 menit terakhir.
   - **Visual:** Header atas berkedip merah terang (*strobe effect*) dan modal darurat muncul di tengah layar: *"ALERT: GEMPA BARU M 6.1 - JAWA TIMUR"*.
   - **Audio:** Membunyikan suara *chime alert* darurat lembut namun tegas.
   - **Kontrol:** Terdapat switch mute/unmute audio dengan status volume yang jelas.
4. **Auto-Pan & Fit Bounds:**
   - Kamera peta secara otomatis melakukan transisi terbang (*fly-to*) dan memusatkan pandangan ke lokasi gempa terbaru beserta toko-toko terdekat.

---

## 4. Pengembangan Lanjutan: Layer Radar Cuaca & Curah Hujan Interaktif

### 4.1 Latar Belakang & Masalah
Banjir dan angin kencang sering kali bermula dari awan konvektif lebat (awan Cumulonimbus) yang bergerak melintasi wilayah pertokoan. Informasi teks *"Hujan Lebat"* tidak menunjukkan ke arah mana awan badai sedang bergerak.

### 4.2 Rancangan Solusi
Menyediakan layer tambahan bergaya **Windy / Weather Radar**:
1. **Integrasi Tile Layer Curah Hujan (RainViewer Open API / Open-Meteo):**
   - Menyediakan lapisan citra radar cuaca Doppler gratis di atas peta Leaflet.
   - Menampilkan gradasi warna:
     - 🟦 Biru Muda: Gerimis / Hujan Ringan
     - 🟩 Hijau: Hujan Sedang
     - 🟨 Kuning/Oranye: Hujan Lebat
     - 🟥 Merah/Ungu: Badai Petir Ekstrem & Awan Konvektif Berbahaya
2. **Animation Player (Time Slider):**
   - Kontrol pemutar waktu (*play/pause*) 2 jam ke belakang hingga proyeksi 30 menit ke depan untuk melihat pergerakan awan mendekati toko-toko Alfamart.
3. **Layer Opacity Slider:**
   - Pengguna dapat mengatur tingkat transparansi radar cuaca (misal 50%) agar jalan dan titik toko di bawahnya tetap terlihat jelas.

---

## 5. Pengembangan Lanjutan: Pembedaan Aset DC (Distribution Center) vs Toko

### 5.1 Latar Belakang & Masalah
Rantai pasok ritel sangat bertumpu pada **Distribution Center (DC / Gudang Cabang)**. Satu DC biasanya menyuplai antara 150 hingga 300 toko fisik di suatu wilayah.
- Jika satu toko terkena banjir, kerugian bersifat lokal.
- Namun jika sebuah **DC terdampak bencana** (misal: gudang tergenang, genset DC mati, atau akses truk logistik terputus), maka **seluruh jaringan ratusan toko di bawahnya akan lumpuh pasokannya** dalam 24–48 jam ke depan.

### 5.2 Rancangan Solusi
1. **Icon Khusus Gudang DC:**
   - Marker DC diberi ukuran lebih besar dengan icon **Gudang / Factory** berwarna emas/oranye tebal, kontras dibanding pin toko biasa.
2. **Supply Chain Blast Radius:**
   - Saat sebuah bencana mendekati lokasi DC (misal dalam radius 30 km dari DC Bandung):
     - Sistem memberi tanda status khusus: **"PERINGATAN KRISIS PASOKAN: DC BANDUNG BERPOTENSI TERDAMPAK"**.
     - Di peta muncul opsi: *"Sorot Seluruh Toko yang Disuplai oleh DC Ini"*.
     - Seketika seluruh 200+ toko binaan DC tersebut diberi highlight garis relasi halus (*spider connection*) untuk pemantauan mitigasi stok logistik darurat.
3. **Data Kolom Spreadsheet yang Dibutuhkan:**
   - Kolom `tipe_aset` (Nilai: `TOKO` atau `DC`).
   - Kolom `kode_dc_induk` pada setiap baris toko (untuk memetakan toko ini dipasok oleh gudang DC mana).

---

## 6. Rangkuman Matriks Implementasi

| Fitur | Tingkat Kesulitan | Kebutuhan Eksternal | Nilai Manfaat Operasional |
| :--- | :---: | :--- | :---: |
| **Quick SitRep WhatsApp** | Rendah | Tidak ada (Internal logic & template) | ⭐⭐⭐⭐⭐ (Sangat Tinggi) |
| **Filter Radius Kustom** | Rendah | Tidak ada (Perhitungan Haversine dinamis) | ⭐⭐⭐⭐⭐ (Sangat Tinggi) |
| **Mode TV Command Center** | Sedang | Audio asset MP3 bebas lisensi | ⭐⭐⭐⭐ (Tinggi) |
| **Pembedaan DC vs Toko** | Rendah - Sedang | Tambahan 1 kolom tipe di spreadsheet | ⭐⭐⭐⭐⭐ (Sangat Tinggi) |
| **Layer Radar Cuaca Animasi** | Sedang | RainViewer API / Open Weather Radar | ⭐⭐⭐⭐ (Tinggi) |
