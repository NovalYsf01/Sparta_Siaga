import { Store, StoreStatus } from "@/types/store";
import { Earthquake } from "@/types/disaster";

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Distance in kilometers (rounded to 1 decimal place), or NaN if invalid
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return NaN;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  // Clamp a to [0, 1] to prevent floating-point precision error on antipodal points
  const aClamped = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(aClamped), Math.sqrt(1 - aClamped));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates SPARTA's operational monitoring zones based on BMKG earthquake parameters.
 * Note: These are SPARTA's internal operational vigilance zones, NOT official BMKG MMI/Shakemap radii,
 * and NOT confirmed structural damage. Operational monitoring triggers field inspection workflows.
 */
export function calculateSpartaMonitoringZone(
  magnitude: number,
  depthKm: number = 10
): { priorityRadiusKm: number; monitoringRadiusKm: number } {
  const safeMag = Number.isFinite(magnitude) ? magnitude : 0;
  const safeDepth = Number.isFinite(depthKm) && depthKm >= 0 ? depthKm : 10;

  // If magnitude < 4.5, minimal structural risk to modern retail buildings
  if (safeMag < 4.5) {
    return { priorityRadiusKm: 15, monitoringRadiusKm: 35 };
  }

  // Base priority radius based on magnitude
  const basePriority = Math.pow(10, 0.48 * safeMag - 1.15);

  // Depth attenuation factor: deeper quakes cause less surface PGA
  const depthFactor =
    safeDepth <= 20
      ? 1.0
      : safeDepth <= 50
      ? 0.85
      : safeDepth <= 100
      ? 0.65
      : safeDepth <= 200
      ? 0.45
      : 0.3;

  const priorityRadiusKm = Math.max(15, Math.round(basePriority * depthFactor));
  // Monitoring radius (operational vigilance) is approx 2.2x priority radius
  const monitoringRadiusKm = Math.round(priorityRadiusKm * 2.2);

  return { priorityRadiusKm, monitoringRadiusKm };
}

export type SpatialRisk = "SAFE" | "MONITOR" | "PRIORITY_MONITOR";

export interface StoreRiskAssessment {
  spatialRisk: SpatialRisk;
  distanceFromEventKm?: number;
  riskSourceEvent?: Earthquake;
}

/**
 * Evaluates the spatial risk of a store against all active earthquakes
 * using SPARTA's monitoring zones.
 */
export function assessStoreRisk(
  store: { latitude?: number | null; longitude?: number | null },
  activeEarthquakes: Earthquake[]
): StoreRiskAssessment {
  if (
    store.latitude == null ||
    store.longitude == null ||
    !Number.isFinite(store.latitude) ||
    !Number.isFinite(store.longitude) ||
    !activeEarthquakes ||
    activeEarthquakes.length === 0
  ) {
    return { spatialRisk: "SAFE" };
  }

  let highestSpatialRisk: SpatialRisk = "SAFE";
  let minDistance = Infinity;
  let riskSourceEvent: Earthquake | undefined;

  // We want to find the event that causes the HIGHEST spatial risk.
  // If multiple events cause the same risk, we pick the closest one.
  const riskPriority = { SAFE: 0, MONITOR: 1, PRIORITY_MONITOR: 2 };

  for (const event of activeEarthquakes) {
    if (
      event.latitude == null ||
      event.longitude == null ||
      !Number.isFinite(event.latitude) ||
      !Number.isFinite(event.longitude)
    ) {
      continue;
    }

    const dist = calculateHaversineDistance(
      store.latitude,
      store.longitude,
      event.latitude,
      event.longitude
    );

    if (isNaN(dist)) continue;

    let currentEventRisk: SpatialRisk = "SAFE";

    const priorityR = (event as any).priorityRadiusKm ?? (event as any).dangerRadiusKm ?? 50;
    const monitorR = (event as any).monitoringRadiusKm ?? (event as any).warningRadiusKm ?? 120;

    if (dist <= priorityR) {
      currentEventRisk = "PRIORITY_MONITOR";
    } else if (dist <= monitorR) {
      currentEventRisk = "MONITOR";
    }

    if (riskPriority[currentEventRisk] > riskPriority[highestSpatialRisk]) {
      highestSpatialRisk = currentEventRisk;
      minDistance = dist;
      riskSourceEvent = currentEventRisk !== "SAFE" ? event : undefined;
    } else if (riskPriority[currentEventRisk] === riskPriority[highestSpatialRisk] && currentEventRisk !== "SAFE") {
      if (dist < minDistance) {
        minDistance = dist;
        riskSourceEvent = event;
      }
    } else if (highestSpatialRisk === "SAFE" && dist < minDistance) {
      minDistance = dist;
    }
  }

  return {
    spatialRisk: highestSpatialRisk,
    distanceFromEventKm: minDistance === Infinity ? undefined : minDistance,
    riskSourceEvent: highestSpatialRisk === "SAFE" ? undefined : riskSourceEvent,
  };
}

