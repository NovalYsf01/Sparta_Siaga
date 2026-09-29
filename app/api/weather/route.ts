import { NextResponse } from "next/server";
import { fetchStoreWeather } from "@/lib/weather-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lon = parseFloat(searchParams.get("lon") || "");
  const id = searchParams.get("id") || "store";
  const name = searchParams.get("name") || "Toko Alfamart";

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "Koordinat latitude dan longitude wajib berupa angka" },
      { status: 400 }
    );
  }

  try {
    const weather = await fetchStoreWeather(id, name, lat, lon);
    return NextResponse.json(weather);
  } catch (error: any) {
    console.error("[API Weather] Error fetching store weather:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data cuaca", details: error?.message },
      { status: 500 }
    );
  }
}
