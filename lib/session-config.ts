export const ACCESS_TOKEN_COOKIE = "siaga_session";
export const REFRESH_TOKEN_COOKIE = "siaga_refresh";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
}

export function getSessionCookieOptions(env: NodeJS.ProcessEnv = process.env): SessionCookieOptions {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  };
}

export function getAccessTokenCookieOptions(env: NodeJS.ProcessEnv = process.env): SessionCookieOptions {
  return {
    ...getSessionCookieOptions(env),
    maxAge: ACCESS_TOKEN_MAX_AGE,
  };
}

export function getRefreshTokenCookieOptions(env: NodeJS.ProcessEnv = process.env): SessionCookieOptions {
  return {
    ...getSessionCookieOptions(env),
    maxAge: REFRESH_TOKEN_MAX_AGE,
  };
}
