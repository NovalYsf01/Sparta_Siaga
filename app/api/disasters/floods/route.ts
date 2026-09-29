import { NextResponse } from "next/server";
import { fetchPetabencanaReports } from "@/lib/petabencana-service";

export async function GET() {
  try {
    const reports = await fetchPetabencanaReports();
    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    console.error("Failed to fetch petabencana", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
