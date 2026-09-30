import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const loginUrl = process.env.SPARTA_LOGIN_URL || "http://localhost:5173";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=sso_token_missing", baseUrl));
  }

  const spartaApiUrl = process.env.SPARTA_API_URL || "http://localhost:10000";

  try {
    const exchangeRes = await fetch(`${spartaApiUrl}/v1/sso/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: "siaga", launchToken: token }),
    });

    const exchangeBody = await exchangeRes.json();

    if (!exchangeRes.ok) {
      console.error("[Sparta Siaga SSO] Token exchange failed:", exchangeRes.status, exchangeBody);
      return NextResponse.redirect(new URL("/login?error=sso_exchange_failed", baseUrl));
    }

    const user = exchangeBody?.data?.user;
    const sessionToken = exchangeBody?.data?.sessionToken || token;

    console.log("[Sparta Siaga SSO] Exchange success for user:", user?.email);

    const response = NextResponse.redirect(new URL("/", baseUrl));
    response.cookies.set("siaga_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Sparta Siaga SSO] Error communicating with SPARTA API:", error);
    // If local dev SPARTA API is temporarily offline, allow local dev fallback
    if (process.env.NODE_ENV !== "production") {
      const response = NextResponse.redirect(new URL("/", baseUrl));
      response.cookies.set("siaga_session", `dev-session-${Date.now()}`, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 8 * 60 * 60,
        path: "/",
      });
      return response;
    }
    return NextResponse.redirect(new URL("/login?error=sso_connection_error", baseUrl));
  }
}
