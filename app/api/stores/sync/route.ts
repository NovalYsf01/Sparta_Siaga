import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  syncStoresFromGoogleSheets,
  getLastStoreSyncHistory,
} from "@/lib/google-sheets-sync";
import { getDbPool } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const lastSync = await getLastStoreSyncHistory();

    const pool = getDbPool();
    const countRes = await pool.query("SELECT COUNT(*) as count FROM stores");
    const totalStores = parseInt(countRes.rows[0]?.count || "0", 10);

    return NextResponse.json({
      success: true,
      lastSync,
      totalStores,
    });
  } catch (err: any) {
    console.error("[GET /api/stores/sync]", err);
    return NextResponse.json(
      { error: "Gagal mengambil data riwayat sinkronisasi toko." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized: Sesi login diperlukan." },
        { status: 401 }
      );
    }

    const syncResult = await syncStoresFromGoogleSheets();

    const pool = getDbPool();
    const countRes = await pool.query("SELECT COUNT(*) as count FROM stores");
    const totalStores = parseInt(countRes.rows[0]?.count || "0", 10);

    return NextResponse.json({
      success: true,
      data: syncResult,
      totalStores,
    });
  } catch (err: any) {
    console.error("[POST /api/stores/sync]", err);
    return NextResponse.json(
      { error: err.message || "Gagal melakukan sinkronisasi toko." },
      { status: 500 }
    );
  }
}
