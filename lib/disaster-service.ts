import { Earthquake, DisasterFeedResponse, SourceHealth, DataFreshness } from "@/types/disaster";
import { calculateBmkgImpactRadius } from "./haversine";

// Cache in-memory for 1 minute
let cachedDisasters: DisasterFeedResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds for BMKG auto

let bmkgHealth: SourceHealth = { source: "BMKG", status: "offline", lastAttemptAt: new Date().toISOString(), freshness: "unavailable" };
let usgsHealth: SourceHealth = { source: "USGS", status: "offline", lastAttemptAt: new Date().toISOString(), freshness: "unavailable" };

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
          const { dangerRadiusKm, warningRadiusKm } = calculateBmkgImpactRadius(mag, depthKm);
          const hasTsunami = (g.Potensi || "").toLowerCase().includes("tsunami") && 
                             !(g.Potensi || "").toLowerCase().includes("tidak berpotensi");

          latestBmkgEarthquake = {
            id: `bmkg-auto-${g.DateTime || Date.now()}`,
            source: "BMKG",
            informationType: "official_event",
            verificationStatus: "official",
            title: `M ${g.Magnitude} - ${g.Wilayah}`,
            magnitude: mag,
            depth: g.Kedalaman || "10 km",
            depthKm,
            latitude: coords.lat,
            longitude: coords.lon,
            time: `${g.Tanggal} ${g.Jam}`,
            timestamp: g.DateTime ? new Date(g.DateTime).getTime() : Date.now(),
            potensiTsunami: hasTsunami,
            potensiText: g.Potensi,
            feltArea: g.Dirasakan,
            shakemapUrl: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : undefined,
            isSignificant: true,
            dangerRadiusKm,
            warningRadiusKm,
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
          const { dangerRadiusKm, warningRadiusKm } = calculateBmkgImpactRadius(mag, depthKm);
          const hasTsunami = (item.Potensi || "").toLowerCase().includes("tsunami") && 
                             !(item.Potensi || "").toLowerCase().includes("tidak berpotensi");

          // Avoid duplicating latestBmkgEarthquake if same coordinate/time
          const isDuplicate = earthquakes.some(
            (e) => Math.abs(e.latitude - coords.lat) < 0.01 && Math.abs(e.longitude - coords.lon) < 0.01
          );

          if (!isDuplicate) {
            earthquakes.push({
              id: `bmkg-list-${item.DateTime || Math.random()}`,
              source: "BMKG",
              informationType: "official_event",
              verificationStatus: "official",
              title: `M ${item.Magnitude} - ${item.Wilayah}`,
              magnitude: mag,
              depth: item.Kedalaman || "10 km",
              depthKm,
              latitude: coords.lat,
              longitude: coords.lon,
              time: `${item.Tanggal} ${item.Jam}`,
              timestamp: item.DateTime ? new Date(item.DateTime).getTime() : Date.now(),
              potensiTsunami: hasTsunami,
              potensiText: item.Potensi,
              isSignificant: mag >= 5.5,
              dangerRadiusKm,
              warningRadiusKm,
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
        // Filter events around Indonesia / Southeast Asia region (-15 to 10 lat, 90 to 145 lon)
        // or significant global events (M6.0+)
        const inRegion = lat >= -15 && lat <= 12 && lon >= 90 && lon <= 145;
        const mag = feat.properties.mag || 0;
        const depthKm = Math.round(depth);
        const { dangerRadiusKm, warningRadiusKm } = calculateBmkgImpactRadius(mag, depthKm);

        if (inRegion || mag >= 6.5) {
          const isDuplicate = earthquakes.some(
            (e) => Math.abs(e.latitude - lat) < 0.05 && Math.abs(e.longitude - lon) < 0.05
          );

          if (!isDuplicate) {
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
              timestamp: feat.properties.time,
              potensiTsunami: feat.properties.tsunami === 1,
              potensiText: feat.properties.tsunami === 1 ? "Peringatan Tsunami Global Aktif" : undefined,
              isSignificant: mag >= 6.0,
              dangerRadiusKm,
              warningRadiusKm,
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

  if (earthquakes.length === 0) {
    // If we have cached data, use it as stale, otherwise unavailable
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
        lastUpdated: new Date().toISOString(),
        totalActive: 0,
        dataFreshness: "unavailable",
        sourcesHealth: [bmkgHealth, usgsHealth],
      };
    }
  }

  // Sort earthquakes by timestamp descending
  earthquakes.sort((a, b) => b.timestamp - a.timestamp);

  const response: DisasterFeedResponse = {
    latestBmkgEarthquake: latestBmkgEarthquake || earthquakes[0],
    recentEarthquakes: earthquakes,
    lastUpdated: new Date().toISOString(),
    totalActive: earthquakes.length,
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
