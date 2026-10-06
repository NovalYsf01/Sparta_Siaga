import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_development_secret_sparta_siaga"
);

export const SESSION_VERSION = 2;

export interface SessionPayload {
  id: string;
  nik?: string | null;
  systemRole?: string;
  v?: number;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const jwt = await new SignJWT({
    id: payload.id,
    nik: payload.nik,
    systemRole: payload.systemRole,
    v: payload.v || SESSION_VERSION,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
  return jwt;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}
