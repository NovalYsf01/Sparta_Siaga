---
name: graphify
description: Turn any folder of files into a navigable knowledge graph and query code architecture
---

# Workflow: graphify

Gunakan Graphify untuk analisis arsitektur, relasi modul, dan dependensi SPARTA SIAGA.

### 1. Eksekusi CLI di Windows
Gunakan perintah `graphify` atau path executable resmi:
```powershell
& "C:\Users\Noval\.local\bin\graphify.exe" <perintah>
```

### 2. Perintah Analisis Cepat (Graph-First Discovery)
- **BFS Query Umum:**
  `& "C:\Users\Noval\.local\bin\graphify.exe" query "<pertanyaan>"`
- **Penjelasan Simbol & Relasi Langsung:**
  `& "C:\Users\Noval\.local\bin\graphify.exe" explain "<nama_simbol>"`
- **Jalur Keterkaitan Antara 2 Modul/Simbol:**
  `& "C:\Users\Noval\.local\bin\graphify.exe" path "<ModulA>" "<ModulB>"`
- **Analisis Dampak Perubahan (Blast Radius):**
  `& "C:\Users\Noval\.local\bin\graphify.exe" affected "<nama_komponen>"`
- **God Nodes (Pusat Arsitektur Utama):**
  `& "C:\Users\Noval\.local\bin\graphify.exe" god-nodes`

### 3. Pembaruan Incremental (Di Akhir Task Saja)
Setelah serangkaian pengeditan file kode selesai:
```powershell
& "C:\Users\Noval\.local\bin\graphify.exe" update .
```
*(Tambahkan `--no-cluster` untuk pembaruan cepat tanpa klasterisasi ulang).*
