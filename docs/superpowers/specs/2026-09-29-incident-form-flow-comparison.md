# Usulan Alur Laporan Kejadian Darurat

Halo Pak/Bu, izin menyampaikan usulan terkait alur pelaporan darurat di aplikasi kita. 

Setelah mempelajari flowchart awal, saya melihat ada potensi kendala jika Manajer Toko harus mengetik NIK saat kondisi sedang panik (misal: saat terjadi gempa). 

Sebagai perbandingan, berikut adalah dua opsi alurnya:

### OPSI 1: Sesuai Flowchart Awal (Input Manual)
Di opsi ini, pengguna harus mengisi data identitas setiap kali mau lapor.

**Alurnya:**
Masuk Aplikasi ➡️ Klik 'Buat Laporan' ➡️ **Pilih Peran** ➡️ **Ketik NIK** ➡️ Pilih Jenis Bencana ➡️ Ketik Keterangan ➡️ Kirim.

**Kekurangan:** 
Sangat rawan salah ketik angka NIK karena panik. Jika salah ketik, laporan gagal terkirim. Selain itu, cukup memakan waktu karena langkahnya panjang.

---

### OPSI 2: Usulan Baru (Otomatis dari Akun)
Di opsi ini, karena pengguna sudah login menggunakan akun resmi mereka, sistem sebenarnya sudah tahu siapa yang sedang melapor beserta NIK-nya.

**Alurnya:**
Masuk Aplikasi ➡️ Klik 'Buat Laporan' ➡️ Pilih Jenis Bencana ➡️ Ketik Keterangan ➡️ Kirim.
*(Peran dan NIK otomatis dilampirkan oleh sistem di latar belakang)*

**Kelebihan:**
1. **Sangat Cepat:** Pengguna langsung fokus melaporkan apa yang terjadi tanpa harus mengisi identitas lagi.
2. **Bebas Salah Ketik:** Karena NIK diambil otomatis dari akun, tidak mungkin ada kesalahan ketik NIK.
3. **Lebih Aman:** Menghindari orang iseng meminjam HP teman dan mengetik NIK palsu.

**Kesimpulan:**
Aturan validasi NIK dari Bapak/Ibu tetap kita jalankan 100%, hanya saja caranya kita buat otomatis agar tim di lapangan bisa melapor dengan sangat cepat dan mudah saat keadaan darurat.

Mohon arahannya Pak/Bu, apakah kita boleh menggunakan **Opsi 2 (Otomatis)** agar lebih memudahkan tim toko?
