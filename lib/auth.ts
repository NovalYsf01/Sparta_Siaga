import { cookies } from "next/headers";
import { UserContext } from "./report-permissions";
import { SpartaRole } from "@/types/incident";
import { dbGetUserById, dbUpsertUser } from "./user-db";
import { verifySession } from "./jwt";

/**
 * SPARTA SIAGA — Trusted Server-Side Identity Helper
 * 
 * Extracts authenticated user context from the active session.
 * Database is the single source of truth for authorization.
 */
export async function getSessionUser(req?: Request): Promise<UserContext | null> {
  let sessionToken: string | undefined;

  if (req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/siaga_session=([^;]+)/);
    if (match) {
      sessionToken = match[1];
    }
  }

  if (!sessionToken) {
    try {
      const cookieStore = await cookies();
      sessionToken = cookieStore.get("siaga_session")?.value;
    } catch {
      // Handled when called outside Next.js requestAsyncStorage
    }
  }

  if (!sessionToken) {
    return null;
  }

  // Verify the JWT token
  const payload = await verifySession(sessionToken);
  if (!payload || !payload.id) {
    return null;
  }

  // Fetch the latest user record directly from database (Source of Truth)
  const dbUser = await dbGetUserById(payload.id);

  if (!dbUser || dbUser.status === "INACTIVE") {
    console.warn("[Auth] User is missing or inactive in Siaga DB:", payload.id);
    return null;
  }

  // Multi-device session revocation check: if user's token version was bumped, old tokens are invalidated
  if (dbUser.tokenVersion && payload.v && payload.v < dbUser.tokenVersion) {
    console.warn(`[Auth] User ${dbUser.id} session revoked (token version ${payload.v} < ${dbUser.tokenVersion})`);
    return null;
  }

  // Deactivated roles: bmc, bec, tim_toko, bbs, bbc, rekanan are denied from operational / application access
  const DEACTIVATED_BUSINESS_ROLES = ["bmc", "bec", "tim_toko", "bbs", "bbc", "rekanan"];
  if (dbUser.businessRole && DEACTIVATED_BUSINESS_ROLES.includes(dbUser.businessRole.toLowerCase())) {
    console.warn(`[Auth] User ${dbUser.id} belongs to deactivated role '${dbUser.businessRole}'. Access denied.`);
    return null;
  }

  const isSystemAdmin = dbUser.systemRole === "ADMIN";

  return {
    id: dbUser.id,
    name: dbUser.name,
    nik: dbUser.nik,
    avatarUrl: dbUser.avatarUrl || null,
    role: isSystemAdmin ? null : dbUser.businessRole,
    systemRole: dbUser.systemRole,
    scope: isSystemAdmin ? null : dbUser.scope,
    branch: isSystemAdmin ? null : dbUser.branch,
  };
}
