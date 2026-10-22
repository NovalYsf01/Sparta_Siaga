import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { processReportLifecycles } from "@/lib/report-lifecycle-service";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    
    // Internal secret or admin authorization check
    const authHeader = request.headers.get("authorization");
    const internalSecret = process.env.SPARTA_INTERNAL_WORKER_SECRET;
    const isInternalAuth = Boolean(internalSecret && authHeader === `Bearer ${internalSecret}`);
    const isAdmin = sessionUser?.systemRole === "ADMIN";

    if (!isInternalAuth && !isAdmin) {
      // In dev or test environments, allow local invocation
      const isDevOrTest = process.env.NODE_ENV !== "production";
      if (!isDevOrTest) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    const { searchParams } = new URL(request.url);
    const simulatedNowParam = (body.simulatedNow as string) || searchParams.get("simulatedNow");
    const includeTestIds = Boolean(body.includeTestIds || searchParams.get("includeTestIds") === "true");

    const now = simulatedNowParam ? new Date(simulatedNowParam) : new Date();
    const result = await processReportLifecycles({
      now,
      includeTestIds,
    });

    return NextResponse.json({
      success: true,
      message: "Proses lifecycle dan kedaluwarsa laporan berhasil dijalankan.",
      data: result,
    });
  } catch (error) {
    console.error("[POST /api/incidents/expiration] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses kedaluwarsa laporan otomatis." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
