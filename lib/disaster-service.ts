import { Earthquake, DisasterFeedResponse, SourceHealth, DataFreshness } from "@/types/disaster";
import { calculateHaversineDistance, calculateSpartaMonitoringZone } from "./haversine";
import { dbUpsertEarthquakeEvent } from "./earthquake-db";

// Cache in-memory for 30 seconds
let cachedDisasters: DisasterFeedResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000;

let bmkgHealth: SourceHealth = { source: "BMKG", status: "offline", lastAttemptAt: new Date().toISOString(), freshness: "unavailable" };
let usgsHealth: SourceHealth = { source: "USGS", status: "offline", lastAttemptAt: new Date().toISOString(), freshness: "unavailable" };

/**
 * Conservative thresholds for cross-provider correlation (Requirement 6)
 * BMKG = Primary source for Indonesian territorial events.
 */
export const CANONICAL_CORRELATION_THRESHOLDS = {
  // BMKG AutoGempa vs BMKG Terkini matching:
  bmkgMaxTimeDeltaMs: 90 * 1000, // 90 seconds
  bmkgMaxCoordDiffDeg: 0.15,

  // USGS vs BMKG matching (Requirement 6):
  usgsMaxTimeDeltaMinutes: 15, // Max 15 minutes occurred_at delta
  usgsMaxDistanceKm: 100, // Max 100 km epicenter delta
  usgsMaxMagnitudeDiff: 0.6, // Max 0.6 magnitude scale discrepancy
};

/**
 * Generate canonical event key
 */
export function getCanonicalEventKey(source: "BMKG" | "USGS", dateTimeStr?: string, timestamp?: number): string {
  if (dateTimeStr) {
    const clean = dateTimeStr.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
    return `${source.toLowerCase()}-${clean}`;
  }
  return `${source.toLowerCase()}-${timestamp || Date.now()}`;
}

/**
 * Correlate raw/recent earthquakes from multi-provider feeds into canonical events (Requirement 6)
 */
export function correlateEarthquakes(rawList: Earthquake[]): Earthquake[] {
  const canonicalList: Earthquake[] = [];

  for (const eq of rawList) {
    const match = canonicalList.find((existing) => {
      // 1. Same canonical key
      if (eq.canonicalEventKey && existing.canonicalEventKey && eq.canonicalEventKey === existing.canonicalEventKey) {
        return true;
      }
      // 2. BMKG vs BMKG matching
      if (eq.source === "BMKG" && existing.source === "BMKG") {
        const timeDiff = Math.abs(eq.timestamp - existing.timestamp);
        const latDiff = Math.abs(eq.latitude - existing.latitude);
        const lngDiff = Math.abs(eq.longitude - existing.longitude);
        if (
          timeDiff <= CANONICAL_CORRELATION_THRESHOLDS.bmkgMaxTimeDeltaMs &&
          latDiff <= CANONICAL_CORRELATION_THRESHOLDS.bmkgMaxCoordDiffDeg &&
          lngDiff <= CANONICAL_CORRELATION_THRESHOLDS.bmkgMaxCoordDiffDeg
        ) {
          return true;
        }
      }
      // 3. USGS vs BMKG matching
      const isCrossProvider =
        (eq.source === "USGS" && existing.source === "BMKG") ||
        (eq.source === "BMKG" && existing.source === "USGS");
      if (isCrossProvider) {
        const timeDeltaMin = Math.abs(eq.timestamp - existing.timestamp) / (60 * 1000);
        if (timeDeltaMin <= CANONICAL_CORRELATION_THRESHOLDS.usgsMaxTimeDeltaMinutes) {
          const distKm = calculateHaversineDistance(eq.latitude, eq.longitude, existing.latitude, existing.longitude);
          const magDiff = Math.abs(eq.magnitude - existing.magnitude);
          if (
            distKm <= CANONICAL_CORRELATION_THRESHOLDS.usgsMaxDistanceKm &&
            magDiff <= CANONICAL_CORRELATION_THRESHOLDS.usgsMaxMagnitudeDiff
          ) {
            return true;
          }
        }
      }
      return false;
    });

    if (match) {
      if (match.source !== "BMKG" && eq.source === "BMKG") {
        const idx = canonicalList.indexOf(match);
        canonicalList[idx] = eq;
      }
    } else {
      canonicalList.push(eq);
    }
  }

  return canonicalList;
}

