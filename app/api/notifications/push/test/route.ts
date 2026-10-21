import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = getDbPool();
    const subsRes = await pool.query(
      `SELECT * FROM user_push_subscriptions WHERE user_id = $1`,
      [sessionUser.id]
    );

    return NextResponse.json({
      success: true,
      registeredSubscriptionsCount: subsRes.rows.length,
      pushSent: false,
      testType: "subscription_inventory_only",
      user: sessionUser.name,
      message: subsRes.rows.length > 0
        ? "Subscription terdaftar, tetapi belum ada pengiriman native Web Push pada pemeriksaan ini."
        : "Belum ada push subscription aktif. Pemeriksaan ini tidak mengirim push ke perangkat.",
      subscriptions: subsRes.rows.map((r) => ({
        id: r.id,
        endpoint: r.endpoint.slice(0, 32) + "...",
        createdAt: r.created_at,
      })),
    });
  } catch (err: unknown) {
    console.error("[POST /api/notifications/push/test]", err);
    return NextResponse.json({ error: "Gagal memeriksa status push." }, { status: 500 });
  }
}