export interface LocationItem {
  id?: string;
  code?: string;
  kode_toko?: string;
  name?: string;
  nama_toko?: string;
  cabang?: string;
  branch_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: any;
}

export interface EvaluatedLocation<T = LocationItem> {
  item: T;
  id: string;
  code: string;
  name: string;
  branch: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  zone: SpatialRisk;
}

export interface AffectedLocationSummary<T = LocationItem> {
  earthquakeId: string;
  magnitude: number;
  depthKm: number;
  priorityRadiusKm: number;
  monitoringRadiusKm: number;
  priorityLocations: EvaluatedLocation<T>[];
  monitoringLocations: EvaluatedLocation<T>[];
  allAffectedLocations: EvaluatedLocation<T>[];
  totalAffected: number;
  totalEvaluated: number;
  invalidLocationCount: number;
}

/**
 * Mathematically evaluates a list of locations (stores or facilities) against an earthquake.
 * Ensures:
 * 1. Strict Haversine distance calculation and boundary classification.
 * 2. Deduplication by location code/id so counts are unique and consistent.
 * 3. Accurate sorting by distance ascending.
 * 4. Filtering of locations with missing or invalid coordinates.
 */
export function evaluateAffectedLocations<T extends LocationItem>(
  earthquake: {
    id: string;
    latitude: number;
    longitude: number;
    magnitude: number;
    depthKm?: number;
    priorityRadiusKm?: number;
    monitoringRadiusKm?: number;
  },
  locations: T[]
): AffectedLocationSummary<T> {
  const depth = earthquake.depthKm ?? 10;
  const radii = (earthquake.priorityRadiusKm && earthquake.monitoringRadiusKm)
    ? { priorityRadiusKm: earthquake.priorityRadiusKm, monitoringRadiusKm: earthquake.monitoringRadiusKm }
    : calculateSpartaMonitoringZone(earthquake.magnitude, depth);

  const priorityLocations: EvaluatedLocation<T>[] = [];
  const monitoringLocations: EvaluatedLocation<T>[] = [];
  const allAffectedLocations: EvaluatedLocation<T>[] = [];
  const seenCodes = new Set<string>();

  let totalEvaluated = 0;
  let invalidLocationCount = 0;

  for (const loc of locations) {
    totalEvaluated++;
    const lat = loc.latitude;
    const lon = loc.longitude;

    if (
      lat == null ||
      lon == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      invalidLocationCount++;
      continue;
    }

    const code = loc.code || loc.kode_toko || loc.id || `loc_${totalEvaluated}`;
    if (seenCodes.has(code)) {
      continue; // Deduplicate duplicate locations
    }
    seenCodes.add(code);

    const distanceKm = calculateHaversineDistance(
      earthquake.latitude,
      earthquake.longitude,
      lat,
      lon
    );

    if (isNaN(distanceKm)) {
      invalidLocationCount++;
      continue;
    }

    const id = loc.id || loc.code || loc.kode_toko || code;
    const name = loc.name || loc.nama_toko || code;
    const branch = loc.cabang || loc.branch_id || "Nasional";

    if (distanceKm <= radii.priorityRadiusKm) {
      const evaluated: EvaluatedLocation<T> = {
        item: loc,
        id,
        code,
        name,
        branch,
        latitude: lat,
        longitude: lon,
        distanceKm,
        zone: "PRIORITY_MONITOR",
      };
      priorityLocations.push(evaluated);
      allAffectedLocations.push(evaluated);
    } else if (distanceKm <= radii.monitoringRadiusKm) {
      const evaluated: EvaluatedLocation<T> = {
        item: loc,
        id,
        code,
        name,
        branch,
        latitude: lat,
        longitude: lon,
        distanceKm,
        zone: "MONITOR",
      };
      monitoringLocations.push(evaluated);
      allAffectedLocations.push(evaluated);
    }
  }

  // Sort by distance ascending
  priorityLocations.sort((a, b) => a.distanceKm - b.distanceKm);
  monitoringLocations.sort((a, b) => a.distanceKm - b.distanceKm);
  allAffectedLocations.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    earthquakeId: earthquake.id,
    magnitude: earthquake.magnitude,
    depthKm: depth,
    priorityRadiusKm: radii.priorityRadiusKm,
    monitoringRadiusKm: radii.monitoringRadiusKm,
    priorityLocations,
    monitoringLocations,
    allAffectedLocations,
    totalAffected: allAffectedLocations.length,
    totalEvaluated,
    invalidLocationCount,
  };
}
