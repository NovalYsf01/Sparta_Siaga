import { NextResponse } from "next/server";
import { Store } from "@/types/store";
import fs from "fs/promises";
import path from "path";

let cachedStores: Store[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours server-side cache

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";
  const branchFilter = searchParams.get("branch");

  const now = Date.now();
  if (!forceRefresh && cachedStores && now - lastCacheTime < CACHE_TTL_MS) {
    let result = cachedStores;
    if (branchFilter && branchFilter !== "all") {
      result = cachedStores.filter(
        (s) => s.cabang.toLowerCase() === branchFilter.toLowerCase()
      );
    }
    return NextResponse.json({
      data: result,
      count: result.length,
      totalLoaded: cachedStores.length,
      source: "cache",
      cachedAt: new Date(lastCacheTime).toISOString(),
    });
  }

  try {
    const sanitizedStores: Store[] = [];
    const masterCsvPath = path.join(process.cwd(), "data", "stores-master.csv");
    let hasReadMasterCsv = false;

    // 1. Try reading real master CSV (21,550 stores)
    try {
      const csvBuffer = await fs.readFile(masterCsvPath, "utf-8");
      const lines = csvBuffer.split(/\r?\n/);
      let headerPassed = false;

      for (const line of lines) {
        if (!line.trim()) continue;
        if (!headerPassed) {
          headerPassed = true;
          continue;
        }

        const parts = parseCSVLine(line);
        if (parts.length >= 5) {
          const branch = parts[0].trim();
          const kode = parts[1].trim();
          const rawName = parts[2].trim().replace(/^"|"$/g, "");
          const fr = parts[3].trim().toUpperCase();
          const coordStr = parts[4].trim().replace(/^"|"$/g, "");

          // Parse coordinates (supports space or comma separation)
          const coords = coordStr.split(/[\s,]+/);
          const lat = parseFloat(coords[0]);
          const lon = parseFloat(coords[1]);

          // Validate coordinates within Indonesian bounds (-15 to 10 lat, 90 to 145 lon)
          if (
            !isNaN(lat) &&
            !isNaN(lon) &&
            lat >= -15 &&
            lat <= 10 &&
            lon >= 90 &&
            lon <= 145
          ) {
            sanitizedStores.push({
              id: `SAT-${kode}`,
              kode_toko: kode,
              nama_toko: rawName || `Alfamart ${kode}`,
              cabang: branch || "Nasional",
              alamat: `Alfamart ${rawName || kode}, Area Cabang ${branch}`,
              latitude: lat,
              longitude: lon,
              fr_type: fr === "F" ? "F" : "R",
              branch_emergency_contact: `Duty Officer DC Cabang ${branch}`,
              status: "safe",
            });
          }
        }
      }

      if (sanitizedStores.length > 0) {
        hasReadMasterCsv = true;
        console.log(
          `[Stores API] Successfully parsed ${sanitizedStores.length} stores from stores-master.csv`
        );
      }
    } catch (csvErr) {
      console.warn(
        "[Stores API] stores-master.csv not accessible or failed, checking fallback:",
        csvErr
      );
    }

    // 2. Fallback to stores-fallback.json if master CSV not available
    if (!hasReadMasterCsv || sanitizedStores.length === 0) {
      const fallbackPath = path.join(process.cwd(), "data", "stores-fallback.json");
      const fallbackContent = await fs.readFile(fallbackPath, "utf-8");
      const rawFallback = JSON.parse(fallbackContent);

      for (const item of rawFallback) {
        const lat =
          typeof item.latitude === "number"
            ? item.latitude
            : parseFloat(item.latitude);
        const lon =
          typeof item.longitude === "number"
            ? item.longitude
            : parseFloat(item.longitude);

        if (
          !isNaN(lat) &&
          !isNaN(lon) &&
          lat >= -15 &&
          lat <= 15 &&
          lon >= 90 &&
          lon <= 145
        ) {
          sanitizedStores.push({
            id: item.id || `SAT-${item.kode_toko}`,
            kode_toko: String(item.kode_toko || "").trim(),
            nama_toko: String(item.nama_toko || "Alfamart").trim(),
            cabang: String(item.cabang || "Nasional").trim(),
            alamat: String(item.alamat || "").trim(),
            latitude: lat,
            longitude: lon,
            fr_type: item.fr_type || "R",
            branch_emergency_contact: `Duty Officer DC Cabang ${item.cabang || "Nasional"}`,
            status: "safe",
          });
        }
      }
    }

    cachedStores = sanitizedStores;
    lastCacheTime = now;

    let result = sanitizedStores;
    if (branchFilter && branchFilter !== "all") {
      result = sanitizedStores.filter(
        (s) => s.cabang.toLowerCase() === branchFilter.toLowerCase()
      );
    }

    return NextResponse.json({
      data: result,
      count: result.length,
      totalLoaded: sanitizedStores.length,
      source: "fresh",
      cachedAt: new Date(lastCacheTime).toISOString(),
    });
  } catch (error: any) {
    console.error("[Stores API] Critical error loading stores:", error);
    return NextResponse.json(
      { error: "Gagal memuat data toko master", details: error?.message },
      { status: 500 }
    );
  }
}
