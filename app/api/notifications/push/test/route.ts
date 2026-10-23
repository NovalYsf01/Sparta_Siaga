import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import { 
  sendSinglePushNotification, 
  ensurePushSubscriptionTable,
  PushSubscriptionRecord,
  PushDeliveryOutcome 
} from "@/lib/web-push-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya Administrator yang dapat mengakses diagnostik push notification." },
        { status: 403 }
      );
    }

    await ensurePushSubscriptionTable();
    const pool = getDbPool();
    const subsRes = await pool.query<PushSubscriptionRecord>(
      `SELECT * FROM user_push_subscriptions WHERE user_id = $1`,
      [sessionUser.id]
    );

    const body = await request.json().catch(() => ({}));
    const shouldDispatch = body.dispatch === true;

    if (!shouldDispatch) {
      // Diagnostic mode: Inventory inspection
      return NextResponse.json({
        success: true,
        registeredSubscriptionsCount: subsRes.rows.length,
        pushSent: false,
        testType: "subscription_inventory_only",
        user: sessionUser.name,
        message: subsRes.rows.length > 0
          ? `${subsRes.rows.length} subscription terdaftar. Kirim { dispatch: true } untuk menguji pengiriman live push.`
          : "Belum ada push subscription aktif untuk akun ini.",
        subscriptions: subsRes.rows.map((r) => ({
          id: r.id,
          endpoint: r.endpoint.slice(0, 32) + "...",
          deviceType: r.device_type,
          lastSuccessAt: r.last_success_at,
          failureCount: r.failure_count,
          createdAt: r.created_at,
        })),
      });
    }

    // Diagnostic mode: Live Web Push delivery to calling admin's devices
    if (subsRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Tidak dapat mengirim test push: belum ada subscription aktif pada browser ini.",
        attempted: 0,
        delivered: 0,
      }, { status: 400 });
    }

    const outcomes: PushDeliveryOutcome[] = [];
    const testPayload = {
      title: "🔔 SPARTA SIAGA — Test Web Push",
      body: `Pengujian Web Push real-time untuk ${sessionUser.name} (${new Date().toLocaleTimeString("id-ID")}).`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `test-push-${Date.now()}`,
      url: "/monitoring",
      urgency: 'high' as const,
      timestamp: new Date().toISOString(),
    };

    for (const sub of subsRes.rows) {
      const outcome = await sendSinglePushNotification(sub, testPayload);
      outcomes.push(outcome);
    }

    const deliveredCount = outcomes.filter(o => o.success).length;

    return NextResponse.json({
      success: deliveredCount > 0,
      pushSent: true,
      testType: "live_web_push_dispatch",
      attempted: outcomes.length,
      delivered: deliveredCount,
      failed: outcomes.length - deliveredCount,
      outcomes,
      message: deliveredCount > 0
        ? `Berhasil mengirim ${deliveredCount} test push notification.`
        : "Gagal mengirim test push notification ke perangkat terdaftar.",
    });
  } catch (err: unknown) {
    console.error("[POST /api/notifications/push/test]", err);
    return NextResponse.json({ error: "Gagal menjalankan diagnostik push." }, { status: 500 });
  }
}
