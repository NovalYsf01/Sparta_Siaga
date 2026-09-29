import { NextResponse } from "next/server";
import { fetchDisasterFeed } from "@/lib/disaster-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    const data = await fetchDisasterFeed(refresh);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Disasters] Error fetching disaster feed:", error);
    return NextResponse.json(
      { error: "Gagal memuat data bencana", details: error?.message },
      { status: 500 }
    );
  }
}
