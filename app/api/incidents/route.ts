import { NextResponse } from "next/server";
import { dbGetAllIncidents, dbCreateIncident } from "@/lib/incident-db";
import { IncidentRecord } from "@/types/incident";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incidents = await dbGetAllIncidents();

    // Role-based filtering
    const isHoAdmin = ["ho_admin", "gm_ho", "sm_ho"].includes(sessionUser.role);
    const filteredIncidents = incidents.map(inc => {
      // HO sees all
      if (isHoAdmin) return inc;
      
      // Branch sees only matching branch
      const isAffected = inc.branch.trim().toLowerCase() === sessionUser.branch.trim().toLowerCase();
      if (isAffected) return inc;

      // Unaffected branch: must not access actionable report data for another branch
      // Returning a stripped down version for awareness, or filtering it out completely.
      // Instruction says: "Unaffected branch: no actionable details for unrelated report"
      // Wait, is it better to just filter them out completely? 
      // "Affected Branch: can view reports within permitted branch/scope"
      // "Unaffected branch: must not access actionable report data for another branch"
      // If we strip actionable data, we must create a type for that. Easier to just omit them from the main incident list.
      // Let's filter them out completely to be safe. If they need awareness, they have the notifications feed.
      return null;
    }).filter(Boolean) as IncidentRecord[];

    return NextResponse.json({ data: filteredIncidents });
  } catch (err) {
    console.error("[GET /api/incidents]", err);
    return NextResponse.json(
      { error: "Gagal memuat data laporan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: IncidentRecord = await request.json();
    if (!body.id || !body.disasterType || !body.storeId) {
      return NextResponse.json(
        { error: "Data laporan tidak lengkap (id, disasterType, storeId wajib diisi)" },
        { status: 400 }
      );
    }

    const isHoAdmin = ["ho_admin", "gm_ho", "sm_ho"].includes(sessionUser.role);
    if (!isHoAdmin) {
      if (body.branch.trim().toLowerCase() !== sessionUser.branch.trim().toLowerCase()) {
        return NextResponse.json(
          { error: "Unauthorized: Tidak dapat membuat laporan untuk cabang lain" },
          { status: 403 }
        );
      }
    }

    const created = await dbCreateIncident(body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/incidents]", err);
    return NextResponse.json(
      { error: "Gagal membuat laporan baru" },
      { status: 500 }
    );
  }
}
