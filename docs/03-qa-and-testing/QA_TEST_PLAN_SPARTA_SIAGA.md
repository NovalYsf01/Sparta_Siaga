# QA TEST PLAN & VERIFICATION CHECKLIST: SPARTA SIAGA
**Dokumen Pengujian Kualitas, Integritas Data, dan Keandalan Sistem**

- **Modul:** SPARTA Siaga (`sparta-siaga`)
- **Fokus Sistem:** Disaster & Branch Interactive Map Monitoring System
- **Ecosystem:** SPARTA Portal (Monorepo Ecosystem)
- **Target Port Dev:** `http://localhost:3004`

---

## 1. Tabel Ceklis Pengujian (Master Verification Checklist)

> **Panduan:** Cukup centang `[x]` pada kolom **Ceklis** dan perbarui kolom **Hasil** saat pengujian selesai dilakukan. Detail langkah teknis pengujian dapat dilihat pada **Bagian 2 (Penjelasan & Panduan Teknis)** di bawah tabel ini.

| Ceklis | ID Kasus | Kategori | Poin Pengujian | Target / Ekspektasi Singkat | Hasil Akhir |
| :---: | :--- | :--- | :--- | :--- | :---: |
| [x] | **TC-DATA-01** | Data Toko | Parsing Spreadsheet | Membaca data toko lengkap (nama, cabang, koordinat, PIC) | **Pass** |
| [x] | **TC-DATA-02** | Data Toko | Validasi Koordinat Cacat | Baris tanpa koordinat / koordinat salah dilewati secara aman | **Pass** |
| [x] | **TC-DATA-03** | Data Toko | Server Cache (In-Memory) | Panggilan kedua instan (<10ms) tanpa reload spreadsheet | **Pass** |
| [x] | **TC-DATA-04** | Data Toko | Fallback Data Cadangan | Jika internet/sheets mati, sistem beralih ke file lokal | **Pass** |
| [x] | **TC-DIS-01** | Bencana | AutoGempa BMKG | Parsing gempa terkini, magnitudo, kedalaman, dan teks potensi | **Pass** |
| [x] | **TC-DIS-02** | Bencana | Feed USGS Real-Time | Parsing gempa global/regional dari feed GeoJSON 1-menit | **Pass** |
| [x] | **TC-DIS-03** | Bencana | Resiliensi API Down | Jika BMKG/USGS error, UI tidak crash dan tetap pakai cache | **Pass** |
| [x] | **TC-DIS-04** | Bencana | Alarm Peringatan Tsunami | Banner darurat merah muncul saat ada peringatan tsunami | **Pass** |
| [x] | **TC-SPAT-01** | Spasial | Akurasi Rumus Haversine | Deviasi perhitungan jarak spasial $\le 0.5\%$ | **Pass** |
| [x] | **TC-SPAT-02** | Spasial | Deteksi Zona Bahaya | Toko dalam radius $\le 100\text{ km}$ berstatus Merah Berdenyut | **Pass** |
| [x] | **TC-SPAT-03** | Spasial | Deteksi Zona Waspada | Toko dalam radius 101–200 km berstatus Kuning Siaga | **Pass** |
| [x] | **TC-SPAT-04** | Spasial | Slider Radius Dinamis | Geser slider, lingkaran membesar & daftar toko terupdate | **Pass** |
| [x] | **TC-SPAT-05** | Spasial | Urutan Prioritas Toko | Toko terdekat dari episentrum berada di urutan teratas | **Pass** |
| [x] | **TC-MAP-01** | Peta | Marker Khusus Alfamart | Custom icon toko Alfamart muncul dengan jelas di peta | **Pass** |
| [x] | **TC-MAP-02** | Peta | Smart Clustering (Zoom) | Ribuan toko mengelompok jadi bubble angka saat zoom out | **Pass** |
| [x] | **TC-MAP-03** | Peta | Priority Override Bahaya | Toko status bahaya tetap terlihat walau dalam mode zoom out | **Pass** |
| [x] | **TC-MAP-04** | Peta | Mode Fokus Krisis | Tombol toggle untuk sembunyikan semua toko yang aman | **Pass** |
| [x] | **TC-MAP-05** | Peta | Pencarian Cepat (Ctrl+K) | Ketik nama/kode toko, peta otomatis smooth fly-to ke lokasi | **Pass** |
| [x] | **TC-MAP-06** | Peta | Pergantian Tema Basemap | Peta berganti mulus antara CartoDB Positron & Dark Matter | **Pass** |
| [x] | **TC-WEA-01** | Cuaca | Drawer Informasi Toko | Klik toko memunculkan drawer info toko & tombol kontak PIC | **Pass** |
| [x] | **TC-WEA-02** | Cuaca | Prakiraan Cuaca 7 Hari | Menampilkan suhu, hujan, dan cuaca dari Open-Meteo | **Pass** |
| [x] | **TC-WEA-03** | Cuaca | Loading Skeleton | Tampil skeleton loader rapi saat data cuaca sedang dimuat | **Pass** |
| [x] | **TC-SSO-01** | Autentikasi | Launching dari Portal | Klik kartu Siaga di `login-sparta` mengarah ke modul | **Pass** |
| [x] | **TC-SSO-02** | Autentikasi | Pertukaran Token SSO | Token ditukar ke SPARTA API & menghasilkan session login | **Pass** |
| [x] | **TC-SSO-03** | Autentikasi | Token Expired Handling | Token usang (>2 menit) menampilkan pesan error ramah | **Pass** |
| [x] | **TC-SSO-04** | Autentikasi | Middleware Route Guard | Akses langsung tanpa login otomatis di-redirect ke portal | **Pass** |
| [x] | **TC-SSO-05** | Autentikasi | Logout Terpadu | Logout di Siaga membersihkan sesi & kembali ke portal | **Pass** |
| [x] | **TC-PERF-01** | Performa | Loading Awal Cepat | Tampilan peta siap interaksi dalam waktu **< 2 detik** | **Pass** |
| [x] | **TC-PERF-02** | Performa | Kelancaran Navigasi Peta | Pan & zoom peta dengan 1,000+ marker stabil di **$\ge 55$ FPS** | **Pass** |
| [x] | **TC-PERF-03** | Performa | Uji Kebocoran Memori | Buka-tutup popup 30x tidak membuat browser lemot / bocor | **Pass** |

