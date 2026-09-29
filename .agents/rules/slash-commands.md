# Custom Slash Commands Execution Rule

Rule ini berlaku untuk seluruh interaksi chat di workspace `sparta-sentinel`.

## Penanganan Perintah dengan Awalan Slash (`/`)

Ketika pengguna mengetik pesan yang diawali dengan tanda garis miring (`/`), seperti:
- `/brainstorming [topik]`
- `/executing-plans [rencana]`
- `/systematic-debugging [masalah]`
- Atau format `/<nama-skill>` lainnya dari folder `.agents/skills/`:

### Aturan Eksekusi:
1. **Eksekusi Instan & Stateless:**
   - AI harus langsung membaca dan menerapkan instruksi dari `.agents/skills/<nama-skill>/SKILL.md`.
   - **DILARANG KERAS** membuat "sesi tertutup" atau memaksa pengguna meminta izin keluar-masuk sesi.
   - **DILARANG KERAS** menggunakan dialog blokir kaku (`ask_question` modal) yang menahan alur pengguna jika pengguna hanya ingin respons langsung di chat.

2. **Fleksibilitas Tanpa Birokrasi:**
   - Langsung berikan analisis, respons, atau tindakan teknis terbaik sesuai prinsip skill yang dipanggil dalam satu pesan yang padat, bernilai tinggi, dan langsung bisa dieksekusi.
   - Jika pengguna berpindah ke perintah lain di pesan berikutnya (misal dari `/brainstorming` ke `/executing-plans`), langsung beralih seketika tanpa perlu kata penutup atau konfirmasi keluar.
