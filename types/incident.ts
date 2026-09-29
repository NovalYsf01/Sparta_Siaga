export type DisasterType =
  | "earthquake"
  | "flood"
  | "fire"
  | "theft"
  | "wind"
  | "other";

export type IncidentStatus =
  | "verifying"        // Menunggu verifikasi Store Manager / HO
  | "investigating"    // Diverifikasi ada kerusakan, dalam penugasan teknisi
  | "in_maintenance"   // Sedang dalam perbaikan fisik oleh Sparta Maintenance
  | "resolved"         // Selesai diperbaiki (100%)
  | "archived";        // Diarsipkan di History

export type RoleType =
  | "ho_admin"
  | "store_manager_affected"
  | "store_manager_normal"
  | "sparta_maintenance";

export interface DamageReport {
  confirmedBy: string;
  confirmedAt: string;
  isDamaged: boolean;
  categories?: ("Dinding/Struktur" | "Kaca/Pintu" | "Rak Barang" | "Kelistrikan/AC" | "Plafon" | string)[];
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

export interface IncidentRecord {
  id: string; // e.g. "INC-2026-0001"
  date: string; // e.g. "1 Sep 2026"
  disasterType: DisasterType;
  storeId: string;
  storeName: string;
  branch: string;
  locationCity: string;
  status: IncidentStatus;
  progress: number; // 0 - 100
  disasterMetadata?: {
    magnitude?: number;
    depth?: string;
    coordinates?: [number, number];
    place?: string;
    time?: string;
    distanceKm?: number;
  };
  verification?: DamageReport;
  maintenanceTicket?: MaintenanceTicket;
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
  wind: number;
  other: number;
  statusBreakdown: {
    resolved: number;
    inMaintenance: number;
    investigating: number;
    verifying: number;
    unhandled: number;
  };
}