---

## 2. Penjelasan & Panduan Teknis Pengujian (Langkah-Langkah Detail)

Berikut penjelasan detail langkah demi langkah untuk setiap poin kasus uji di atas:

### Kategori A: Master Data Toko & Ingestion
* **TC-DATA-01 (Parsing Spreadsheet):**
  * *Langkah:* Buka endpoint `GET /api/stores`.
  * *Verifikasi:* Response JSON harus berisi array objek dengan field: `kode_toko`, `nama_toko`, `cabang`, `latitude`, `longitude`, `pic_name`, `pic_phone`.
* **TC-DATA-02 (Validasi Koordinat Cacat):**
  * *Langkah:* Masukkan baris data toko uji coba tanpa nilai latitude/longitude, atau string non-angka.
  * *Verifikasi:* Baris tersebut tidak boleh membuat endpoint error 500. Sistem wajib menyaring (sanitize) data tersebut dan menulis peringatan di log server.
* **TC-DATA-03 (Server-side In-Memory Cache):**
  * *Langkah:* Request `/api/stores` pertama kali, lalu refresh request kedua kali dalam selang beberapa detik.
  * *Verifikasi:* Waktu respon kedua harus di bawah 10ms karena data diambil dari cache memori server, bukan request ulang ke spreadsheet.
* **TC-DATA-04 (Fallback Data Cadangan):**
  * *Langkah:* Simulasikan jaringan internet terputus atau URL spreadsheet diubah menjadi URL salah.
  * *Verifikasi:* Halaman peta tetap menampilkan data toko dari cadangan file `stores-fallback.json` lokal tanpa layar putih.

---

### Kategori B: Integrasi API Bencana Alam (BMKG & USGS)
* **TC-DIS-01 (AutoGempa BMKG):**
  * *Langkah:* Panggil endpoint `GET /api/disasters/earthquakes`.
  * *Verifikasi:* Data BMKG terurai rapi: nilai magnitudo, kedalaman, koordinat lintang/bujur, wilayah pusat gempa, dan status potensi tsunami.
* **TC-DIS-02 (Feed USGS Real-Time):**
  * *Langkah:* Periksa integrasi data feed GeoJSON USGS (`all_hour.geojson` atau `all_day.geojson`).
  * *Verifikasi:* Koordinat gempa global masuk dalam format GeoJSON standar dan dapat ditampilkan di peta bersamaan dengan data BMKG.
