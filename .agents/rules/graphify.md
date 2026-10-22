---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ for codebase and architecture questions.
---

## graphify

This project has a persistent graphify knowledge graph at `graphify-out/`.

### 1. Graph-First Discovery Workflow
Terapkan prinsip: **Graph-first discovery -> source-code verification -> scoped implementation**.
- **Untuk pertanyaan arsitektur, relasi, atau pencarian komponen:**
  1. Jalankan query Graphify terarah lebih dulu daripada pemindaian/grep luas ke seluruh repository:
     - `graphify query "<pertanyaan>"` (BFS traversal konteks luas)
     - `graphify explain "<simbol>"` (detail node, inbound/outbound calls & imports)
     - `graphify path "<A>" "<B>"` (jalur keterkaitan antarsimbol/file)
     - `graphify affected "<simbol>"` (blast radius / dampak perubahan komponen)
  2. Dari subgraph hasil query, identifikasi file dan simbol spesifik yang relevan.
  3. Buka dan baca HANYA file-file aktual yang relevan tersebut untuk verifikasi.
- **Hindari pembacaan berulang:** Jangan memuat seluruh `graph.json` atau seluruh `GRAPH_REPORT.md` ke konteks jika query kecil sudah menjawab kebutuhan. Konteks yang sudah dibaca dalam task yang sama tidak perlu di-query ulang.
- **Pekerjaan langsung:** Jangan paksakan Graphify untuk tugas sederhana jika path file sudah diketahui secara pasti.

### 2. Strategi Graph Update (Cegah Update Berlebihan)
- **Tanpa perubahan kode / Read-only / Audit:** DILARANG menjalankan update atau re-indexing.
- **Saat ada perubahan kode:** JANGAN menjalankan update setiap kali mengedit satu file. Selesaikan seluruh rangkaian perubahan kode terlebih dahulu.
- **Eksekusi update:** Jalankan `graphify update .` (atau `graphify update . --no-cluster` untuk kecepatan) HANYA SEKALI di akhir task setelah implementasi selesai dan diverifikasi.
- **Rebuild penuh:** Jangan rebuild penuh (`extract` / `--force`) kecuali ada restrukturisasi arsitektur masif atau graph corrupt.

### 3. Windows CLI Invocation & Fallback
- Jika perintah bare `graphify` tidak dikenali di subshell (`CommandNotFoundException`), gunakan executable path resmi:
  `& "C:\Users\Noval\.local\bin\graphify.exe" <subcommand>`

### 4. Keamanan & Privasi
- Graphify adalah local developer tool. Jangan kirim source code ke layanan eksternal.
- Pastikan `graphify-out/`, `.env*`, credentials, dan database dumps tetap berada dalam `.gitignore`.
