import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieOptions } from "@/lib/session-config";
import { getSessionUser } from "@/lib/auth";
import { dbRevokeAllUserSessions } from "@/lib/user-db";

export async function POST(req?: Request) {
  let allDevices = false;

  if (req) {
    try {
      const url = new URL(req.url);
      if (url.searchParams.get("all") === "true") {
        allDevices = true;
      } else {
        const body = await req.json().catch(() => ({}));
        if (body && body.allDevices === true) {
          allDevices = true;
        }
      }
    } catch {
      // Ignored: fallback to standard single-device logout
    }
  }

  // If all-devices logout requested, revoke token version in database
  if (allDevices) {
    const session = await getSessionUser(req);
    if (session?.id) {
      await dbRevokeAllUserSessions(session.id);
    }
  }

  const response = NextResponse.json({ success: true, allDevices });
  response.cookies.set("siaga_session", "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set("siaga_session", "", {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });
  } catch {
    // Handled when called outside requestAsyncStorage
  }

  return response;
}