export const correlateDisasters = correlateEarthquakes;

export async function fetchDisasterFeed(forceRefresh: boolean = false): Promise<DisasterFeedResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedDisasters && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedDisasters;
  }

  const earthquakes: Earthquake[] = [];
  let latestBmkgEarthquake: Earthquake | undefined;

  bmkgHealth.lastAttemptAt = new Date().toISOString();

  // 1. Fetch BMKG AutoGempa (Gempa M5.0+ terbaru / berpotensi tsunami)
  try {
    const bmkgAutoRes = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json", {
      next: { revalidate: 30 },
      headers: { "User-Agent": "SpartaSiaga/1.0" },
    });

    if (bmkgAutoRes.ok) {
      const data = await bmkgAutoRes.json();
      const g = data?.Infogempa?.gempa;
      if (g) {
        const coords = parseBmkgCoordinates(g.Coordinates, g.Lintang, g.Bujur);
        if (coords) {
          const depthKm = parseDepthToKm(g.Kedalaman);
          const mag = parseFloat(g.Magnitude) || 0;
          const { priorityRadiusKm, monitoringRadiusKm } = calculateSpartaMonitoringZone(mag, depthKm);
          const hasTsunami = (g.Potensi || "").toLowerCase().includes("tsunami") && 
                             !(g.Potensi || "").toLowerCase().includes("tidak berpotensi");
          const timestamp = g.DateTime ? new Date(g.DateTime).getTime() : Date.now();
          const canonicalId = getCanonicalEventKey("BMKG", g.DateTime, timestamp);

          latestBmkgEarthquake = {
            id: canonicalId,
            source: "BMKG",
            informationType: "official_event",
            verificationStatus: "official",
            title: `M ${g.Magnitude} - ${g.Wilayah}`,
            magnitude: mag,
            depth: g.Kedalaman || `${depthKm} km`,
            depthKm,
            latitude: coords.lat,
            longitude: coords.lon,
            time: `${g.Tanggal} ${g.Jam}`,
            timestamp,
            potensiTsunami: hasTsunami,
            potensiText: g.Potensi,
            feltArea: g.Dirasakan,
            shakemapUrl: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : undefined,
            isSignificant: true,
            priorityRadiusKm,
            monitoringRadiusKm,
          };

          earthquakes.push(latestBmkgEarthquake);
          bmkgHealth.status = "healthy";
          bmkgHealth.lastSuccessAt = new Date().toISOString();
          bmkgHealth.freshness = "live";
          bmkgHealth.error = undefined;
        }
      }
    } else {
      bmkgHealth.status = "degraded";
      bmkgHealth.error = "Non-200 response";
    }
  } catch (err: any) {
    console.error("[Disaster Service] Error fetching BMKG autogempa:", err);
    bmkgHealth.status = "degraded";
    bmkgHealth.error = err.message || "Fetch failed";
  }

  // 2. Fetch BMKG 15 Gempa Terkini
  try {
    const bmkgListRes = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json", {
      next: { revalidate: 60 },
      headers: { "User-Agent": "SpartaSiaga/1.0" },
    });

    if (bmkgListRes.ok) {
      const listData = await bmkgListRes.json();
      const list = listData?.Infogempa?.gempa;
      if (Array.isArray(list)) {
        for (const item of list) {
          const coords = parseBmkgCoordinates(item.Coordinates, item.Lintang, item.Bujur);
          if (!coords) continue;

          const depthKm = parseDepthToKm(item.Kedalaman);
          const mag = parseFloat(item.Magnitude) || 0;
          const { priorityRadiusKm, monitoringRadiusKm } = calculateSpartaMonitoringZone(mag, depthKm);
          const hasTsunami = (item.Potensi || "").toLowerCase().includes("tsunami") && 
                             !(item.Potensi || "").toLowerCase().includes("tidak berpotensi");
          const itemTimestamp = item.DateTime ? new Date(item.DateTime).getTime() : Date.now();

          // Canonical Dedup: BMKG AutoGempa vs BMKG Terkini (Requirement 6)
          // Match by DateTime string or timestamp delta <= 90s + coord delta <= 0.15 deg
          const existingBmkg = earthquakes.find((e) => {
            if (item.DateTime && e.id === getCanonicalEventKey("BMKG", item.DateTime, itemTimestamp)) {
              return true;
            }
            const timeDelta = Math.abs(e.timestamp - itemTimestamp);
            const latDelta = Math.abs(e.latitude - coords.lat);
            const lonDelta = Math.abs(e.longitude - coords.lon);
            return timeDelta <= CANONICAL_CORRELATION_THRESHOLDS.bmkgMaxTimeDeltaMs &&
                   latDelta <= CANONICAL_CORRELATION_THRESHOLDS.bmkgMaxCoordDiffDeg &&
                   lonDelta <= CANONICAL_CORRELATION_THRESHOLDS.bmkgMaxCoordDiffDeg;
          });

          if (existingBmkg) {
            // Already represented by canonical event — enrich missing details
            if (!existingBmkg.potensiText && item.Potensi) existingBmkg.potensiText = item.Potensi;
          } else {
            const canonicalId = getCanonicalEventKey("BMKG", item.DateTime, itemTimestamp);
            earthquakes.push({
              id: canonicalId,
              source: "BMKG",
              informationType: "official_event",
              verificationStatus: "official",
              title: `M ${item.Magnitude} - ${item.Wilayah}`,
              magnitude: mag,
              depth: item.Kedalaman || `${depthKm} km`,
              depthKm,
              latitude: coords.lat,
              longitude: coords.lon,
              time: `${item.Tanggal} ${item.Jam}`,
              timestamp: itemTimestamp,
              potensiTsunami: hasTsunami,
              potensiText: item.Potensi,
              isSignificant: mag >= 5.5,
              priorityRadiusKm,
              monitoringRadiusKm,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[Disaster Service] Error fetching BMKG gempaterkini:", err);
  }

  usgsHealth.lastAttemptAt = new Date().toISOString();

  // 3. Fetch USGS Real-time Feed (M4.5+ in the past day or recent significant events)
  try {
    const usgsRes = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      {
        next: { revalidate: 60 },
        headers: { "User-Agent": "SpartaSiaga/1.0" },
      }
    );

    if (usgsRes.ok) {
      const geojson = await usgsRes.json();
      const features = geojson?.features || [];

      for (const feat of features) {
        const [lon, lat, depth] = feat.geometry.coordinates;
        // Region: Indonesia / Southeast Asia (-15 to 12 lat, 90 to 145 lon) or M6.5+ global
        const inRegion = lat >= -15 && lat <= 12 && lon >= 90 && lon <= 145;
        const mag = feat.properties.mag || 0;
        const depthKm = Math.round(depth);
        const usgsTimestamp = feat.properties.time;

        if (inRegion || mag >= 6.5) {
          const { priorityRadiusKm, monitoringRadiusKm } = calculateSpartaMonitoringZone(mag, depthKm);

          // CANONICAL CORRELATION: USGS vs BMKG (Requirement 6)
          // Conservative matching criteria:
          // 1. Time delta <= 15 minutes
          // 2. Epicenter distance <= 100 km
          // 3. Magnitude difference <= 0.6
          const matchingBmkg = earthquakes.find((e) => {
            if (e.source !== "BMKG") return false;
            const timeDeltaMin = Math.abs(e.timestamp - usgsTimestamp) / (60 * 1000);
            if (timeDeltaMin > CANONICAL_CORRELATION_THRESHOLDS.usgsMaxTimeDeltaMinutes) return false;

            const distKm = calculateHaversineDistance(lat, lon, e.latitude, e.longitude);
            if (distKm > CANONICAL_CORRELATION_THRESHOLDS.usgsMaxDistanceKm) return false;

            const magDiff = Math.abs(e.magnitude - mag);
            if (magDiff > CANONICAL_CORRELATION_THRESHOLDS.usgsMaxMagnitudeDiff) return false;

            return true;
          });

          if (matchingBmkg) {
            // Strong match -> Associate to canonical BMKG event, do not create duplicate
            // We preserve BMKG as primary authority, optionally marking external corroboration
            matchingBmkg.verificationStatus = "official";
          } else {
            // Ambiguous or independent event -> Keep separate
            earthquakes.push({
              id: `usgs-${feat.id}`,
              source: "USGS",
              informationType: "official_event",
              verificationStatus: "official_external",
              title: feat.properties.title || `M ${mag} - ${feat.properties.place}`,
              magnitude: mag,
              depth: `${depthKm} km`,
              depthKm,
              latitude: lat,
              longitude: lon,
              time: new Date(feat.properties.time).toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
              }),
              timestamp: usgsTimestamp,
              potensiTsunami: feat.properties.tsunami === 1,
              potensiText: feat.properties.tsunami === 1 ? "Peringatan Tsunami Global Aktif" : undefined,
              isSignificant: mag >= 6.0,
              priorityRadiusKm,
              monitoringRadiusKm,
            });
          }
        }
      }
      usgsHealth.status = "healthy";
      usgsHealth.lastSuccessAt = new Date().toISOString();
      usgsHealth.freshness = "live";
      usgsHealth.error = undefined;
    } else {
      usgsHealth.status = "degraded";
      usgsHealth.error = "Non-200 response";
    }
  } catch (err: any) {
    console.error("[Disaster Service] Error fetching USGS feed:", err);
    usgsHealth.status = "degraded";
    usgsHealth.error = err.message || "Fetch failed";
  }

  // Sort earthquakes by timestamp descending
  earthquakes.sort((a, b) => b.timestamp - a.timestamp);

  // Requirement 4: Persist all processed earthquakes to persistent table asynchronously
  for (const eq of earthquakes) {
    dbUpsertEarthquakeEvent(eq).catch((err) =>
      console.warn("[Disaster Service] Warning persisting earthquake:", err)
    );
  }

  if (earthquakes.length === 0) {
    if (cachedDisasters && cachedDisasters.recentEarthquakes.length > 0) {
      console.log("[Disaster Service] Providers degraded. Using stale cache as last-known-good.");
      bmkgHealth.freshness = "stale";
      usgsHealth.freshness = "stale";
      return {
        ...cachedDisasters,
        dataFreshness: "stale",
        sourcesHealth: [bmkgHealth, usgsHealth],
      };
    } else {
      console.log("[Disaster Service] Providers offline. No cache available.");
      bmkgHealth.freshness = "unavailable";
      usgsHealth.freshness = "unavailable";
      return {
        latestBmkgEarthquake: undefined,
        recentEarthquakes: [],
        activeEarthquakes: [],
        lastUpdated: new Date().toISOString(),
        totalActive: 0,
        dataFreshness: "unavailable",
        sourcesHealth: [bmkgHealth, usgsHealth],
      };
    }
  }

  // Filter active earthquakes: Max 72 hours window for active map monitoring (Requirement 2 & 3)
  const activeWindowMs = 72 * 60 * 60 * 1000; // 72 hours
  const activeEarthquakes = earthquakes.filter((eq) => now - eq.timestamp <= activeWindowMs);

  const response: DisasterFeedResponse = {
    latestBmkgEarthquake: latestBmkgEarthquake || earthquakes[0],
    recentEarthquakes: earthquakes, // all historical/provider context
    activeEarthquakes, // strictly <= 72 hours for operational map and auto-reports
    lastUpdated: new Date().toISOString(),
    totalActive: activeEarthquakes.length,
    dataFreshness: "fresh",
    sourcesHealth: [bmkgHealth, usgsHealth],
  };

  cachedDisasters = response;
  lastFetchTime = now;

  return response;
}

function parseBmkgCoordinates(coordStr?: string, lintang?: string, bujur?: string): { lat: number; lon: number } | null {
  if (coordStr) {
    const parts = coordStr.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lon = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
  }

  if (lintang && bujur) {
    const latVal = parseFloat(lintang.replace(/[^0-9.]/g, ""));
    const lonVal = parseFloat(bujur.replace(/[^0-9.]/g, ""));
    if (!isNaN(latVal) && !isNaN(lonVal)) {
      const finalLat = lintang.toLowerCase().includes("ls") ? -latVal : latVal;
      const finalLon = bujur.toLowerCase().includes("bb") ? -lonVal : lonVal;
      return { lat: finalLat, lon: finalLon };
    }
  }

  return null;
}

function parseDepthToKm(depthStr?: string): number {
  if (!depthStr) return 10;
  const num = parseInt(depthStr.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 10 : num;
}
