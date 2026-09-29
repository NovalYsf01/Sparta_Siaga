# Proposal Pengembangan Sistem Pelaporan Darurat

Halo Pak/Bu, berikut adalah proposal lengkap mengenai rencana pengembangan Sistem Pelaporan Darurat di aplikasi kita, yang dirangkum dari diskusi sebelumnya dan keluhan seputar laporan di grup WhatsApp.

Dokumen ini ditulis agar mudah dipahami tanpa menggunakan istilah bahasa pemrograman.

---

## 1. Kenapa Kita Perlu Sistem Ini?
Saat ini, jika ada toko kebobolan atau kebakaran, tim di cabang melapor lewat grup WA. Hal ini sering menimbulkan masalah:
* **Berantakan:** Setiap orang melapor dengan gaya bahasa yang beda-beda.
* **Tenggelam:** Laporan penting sering ketumpuk sama obrolan lain di grup.
* **Typo (Salah Ketik):** Karena panik, orang sering salah ketik NIK atau Kode Toko.
* **Tercecer:** Kalau api baru padam 2 jam kemudian, laporan *update*-nya terpencar jauh dari pesan awal.

## 2. Solusi yang Ditawarkan
Kita akan membuatkan tombol khusus "Lapor Darurat" di dalam aplikasi yang punya 4 fitur unggulan:

### A. Lapor Tanpa Ketik Identitas (Otomatis)
Manajer Toko **tidak perlu lagi repot mengetik NIK, Nama, dan Lokasi Toko** saat panik. Begitu mereka klik "Lapor", sistem langsung tahu siapa mereka dari akun yang sedang dipakai. Ini dijamin 100% bebas *typo*.

### B. Template Panduan Pintar
Tim lapangan sering bingung harus nulis apa saat melapor. Nanti, saat mereka memilih jenis bencana di aplikasi, kotak keterangannya otomatis memunculkan draf tulisan panduan.
* **Contoh kalau pilih "Kemalingan", otomatis muncul:**
  * Kronologi Kejadian: ...
  * Titik Masuk Maling: ...
  * Kondisi CCTV: ...
  * Kerugian Barang: ...
* Manajer Toko tinggal mengisi titik-titik tersebut. Laporan jadi seragam dan rapi masuk ke Head Office.

### C. Wajib Sertakan Foto
Sistem grup WA memungkinkan orang lapor tanpa foto. Di aplikasi kita, akan ada tombol unggah foto. Manajer bisa langsung memotret tembok yang jebol atau api yang menyala (maksimal 4 foto) sebagai bukti kuat untuk Head Office.

### D. Sistem "Komentar Bersambung" (Timeline)
Ini fitur paling penting untuk kejadian yang butuh waktu lama (seperti kebakaran).
* Daripada Manajer Toko bikin laporan baru setiap jam, aplikasi kita menyediakan sistem mirip **"Kolom Komentar"**.
* Laporan awal (misal: ID Laporan INC-001) dibuat saat api mulai menyala.
* Satu jam kemudian, Manajer Toko tinggal buka INC-001, lalu klik "Tambah Update" dan mengetik: *"Api sudah padam"*.
* Tim Head Office bisa melihat seluruh rangkaian waktu kejadian dari awal sampai akhir dalam satu layar yang sama, sangat rapi dan tidak tercecer.

---

## 3. Siapa yang Bisa Melakukan Apa?
Agar aman, kita menerapkan aturan hak akses:
* **Manajer Toko:** Hanya bisa membuat laporan untuk tokonya sendiri, dan hanya bisa melihat/menambahkan *update* pada laporannya sendiri.
* **Tim Head Office:** Bisa melihat semua laporan dari seluruh cabang se-Indonesia dalam satu layar, dan bisa membalas atau mengubah status laporan (misalnya dari "Sedang Ditangani" menjadi "Selesai").

---
**Kesimpulan:**
Sistem ini dirancang murni untuk mempermudah tim cabang saat panik, sekaligus memberikan data yang sangat rapi, lengkap dengan foto dan kronologi waktu, kepada tim Head Office.

Mohon arahannya Pak/Bu, apakah konsep pengembangan ini bisa kita setujui untuk mulai diprogram?