* **TC-DIS-03 (Resiliensi API Down):**
  * *Langkah:* Matikan koneksi ke server BMKG atau buat response mock 503 Service Unavailable.
  * *Verifikasi:* Aplikasi tidak boleh crash; muncul notifikasi badge ringan *"Menggunakan data pembaruan terakhir"*.
* **TC-DIS-04 (Peringatan Potensi Tsunami):**
  * *Langkah:* Masukkan mock data gempa dengan label potensi tsunami: `"Berpotensi Tsunami"`.
  * *Verifikasi:* Top bar darurat menyala dengan warna merah dan animasi peringatan, serta muncul notifikasi darurat.

---

### Kategori C: Algoritma Radius Dampak Spasial
* **TC-SPAT-01 (Akurasi Rumus Haversine):**
  * *Langkah:* Jalankan unit test fungsi `calculateDistance()` dengan koordinat patokan yang diketahui jaraknya.
  * *Verifikasi:* Hasil kalkulasi tidak boleh berselisih lebih dari 0.5% dari jarak riil geografis.
* **TC-SPAT-02 (Deteksi Zona Bahaya):**
  * *Langkah:* Letakkan titik gempa uji coba berjarak $\le 100\text{ km}$ dari toko.
  * *Verifikasi:* Pin toko pada peta berubah menjadi warna **Merah Berdenyut** (*pulsing animation*).
* **TC-SPAT-03 (Deteksi Zona Waspada):**
  * *Langkah:* Amati toko yang berada pada jarak 101 s.d. 200 km dari episentrum.
  * *Verifikasi:* Pin toko berwarna **Kuning Siaga**.
* **TC-SPAT-04 (Slider Radius Dinamis):**
  * *Langkah:* Gerakkan slider radius di menu peta dari 100 km ke 150 km.
  * *Verifikasi:* Lingkaran batas bahaya di peta membesar secara mulus dan toko-toko yang baru masuk radius langsung berganti status.
* **TC-SPAT-05 (Urutan Prioritas Toko):**
  * *Langkah:* Buka drawer daftar toko terdampak.
  * *Verifikasi:* Toko dengan jarak terdekat dari episentrum otomatis berada di urutan teratas (ranking 1).

---

### Kategori D: Visualisasi Peta & Anti-Clutter
* **TC-MAP-01 (Marker Khusus Alfamart):**
  * *Langkah:* Muat peta pada level kecamatan/jalan.
  * *Verifikasi:* Ikon toko Alfamart muncul dengan jelas, tidak pecah, dan posisinya presisi pada koordinat yang ditentukan.
* **TC-MAP-02 (Smart Clustering):**
  * *Langkah:* Lakukan zoom out ke level pulau / nasional.
  * *Verifikasi:* Marker-marker toko menyatu ke dalam lingkaran angka klaster; performa browser tetap lancar.
* **TC-MAP-03 (Priority Override Bahaya):**
  * *Langkah:* Saat zoom out ke level pulau dengan adanya bencana aktif.
  * *Verifikasi:* Toko yang sedang dalam bahaya tidak boleh tersembunyi di dalam klaster biasa, melainkan tetap menonjol sebagai sinyal darurat.
* **TC-MAP-04 (Mode Fokus Krisis):**
  * *Langkah:* Tekan tombol toggle switch *"Fokus Toko Terdampak"*.
  * *Verifikasi:* Semua toko yang aman (berwarna hijau) menghilang dari peta; hanya toko yang berstatus waspada/bahaya yang tetap terlihat.
* **TC-MAP-05 (Pencarian Cepat Ctrl+K):**
  * *Langkah:* Tekan shortcut `Ctrl + K` (atau `Cmd + K`), ketik nama toko atau kode toko (misal: `"Dago"`).
  * *Verifikasi:* Muncul dropdown instan; klik toko tersebut dan kamera peta langsung melakukan animasi *fly-to* ke toko tersebut dan membuka popup info.
* **TC-MAP-06 (Pergantian Tema Basemap):**
  * *Langkah:* Klik tombol toggle tema Gelap/Terang di navigasi.
  * *Verifikasi:* Tile peta beralih dari CartoDB Positron ke CartoDB Dark Matter tanpa kedipan reload putih.

---

### Kategori E: Detail Toko & Prakiraan Cuaca
* **TC-WEA-01 (Drawer Informasi Toko):**
  * *Langkah:* Klik salah satu marker toko pada peta.
  * *Verifikasi:* Muncul panel samping yang menampilkan informasi lengkap toko, PIC, dan nomor telepon yang bisa diklik untuk panggilan telepon atau WhatsApp.
