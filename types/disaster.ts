export interface Earthquake {
  id: string;
  source: "BMKG" | "USGS";
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
}
