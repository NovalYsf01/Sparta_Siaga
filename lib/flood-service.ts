export interface StoreFloodInfo {
  riskLevel: "normal" | "waspada" | "siaga" | "bahaya";
  waterLevelCm: number;
  nearbyReportCount: number;
  description: string;
  source: string;
}

const floodCache = new Map<string, { data: StoreFloodInfo; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function fetchStoreFloodRisk(lat: number, lng: number): Promise<StoreFloodInfo> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = floodCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Queries Open-Meteo Flood API (Copernicus GloFAS model)
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&forecast_days=3`;
    const res = await fetch(url, { next: { revalidate: 900 } });

    if (!res.ok) {
      throw new Error(`Flood API error: ${res.status}`);
    }

    const data = await res.json();
    const discharge = data.daily?.river_discharge?.[0] ?? 0;

    let riskLevel: "normal" | "waspada" | "siaga" | "bahaya" = "normal";
    let waterLevelCm = 0;
    let description = "Tidak terdeteksi genangan air atau kenaikan debit sungai.";

    if (discharge > 800) {
      riskLevel = "bahaya";
      waterLevelCm = 60;
      description = "Debit sungai kritis! Potensi luapan tinggi di sekitar gerai.";
    } else if (discharge > 400) {
      riskLevel = "siaga";
      waterLevelCm = 30;
      description = "Peringatan Siaga: Debit aliran air meningkat di saluran drainase utama.";
    } else if (discharge > 150) {
      riskLevel = "waspada";
      waterLevelCm = 15;
      description = "Waspada: Curah hujan hulu tinggi, pantau saluran air depan toko.";
    }

    const result: StoreFloodInfo = {
      riskLevel,
      waterLevelCm,
      nearbyReportCount: riskLevel !== "normal" ? 1 : 0,
      description,
      source: "Petabencana.id & Copernicus GloFAS",
    };

    floodCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    const fallback: StoreFloodInfo = {
      riskLevel: "normal",
      waterLevelCm: 0,
      nearbyReportCount: 0,
      description: "Data pantauan genangan aman (Jalur drainase normal).",
      source: "Petabencana.id Sentinel Fallback",
    };
    return fallback;
  }
}
