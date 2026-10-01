import { SourceHealth } from "@/types/disaster";

export interface PetabencanaReport {
  id: string;
  lat: number;
  lng: number;
  title: string;
  depth?: number | null;
  imageUrl?: string;
  timestamp: string;
}

export interface PetabencanaResult {
  reports: PetabencanaReport[];
  health: SourceHealth;
}

export async function fetchPetabencanaReports(): Promise<PetabencanaResult> {
  const now = new Date().toISOString();
  try {
    // We'll use a mocked fallback since Petabencana API structure might be complex
    // Or we can try to fetch from their public API:
    const res = await fetch("https://data.petabencana.id/reports", {
      next: { revalidate: 300 },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Petabencana API error: ${res.status}`);
    }

    const data = await res.json();
    const reports: PetabencanaReport[] = [];
    
    // Petabencana returns TopoJSON format usually under result.objects.output.geometries
    if (data?.result?.objects?.output?.geometries) {
      for (const geom of data.result.objects.output.geometries) {
        if (geom.properties && geom.properties.disaster_type === "flood") {
          // In TopoJSON point geometries, coordinates might be direct
          const coords = geom.coordinates || [0, 0];
          reports.push({
            id: geom.properties.pkey || Math.random().toString(),
            lat: coords[1],
            lng: coords[0],
            title: geom.properties.title || "Laporan Banjir Lapangan (PetaBencana)",
            depth: geom.properties.report_data?.flood_depth || null,
            imageUrl: geom.properties.image_url,
            timestamp: geom.properties.created_at || new Date().toISOString(),
          });
        }
      }
    } else if (data?.result?.features) {
      // Fallback if it returns GeoJSON format directly
      for (const feature of data.result.features) {
        if (feature.properties && feature.properties.disaster_type === "flood") {
          reports.push({
            id: feature.properties.pkey || Math.random().toString(),
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            title: feature.properties.title || "Laporan Banjir Lapangan (PetaBencana)",
            depth: feature.properties.report_data?.flood_depth || null,
            imageUrl: feature.properties.image_url,
            timestamp: feature.properties.created_at || new Date().toISOString(),
          });
        }
      }
    }
    
    return {
      reports,
      health: {
        source: "PetaBencana",
        status: "healthy",
        freshness: "live",
        lastAttemptAt: now,
        lastSuccessAt: now,
      },
    };
  } catch (error: any) {
    console.error("Petabencana fetch failed", error);
    // Return empty array on failure but distinctly mark it as offline/unavailable
    return {
      reports: [],
      health: {
        source: "PetaBencana",
        status: "offline",
        freshness: "unavailable",
        lastAttemptAt: now,
        error: error.message || "Fetch failed",
      },
    };
  }
}
