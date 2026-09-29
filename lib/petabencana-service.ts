export interface PetabencanaReport {
  id: string;
  lat: number;
  lng: number;
  title: string;
  depth: number;
  imageUrl?: string;
  timestamp: string;
}

export async function fetchPetabencanaReports(): Promise<PetabencanaReport[]> {
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
            title: geom.properties.title || "Titik Genangan Banjir (BNPB/Petabencana)",
            depth: geom.properties.report_data?.flood_depth || 10,
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
            title: feature.properties.title || "Titik Genangan Banjir (BNPB/Petabencana)",
            depth: feature.properties.report_data?.flood_depth || 10,
            imageUrl: feature.properties.image_url,
            timestamp: feature.properties.created_at || new Date().toISOString(),
          });
        }
      }
    }
    
    return reports;
  } catch (error) {
    console.error("Petabencana fetch failed", error);
    // Return empty array on failure instead of mock data so it's strictly real data
    return [];
  }
}