* **TC-WEA-02 (Prakiraan Cuaca 7 Hari):**
  * *Langkah:* Lihat tab cuaca di dalam panel toko.
  * *Verifikasi:* Menampilkan suhu saat ini, kelembapan, kecepatan angin, serta tabel prakiraan cuaca 7 hari ke depan.
* **TC-WEA-03 (Loading Skeleton):**
  * *Langkah:* Klik toko lain saat koneksi disimulasikan lambat.
  * *Verifikasi:* Muncul animasi skeleton loader abu-abu yang rapi, tidak membuat layout tampilan bergeser (*zero layout shift*).

---

### Kategori F: Autentikasi SSO SPARTA Portal
* **TC-SSO-01 (Launching dari Portal):**
  * *Langkah:* Login di `http://localhost:5173`, buka Module Launcher, lalu klik modul **Siaga**.
  * *Verifikasi:* Browser otomatis membuka tab/redirect ke `http://localhost:3004/auth/sso/callback?token=...`.
* **TC-SSO-02 (Pertukaran Token SSO):**
  * *Langkah:* Endpoint callback menerima parameter token dan menukarnya ke backend SPARTA (`http://localhost:10000/v1/sso/exchange`).
  * *Verifikasi:* Pertukaran berhasil, user mendapatkan session cookie yang sah, lalu dialihkan ke halaman dashboard monitoring.
* **TC-SSO-03 (Token Expired Handling):**
  * *Langkah:* Coba gunakan token yang usianya sudah lebih dari 2 menit.
  * *Verifikasi:* Muncul halaman error yang rapi dengan pesan *"Token sesi telah kedaluwarsa"* beserta tombol kembali ke portal login.
* **TC-SSO-04 (Middleware Route Guard):**
  * *Langkah:* Buka `http://localhost:3004` langsung di tab baru (Incognito) tanpa login terlebih dahulu.
  * *Verifikasi:* Middleware mencegat akses dan mengarahkan pengguna ke halaman login portal utama.
* **TC-SSO-05 (Logout Terpadu):**
  * *Langkah:* Klik tombol Logout pada menu profil SPARTA Siaga.
  * *Verifikasi:* Sesi login lokal dibersihkan dan pengguna diarahkan kembali ke portal `login-sparta`.

---

### Kategori G: Performa & Stabilitas
* **TC-PERF-01 (Loading Awal Cepat):**
  * *Langkah:* Ukur waktu muat awal halaman dashboard peta menggunakan Chrome DevTools (Lighthouse / Network Tab).
  * *Verifikasi:* First Contentful Paint tercapai di bawah 2.0 detik.
* **TC-PERF-02 (Kelancaran Navigasi Peta):**
  * *Langkah:* Gerakkan peta (*pan*) dan ubah perbesaran (*zoom*) dengan 1,000+ marker toko aktif.
  * *Verifikasi:* Frame rate rendering berada pada rentang $\ge 55\text{ FPS}$ tanpa patah-patah.
* **TC-PERF-03 (Uji Kebocoran Memori):**
  * *Langkah:* Buka dan tutup popup/drawer toko sebanyak 30 kali berturut-turut.
  * *Verifikasi:* Pemakaian memori JavaScript (*JS Heap*) tetap stabil dan tidak melonjak drastis.

---

## 3. Log Temuan Masalah & Catatan Perbaikan (Bug Log)

| No | ID Kasus | Tingkat Keparahan | Ringkasan Masalah | Rencana Tindak Lanjut | Status |
| :-: | :--- | :---: | :--- | :--- | :---: |
| 1 | - | - | *(Belum ada temuan - Siap untuk pengujian)* | - | - |

---

## 4. Kriteria Kelulusan Rilis (Definition of Done / DoD)

Modul **SPARTA Siaga** dinyatakan lulus QA dan siap dirilis jika:
1. [ ] Seluruh kasus uji pada **Tabel Ceklis** berstatus **Pass**.
2. [ ] Tidak ada error console `Uncaught TypeError` atau layar putih saat membuka peta.
3. [ ] Alur SSO dari portal utama `login-sparta` berfungsi dengan mulus.
4. [ ] Perhitungan jarak radius gempa terbukti akurat dan teruji.
5. [ ] Fitur pencarian `Ctrl + K` dan toggle fokus krisis bekerja sesuai spesifikasi.
