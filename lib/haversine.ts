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
 * @returns Distance in kilometers (rounded to 1 decimal place)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates SPARTA's operational monitoring zones based on BMKG earthquake parameters.
 * Note: These are SPARTA's internal operational zones, not official BMKG MMI/Shakemap radii.
 */
export function calculateSpartaMonitoringZone(
  magnitude: number,
  depthKm: number = 10
): { priorityRadiusKm: number; monitoringRadiusKm: number } {
  // If magnitude < 4.5, minimal structural risk to modern retail buildings
  if (magnitude < 4.5) {
    return { priorityRadiusKm: 15, monitoringRadiusKm: 35 };
  }

  // Base priority radius based on magnitude
  const basePriority = Math.pow(10, 0.48 * magnitude - 1.15);

  // Depth attenuation factor: deeper quakes cause less surface PGA
  const depthFactor =
    depthKm <= 20
      ? 1.0
      : depthKm <= 50
      ? 0.85
      : depthKm <= 100
      ? 0.65
      : depthKm <= 200
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
  store: { latitude: number; longitude: number },
  activeEarthquakes: Earthquake[]
): StoreRiskAssessment {
  if (!activeEarthquakes || activeEarthquakes.length === 0) {
    return { spatialRisk: "SAFE" };
  }

  let highestSpatialRisk: SpatialRisk = "SAFE";
  let minDistance = Infinity;
  let riskSourceEvent: Earthquake | undefined;

  // We want to find the event that causes the HIGHEST spatial risk.
  // If multiple events cause the same risk, we pick the closest one.
  const riskPriority = { "SAFE": 0, "MONITOR": 1, "PRIORITY_MONITOR": 2 };

  for (const event of activeEarthquakes) {
    const dist = calculateHaversineDistance(
      store.latitude,
      store.longitude,
      event.latitude,
      event.longitude
    );

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
