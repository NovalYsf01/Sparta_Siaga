import { NextResponse } from "next/server";
import { fetchPetabencanaReports } from "@/lib/petabencana-service";

export async function GET() {
  try {
    const result = await fetchPetabencanaReports();
    return NextResponse.json({ success: true, data: result.reports, health: result.health });
  } catch (error: any) {
    console.error("Failed to fetch petabencana", error);
    return NextResponse.json({ success: false, data: [], error: error.message }, { status: 500 });
  }
}
