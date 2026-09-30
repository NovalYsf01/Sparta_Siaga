export type DataFreshness = "live" | "fresh" | "stale" | "unavailable";

export type InformationType =
  | "official_alert"
  | "official_event"
  | "observation"
  | "forecast"
  | "field_report"
  | "model";

export type VerificationStatus =
  | "unverified"
  | "system_detected"
  | "corroborated"
  | "official"
  | "official_external"
  | "community_report"
  | "field_confirmed";

export interface SourceHealth {
  source: string;
  status: "healthy" | "degraded" | "offline";
  lastSuccessAt?: string;
  lastAttemptAt: string;
  error?: string;
  freshness: DataFreshness;
}

export interface Earthquake {
  id: string;
  source: string;
  informationType?: InformationType;
  verificationStatus?: VerificationStatus;
  title: string;
  magnitude: number;
  depth: string; // e.g. "10 km"
  depthKm: number;
  latitude: number;
  longitude: number;
  time: string; // ISO or human readable
  timestamp: number;
  potensiTsunami: boolean;
  potensiText?: string;
  feltArea?: string;
  shakemapUrl?: string;
  isSignificant?: boolean;
  dangerRadiusKm: number; // Scientifically calculated from Magnitude & Depth
  warningRadiusKm: number; // Secondary buffer radius
}

export interface DisasterFeedResponse {
  latestBmkgEarthquake?: Earthquake;
  recentEarthquakes: Earthquake[];
  lastUpdated: string;
  totalActive: number;
  floodReports?: any[];
  dataFreshness?: DataFreshness;
  sourcesHealth?: SourceHealth[];
}
