import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

let tableEnsured = false;

async function ensurePushSubscriptionTable() {
  if (tableEnsured) return;
  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_push_subscriptions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      branch VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_push_sub_user ON user_push_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_push_sub_branch ON user_push_subscriptions(branch);
  `);
  tableEnsured = true;
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized: Sesi diperlukan." }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Payload push subscription tidak valid (endpoint, p256dh, auth wajib ada)." },
        { status: 400 }
      );
    }

    await ensurePushSubscriptionTable();
    const pool = getDbPool();

    const subId = `sub_${sessionUser.id}_${Buffer.from(endpoint).toString("base64url").slice(0, 16)}`;
    const userAgent = request.headers.get("user-agent") || null;

    await pool.query(
      `INSERT INTO user_push_subscriptions (
        id, user_id, endpoint, p256dh, auth, user_agent, branch, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        branch = EXCLUDED.branch,
        updated_at = NOW()`,
      [subId, sessionUser.id, endpoint, keys.p256dh, keys.auth, userAgent, sessionUser.branch || null]
    );

    return NextResponse.json({
      success: true,
      message: "Push subscription berhasil didaftarkan.",
      data: {
        subscriptionId: subId,
        userId: sessionUser.id,
      },
    });
  } catch (err: unknown) {
    console.error("[POST /api/notifications/push/subscribe]", err);
    return NextResponse.json({ error: "Gagal menyimpan subscription push." }, { status: 500 });
  }
}
