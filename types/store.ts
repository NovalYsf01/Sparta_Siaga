export type StoreStatus = "safe" | "warning" | "danger";

export interface Store {
  id: string;
  kode_toko: string;
  nama_toko: string;
  cabang: string;
  alamat: string;
  latitude: number;
  longitude: number;
  fr_type?: "R" | "F" | string; // Franchise or Regular
  branch_emergency_contact?: string; // Duty officer / DC hotline
  status?: StoreStatus;
  distanceFromDisasterKm?: number;
  nearestDisasterTitle?: string;
  nearestDisasterMag?: number;
  nearestDisasterDepth?: string;
  floodWarning?: boolean;
  rainIntensityMm?: number;
  weatherSummary?: string;
}

export interface StoreFilterState {
  searchQuery: string;
  selectedBranch: string;
  statusFilter: "all" | StoreStatus;
  incidentOnly: boolean;
}
