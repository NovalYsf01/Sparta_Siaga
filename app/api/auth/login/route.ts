import { NextResponse } from "next/server";
import { dbGetUserByIdentifier } from "@/lib/user-db";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/jwt";
import { cookies } from "next/headers";
import { getSessionCookieOptions } from "@/lib/session-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "NIK/Username dan Password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await dbGetUserByIdentifier(identifier);

    if (!user) {
      return NextResponse.json(
        { error: "Kredensial tidak valid" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akun tidak aktif, hubungi administrator" },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Akun ini harus login menggunakan SSO Corporate" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Kredensial tidak valid" },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get("user-agent") || null;
    const ipAddress = request.headers.get("x-forwarded-for") || null;

    const { createDeviceSession } = await import("@/lib/session-service");
    const { 
      ACCESS_TOKEN_COOKIE, 
      REFRESH_TOKEN_COOKIE, 
      getAccessTokenCookieOptions, 
      getRefreshTokenCookieOptions 
    } = await import("@/lib/session-config");

    const sessionResult = await createDeviceSession({
      userId: user.id,
      userAgent,
      ipAddress,
      tokenVersion: user.tokenVersion || 1,
    });

    if (!sessionResult) {
      return NextResponse.json(
        { error: "Gagal membuat sesi login perangkat" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true, redirect: "/" });
    response.cookies.set(ACCESS_TOKEN_COOKIE, sessionResult.accessToken, getAccessTokenCookieOptions());
    response.cookies.set(REFRESH_TOKEN_COOKIE, sessionResult.refreshToken, getRefreshTokenCookieOptions());

    try {
      const cookieStore = await cookies();
      cookieStore.set(ACCESS_TOKEN_COOKIE, sessionResult.accessToken, getAccessTokenCookieOptions());
      cookieStore.set(REFRESH_TOKEN_COOKIE, sessionResult.refreshToken, getRefreshTokenCookieOptions());
    } catch {
      // Handled when called outside Next.js request async storage
    }

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
