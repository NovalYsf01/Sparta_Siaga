// ============================================================
// SPARTA SIAGA — Incident / Report Domain Types
// Sesuai: UPDATE FLOW 1 SPARTA FORCE MAJURE & Flowchart Sistem Pelaporan Kejadian
// ============================================================

/**
 * 7 kategori kejadian sesuai flowchart
 */
export type DisasterType =
  | "earthquake"              // Gempa Bumi
  | "flood"                   // Kebanjiran
  | "fire"                    // Kebakaran
  | "theft"                   // Kemalingan
  | "heavy_rain"              // Hujan/Badai
  | "strong_wind"             // Angin Kencang
  | "severe_building_damage"; // Bangunan Rusak Parah

/**
 * Asal laporan: dibuat manual oleh user atau otomatis oleh sistem
 */
export type ReportOrigin =
  | "manual"
  | "automatic_earthquake";

/**
 * Status laporan dalam lifecycle
 * Sesuai flowchart: laporan → estimasi → SPK → ST → Close
 */
export type IncidentStatus =
  | "pending_confirmation"  // Auto-report dibuat, menunggu konfirmasi lapangan cabang
  | "verifying"             // Menunggu verifikasi kondisi toko
  | "confirmed_affected"    // Cabang telah mengonfirmasi kondisi terkena dampak
  | "confirmed_safe"        // Cabang mengonfirmasi aman, tidak ada kerusakan berarti
  | "investigating"         // Dalam penyelidikan/penugasan
  | "in_estimation"         // Sedang dalam proses Buat Estimasi
  | "in_maintenance"        // Sedang dalam perbaikan (MTC/ES)
  | "in_construction"       // Sedang dalam perbaikan (BLD)
  | "awaiting_spk"          // Menunggu Surat Perintah Kerja
  | "spk_issued"            // SPK sudah diterbitkan
  | "awaiting_st"           // Menunggu Serah Terima
  | "resolved"              // Selesai (ST selesai)
  | "archived";             // Diarsipkan

/**
 * Tipe lokasi TKP sesuai flowchart
 */
export type TkpType = "toko" | "dc";

/**
 * Role sesuai glossary yang telah dikonfirmasi
 */
export type SpartaRole =
  | "ho_admin"
  | "gm_ho"         // General Manager HO — dapat memberi instruksi ke cabang
  | "sm_ho"         // Senior Manager HO — dapat memberi instruksi ke cabang
  | "bm"            // Branch Manager
  | "bnm"           // Branch & Maintenance (BnM)
  | "bbc"           // Branch Building Coordinator
  | "bmc"           // Branch Maintenance Coordinator
  | "bec"           // Branch Engineering Coordinator
  | "bes"           // Branch Engineering Support
  | "bms"           // Branch Maintenance Support
  | "bbs"           // Branch Building Support
  | "tim_toko"
  | "tim_maintenance"
  | "sparta_maintenance" // Sparta Maintenance
  | "tim_office"
  | "tim_warehouse";

export type SystemRole = "ADMIN" | "USER";
export type Scope = "HO" | "BRANCH";

// Legacy alias — dipertahankan untuk backward compatibility
export type RoleType =
  | "ho_admin"
  | "store_manager_affected"
  | "store_manager_normal"
  | "sparta_maintenance";

export interface DamageReport {
  confirmedBy: string;
  confirmedAt: string;
  isDamaged: boolean;
  categories?: (
    | "Dinding/Struktur"
    | "Kaca/Pintu"
    | "Rak Barang"
    | "Kelistrikan/AC"
    | "Plafon"
    | string
  )[];
  severity?: "Ringan" | "Sedang" | "Berat";
  photos?: string[];
  operationalStatus?: "Buka Normal" | "Tutup Sementara";
  notes?: string;
}

export interface MaintenanceTicket {
  ticketId: string;
  assignedTechnician?: string;
  workDescription?: string;
  completedAt?: string;
  resolutionPhotos?: string[];
  costEstimate?: string;
}

export interface TimelineEvent {
  stage: string;
  label: string;
  timestamp: string;
  actor: string;
  notes?: string;
}

