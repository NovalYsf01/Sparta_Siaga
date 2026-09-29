# Spesifikasi Form Pelaporan Insiden Baru

## Konteks
Saat ini, komponen `StoreVerificationModal` digunakan ganda untuk proses "Verifikasi dari Notifikasi" (yang menanyakan apakah toko aman atau rusak) dan untuk proses "Buat Laporan Baru" (laporan manual murni). Untuk pelaporan manual, pertanyaan "Toko Aman/Ada Kerusakan" tidak relevan, dan detail kejadian seperti jenis bencana belum terakomodir.

## Tujuan Desain
Memisahkan proses pelaporan manual ke dalam komponen/mode baru yang langsung difokuskan pada pengumpulan data insiden dengan logika role yang tepat.

## Detail Implementasi & Perubahan

### 1. Komponen Modal Pelaporan Baru
Buat komponen baru `NewIncidentModal` (atau update `StoreVerificationModal` dengan prop `isManualReport = true`) dengan karakteristik berikut:
- **Tidak ada toggle "Kondisi Fisik" (Safe/Damaged).** Secara otomatis mengasumsikan pelaporan ini adalah eskalasi kerusakan/insiden (`isDamaged = true`).
- **Input Jenis Kejadian:** Dropdown wajib yang berisi (Gempa Bumi, Banjir, Kebakaran, Pencurian, Angin Kencang, Lainnya).
- **Logika Pemilihan Toko (Role-Based):**
  - Jika user = `ho_admin`: Tampilkan Dropdown/Search box untuk memilih toko dari daftar toko yang ada.
  - Jika user = `store_manager_*`: Otomatis menetapkan `storeId` ke toko milik manajer yang sedang login, dan mematikan (disable) pengubahan toko.

### 2. Field Lain dalam Form
Tetap menyertakan:
- Kategori Kerusakan (Checkboxes multiselect)
- Tingkat Keparahan (Dropdown)
- Status Operasional (Dropdown)
- Catatan / Kronologi (Textarea)
- Unggah Foto (UI Dummy placeholder)

### 3. Proses Submit
Saat disimpan:
- Buat objek `IncidentRecord` baru dengan data form.
- Masukkan ke `incidents` list di `app/page.tsx`.
- Trigger pembuatan `MaintenanceTicket` dengan status "investigating".

### 4. Perubahan di `page.tsx`
- Ubah pemanggilan `handleOpenReportModal` untuk meneruskan state yang menunjukkan bahwa ini adalah laporan baru (bukan sekadar verifikasi notifikasi).
- Siapkan daftar toko statis/dinamis yang bisa dipilih oleh Admin HO.
