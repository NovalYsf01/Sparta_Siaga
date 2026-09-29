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
 * Calculates the scientific impact radius from BMKG Magnitude and Hypocentral Depth.
 * Based on BMKG attenuation relations (Peak Ground Acceleration & MMI intensity decay).
 * Shallow quakes (depth <= 30km) concentrate severe surface shaking (MMI >= VI).
 * Deep subduction events dissipate surface energy over a broader area with lower peak acceleration.
 */
export function calculateBmkgImpactRadius(
  magnitude: number,
  depthKm: number = 10
): { dangerRadiusKm: number; warningRadiusKm: number } {
  // If magnitude < 4.5, minimal structural risk to modern retail buildings
  if (magnitude < 4.5) {
    return { dangerRadiusKm: 15, warningRadiusKm: 35 };
  }

  // Base epicentral radius for MMI >= VI based on BMKG empirical attenuation:
  // log10(R) ≈ 0.48 * M - 1.15
  const baseDanger = Math.pow(10, 0.48 * magnitude - 1.15);

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

  const dangerRadiusKm = Math.max(15, Math.round(baseDanger * depthFactor));
  // Warning radius (MMI IV - V, light shaking, operational vigilance) is approx 2.2x danger radius
  const warningRadiusKm = Math.round(dangerRadiusKm * 2.2);

  return { dangerRadiusKm, warningRadiusKm };
}

export interface StoreRiskAssessment {
  status: StoreStatus;
  distanceFromDisasterKm?: number;
  nearestDisaster?: Earthquake;
}

/**
 * Evaluates the risk status of a store against all active earthquakes
 * using each earthquake's auto-calculated scientific attenuation radius.
 */
export function assessStoreRisk(
  store: { latitude: number; longitude: number },
  disasters: Earthquake[]
): StoreRiskAssessment {
  if (!disasters || disasters.length === 0) {
    return { status: "safe" };
  }

  let highestRiskStatus: StoreStatus = "safe";
  let minDistance = Infinity;
  let closestDisaster: Earthquake | undefined;

  for (const disaster of disasters) {
    const dist = calculateHaversineDistance(
      store.latitude,
      store.longitude,
      disaster.latitude,
      disaster.longitude
    );

    if (dist < minDistance) {
      minDistance = dist;
      closestDisaster = disaster;
    }

    const dangerR = disaster.dangerRadiusKm || 50;
    const warningR = disaster.warningRadiusKm || 120;

    if (dist <= dangerR) {
      highestRiskStatus = "danger";
    } else if (dist <= warningR && highestRiskStatus !== "danger") {
      highestRiskStatus = "warning";
    }
  }

  return {
    status: highestRiskStatus,
    distanceFromDisasterKm: minDistance === Infinity ? undefined : minDistance,
    nearestDisaster: closestDisaster,
  };
}