/**
 * Toko yang terindikasi berada dalam area dampak bencana.
 * PENTING: exposure calculation != confirmed physical damage.
 * Cabang terdampak tetap harus memberikan konfirmasi lapangan.
 */
export interface ReportAffectedStore {
  kode_toko: string;
  nama_toko: string;
  cabang: string;
  alamat?: string;
  fr_type?: string;
  distance_km: number;
  exposure_zone: "PRIORITY_MONITOR" | "MONITOR"; // Hasil kalkulasi SPARTA, bukan confirmed damage
  confirmation_status: "pending" | "confirmed_safe" | "confirmed_damaged" | "unreachable";
  confirmed_by?: string;
  confirmed_at?: string;
  damage_notes?: string;
}

/**
 * Instruksi dari GM/SM HO terkait nomor laporan tertentu.
 * Sesuai flowchart: GM/SM HO dapat memberi arahan/instruksi ke cabang melalui Web SPARTA,
 * kemudian didistribusikan via WA ke BnM, BBC, BMC, BES.
 * PENTING: "instruction created" != "delivery status" — keduanya dicatat terpisah.
 */
export interface ManagementInstruction {
  instruction_id: string;
  report_id: string;
  instruction_text: string;
  author_id: string;
  author_name: string;
  author_role: "gm_ho" | "sm_ho";
  created_at: string;
  delivery_status:
    | "pending"
    | "queued"
    | "delivered"
    | "failed"
    | "not_configured"; // Jika WA provider belum tersedia
  target_roles: ("bnm" | "bbc" | "bmc" | "bes")[];
  delivery_channel: "wa";  // Per flowchart, distribusi via Auto WA
  delivery_log?: string;   // Catatan pengiriman / error detail
}

export interface IncidentReporter {
  id?: string;
  userId?: string;
  name: string;
  nik?: string | null;
  role?: string | null;
  branch?: string | null;
  storeId?: string | null;
}

export { getRoleDisplayLabel } from "@/lib/role-catalog";

/**
 * Record laporan utama — anchor lifecycle sistem.
 * Nomor Laporan adalah anchor:
 *   Laporan → Estimasi → SPK → ST → Close
 *   Laporan → Update Progres → Upload Foto → Close
 */
export interface IncidentRecord {
  id: string;               // Nomor Laporan, e.g. "LAP-EQ-2026-0001" atau "LAP-MAN-2026-0042"
  date: string;
  disasterType: DisasterType;

  // === Asal Laporan ===
  reportOrigin: ReportOrigin;
  reporter?: IncidentReporter;   // Source of truth original pelapor
  earthquakeEventId?: string;    // Linked ke earthquake event ID jika auto
  earthquakeSource?: string;     // "BMKG" | "USGS"
  earthquakeProvenance?: string; // Label provenance sesuai prinsip semantik

  // === TKP ===
  tkpType?: TkpType;
  storeId: string;
  storeName: string;
  branch: string;
  locationCity: string;

  // === Status & Progress ===
  status: IncidentStatus;
  progress: number;

  // === Metadata Bencana ===
  disasterMetadata?: {
    magnitude?: number;
    depth?: string;
    coordinates?: [number, number];
    place?: string;
    time?: string;
    distanceKm?: number;
  };

  // === Multi-store exposure (auto-report: satu laporan per branch, multi-store) ===
  affectedStores?: ReportAffectedStore[];
  affectedStoreCount?: number;
  dangerStoreCount?: number;

  // === Konfirmasi Lapangan dari Cabang ===
  verification?: DamageReport;

  // === Maintenance / Construction (diisi setelah estimasi) ===
  maintenanceTicket?: MaintenanceTicket;

  // === Foto Lapangan ===
  // Manual: wajib (4 foto tampak). Auto-report: field ini null/empty pending konfirmasi.
  fieldPhotos?: string[];

  // === Timeline / History ===
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface IncidentStats {
  total: number;
  theft: number;
  fire: number;
  earthquake: number;
  flood: number;
  heavy_rain: number;
  strong_wind: number;
  severe_building_damage: number;
  wind: number; // legacy
  other: number;
  statusBreakdown: {
    resolved: number;
    inMaintenance: number;
    investigating: number;
    verifying: number;
    unhandled: number;
  };
}
