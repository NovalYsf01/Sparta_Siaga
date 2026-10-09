import { NextResponse } from "next/server";
import { searchCanonicalBranches } from "@/lib/branch-service";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const branches = await searchCanonicalBranches(q);
    return NextResponse.json({ data: branches });
  } catch (err) {
    console.error("[GET /api/branches]", err);
    return NextResponse.json({ error: "Gagal memuat data cabang" }, { status: 500 });
  }
}
