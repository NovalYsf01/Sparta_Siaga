# 🛡️ Blueprint Otorisasi Penanganan Insiden & Rencana Deployment Server Pusat
**SPARTA Sentinel - Production Security & Role-Based Access Control (RBAC) Specification**

> **Tujuan Dokumen:**  
> Menjadi panduan arsitektur keamanan dan cetak biru teknis saat sistem SPARTA Sentinel dinaikkan ke **Server Pusat (Production)**, memastikan aksi konfirmasi darurat (`Konfirmasi Terima & Tangani`) **hanya dapat dilakukan oleh Duty Officer cabang yang terdampak atau Tim HO Pusat**, tanpa mengganggu fleksibilitas pengujian di lingkungan lokal saat ini.

---

## 📌 1. Prinsip Dasar & Kebijakan Keamanan (Security Guardrails)

Pada fase *development* dan simulasi lokal, seluruh fitur konfirmasi sengaja dibuka agar proses pengujian alur notifikasi dapat dilakukan dengan leluasa. Namun, pada lingkungan **Server Pusat (Production Multi-User)**, diberlakukan prinsip:

1. **Prinsip Wilayah Tugas (Branch-Scoped Isolation):**  
   Petugas Duty Officer DC hanya memiliki wewenang operasional atas toko-toko yang berada di bawah naungan distribusinya.
2. **Prinsip Pengawasan Pusat (Centralized Command & Oversight):**  
   Tim Command Center HO (Head Office) Pusat memiliki wewenang *Super-Admin* lintas cabang untuk melakukan *override* atau konfirmasi eskalasi darurat jika cabang setempat mengalami *blackout* atau keterlambatan respon.
3. **Prinsip Audit Trail Anti-Repudiasi:**  
   Setiap klik tombol konfirmasi harus mengunci identitas akun SSO, NIK petugas, alamat IP, dan *timestamp* resmi di database Aiven PostgreSQL sebagai bukti hukum kepatuhan SOP Kebencanaan.

---

## 👥 2. Matriks Hak Akses & Otorisasi (RBAC Matrix)

| Peran Pengguna (Role) | Cakupan Wilayah (Scope) | Hak Aksi `Konfirmasi Terima & Tangani` | Status Tampilan Tombol |
|---|---|:---:|---|
| **HO Command Center (Admin Pusat)** | **Nasional (Seluruh Cabang)** |  **DIIZINKAN** | Tombol hijau aktif di seluruh tiket insiden bencana nasional. |
| **Duty Officer DC Cabang Terdampak** | **Cabang Sendiri** *(misal: DC SIDOARJO)* |  **DIIZINKAN** | Tombol hijau aktif **khusus** untuk insiden yang menimpa gerai cabangnya. |
| **Duty Officer DC Cabang Lain** | **Luar Wilayah** *(misal: DC MEDAN)* | ❌ **DITOLAK (403)** | Tombol non-aktif (*disabled*) berwarna abu-abu dengan label gembok 🔒. |
| **Operator Toko / Kru Gerai / Tamu** | **Spesifik Toko / Tamu** | ❌ **DITOLAK (403)** | Hanya melihat status (*View-Only*), tombol disembunyikan. |

---

## 🔐 3. Arsitektur Otentikasi Terintegrasi SSO Alfamart

Saat dideploy ke server korporat, sistem memanfaatkan token session **SPARTA SSO (SAML / OAuth2 / JWT)** yang membawa payload data profil pengguna:

```json
{
  "user_id": "SAT-902144",
  "name": "Budi Santoso",
  "email": "duty.sidoarjo@alfamart.co.id",
  "role": "DC_DUTY_OFFICER",
  "branch_code": "SIDOARJO",
  "permissions": ["INCIDENT_ACK", "MAPS_VIEW"]
}
```

### Rumus Validasi Otorisasi (Otoritas Penanganan):
$$\text{Hak Konfirmasi} = (\text{role} \in \{\text{'HO_SUPERADMIN'}, \text{'HO_COMMAND_CENTER'}\}) \lor (\text{user.branch\_code} == \text{incident.branch})$$

---

## 💻 4. Rencana Implementasi Teknis (Production Ready Blueprint)

### A. Proteksi Backend API ([`/api/notifications/ack/route.ts`](file:///c:/buildingprocess25/sparta-sentinel/app/api/notifications/ack/route.ts))

Saat environment variable `NODE_ENV === 'production'` atau `ENFORCE_BRANCH_AUTH === 'true'`, backend memvalidasi token sesi pengguna:

```typescript
// Contoh implementasi guard pada route /api/notifications/ack/route.ts
export async function POST(request: Request) {
  const session = await getSpartaSsoSession(request); // Mengambil akun login SSO
  const { logId, notes } = await request.json();

  // 1. Ambil data insiden dari database
  const incident = await getNotificationById(logId);
  if (!incident) return NextResponse.json({ error: "Insiden tidak ditemukan" }, { status: 404 });

  // 2. Evaluasi Hak Akses (RBAC Guard)
  const isHeadOffice = session.role === "HO_COMMAND_CENTER" || session.role === "SUPER_ADMIN";
  const isBranchOfficer = session.branch_code.toUpperCase() === incident.branch.toUpperCase();

  if (!isHeadOffice && !isBranchOfficer) {
    return NextResponse.json({
      success: false,
      error: `Akses Ditolak: Anda login sebagai Cabang ${session.branch_code}. Tiket ini berada di bawah wewenang Cabang ${incident.branch}.`
    }, { status: 403 });
  }

  // 3. Eksekusi pembaruan status jika lolos validasi
  const updatedLog = await updateIncidentStatusToAcknowledged({
    logId,
    acknowledgedBy: `${session.name} (${session.role} - ${session.branch_code})`,
    notes: notes || "Dikonfirmasi sesuai SOP Bencana",
  });

  return NextResponse.json({ success: true, log: updatedLog });
}
```

---

### B. Tampilan Antarmuka Frontend ([`notification-center-sheet.tsx`](file:///c:/buildingprocess25/sparta-sentinel/components/notifications/notification-center-sheet.tsx))

Pada tampilan kartu insiden di Notification Center, tombol aksi akan beradaptasi secara dinamis sesuai akun pengguna:

```tsx
{/* Kondisi 1: Cabang Terdampak atau Tim HO */}
{canAcknowledge ? (
  <button
    onClick={() => handleAcknowledgeIncident(log.id, log.ticket_number, log.branch)}
    className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1 transition-all"
  >
    <CheckCircle className="w-3 h-3" />
    <span>Konfirmasi Terima & Tangani</span>
  </button>
) : (
  /* Kondisi 2: Pengguna dari Cabang Lain */
  <div 
    title={`Hanya dapat dikonfirmasi oleh Duty Officer Cabang ${log.branch} atau HO Pusat`}
    className="px-2.5 py-1 rounded text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-500 flex items-center gap-1 cursor-not-allowed select-none"
  >
    <Lock className="w-3 h-3 text-slate-500" />
    <span>Wewenang Cabang {log.branch}</span>
  </div>
)}
```

---

## 🚀 5. Checklist Tahapan Migrasi ke Server Pusat (*Anti-Berantakan*)

Agar proses *go-live* berjalan mulus tanpa merusak konfigurasi lokal:

| Tahap | Aktivitas Teknis | Status Kesiapan |
|:---:|---|:---:|
| **1** | **Database Schema Migration:** Kolom `acknowledged_at`, `acknowledged_by`, dan `acknowledgment_notes` sudah siap di Aiven PostgreSQL. |  **SIAP** |
| **2** | **Kompabilitas Mode Lokal:** Tetap mengizinkan simulasi bebas dengan fallback `'Duty Officer DC Cabang'` saat SSO belum disambungkan. |  **SIAP** |
| **3** | **Konfigurasi Environment Variable Produksi:**<br>Menyiapkan `.env.production`:<br>`NEXT_PUBLIC_ENFORCE_BRANCH_AUTH=true`<br>`SPARTA_SSO_PUBLIC_KEY=...` | ⏳ *Dijalankan saat deploy server pusat* |
| **4** | **Penyambungan Middleware SSO:** Memetakan akun korporat ke parameter `user.branch_code`. | ⏳ *Dijalankan saat deploy server pusat* |
| **5** | **Uji Coba Lintas Cabang (Penetration Test):** Login sebagai akun Medan dan mencoba konfirmasi tiket Sidoarjo untuk memastikan error `403 Forbidden` tertangkap sempurna. | ⏳ *Dijalankan saat staging final* |

---

## 📑 6. Kesimpulan & Status Dokumen

Dokumen ini disimpan secara aman sebagai acuan baku pada:  
📂 **[`docs/01-prd-and-specs/PRODUCTION_AUTHORIZATION_INCIDENT_HANDLING_BLUEPRINT.md`](file:///c:/buildingprocess25/sparta-sentinel/docs/01-prd-and-specs/PRODUCTION_AUTHORIZATION_INCIDENT_HANDLING_BLUEPRINT.md)**

Dengan adanya cetak biru ini, kode di lingkungan pengembangan tetap leluasa untuk uji coba, dan tim teknis memiliki SOP tertulis yang terstruktur rapi saat integrasi ke server pusat Alfamart.
