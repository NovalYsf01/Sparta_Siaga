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
export async function getSessionUser(): Promise<UserContext | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("siaga_session")?.value;

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
