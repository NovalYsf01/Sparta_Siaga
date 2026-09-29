import { NextResponse } from "next/server";

let cachedRadar: {
  tileUrl: string;
  timestamp: number;
  timeFormatted: string;
  source: string;
} | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export async function GET() {
  const now = Date.now();
  if (cachedRadar && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json({ ...cachedRadar, cached: true });
  }

  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      next: { revalidate: 300 },
      headers: { "User-Agent": "SpartaSiaga/1.0" },
    });

    if (res.ok) {
      const data = await res.json();
      const pastRadars = data?.radar?.past;
      if (Array.isArray(pastRadars) && pastRadars.length > 0) {
        const latest = pastRadars[pastRadars.length - 1];
        const host = data.host || "https://tilecache.rainviewer.com";
        const tileUrl = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;

        const date = new Date(latest.time * 1000);
        const timeFormatted = date.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }) + " WIB";

        cachedRadar = {
          tileUrl,
          timestamp: latest.time,
          timeFormatted,
          source: "RainViewer Open Radar API",
        };
        lastFetchTime = now;

        return NextResponse.json(cachedRadar);
      }
    }

    throw new Error("Invalid response structure from RainViewer");
  } catch (err: any) {
    console.error("[Radar API] Error fetching RainViewer data, using fallback:", err);

    // Fallback timestamp if offline
    const fallbackTileUrl =
      "https://tilecache.rainviewer.com/v2/radar/56c65c998848/256/{z}/{x}/{y}/2/1_1.png";

    return NextResponse.json({
      tileUrl: fallbackTileUrl,
      timestamp: Math.floor(Date.now() / 1000),
      timeFormatted: "Live",
      source: "RainViewer Fallback",
      fallback: true,
    });
  }
}
