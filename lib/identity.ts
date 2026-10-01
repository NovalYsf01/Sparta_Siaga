import { getSessionUser } from "./auth";
import { SpartaRole } from "@/types/incident";

export interface UserIdentity {
  userId: string;
  nik: string;
  name: string;
  role: SpartaRole;
  branch: string;
  position?: string;
}

/**
 * Resolves the current user's identity.
 * In a fully integrated environment, this would call a centralized authentication service
 * or decode a verified JWT from SSO. For now, it derives identity from the development session
 * while exposing a robust, production-ready interface.
 */
export async function resolveCurrentUserIdentity(): Promise<UserIdentity | null> {
  try {
    const session = await getSessionUser();
    
    if (!session) {
      return null;
    }

    // Mapping session to the strict UserIdentity interface
    return {
      userId: session.id || `usr_${Date.now()}`,
      nik: (session as any).nik || "000000000",
      name: session.name || `User ${session.role.toUpperCase()}`,
      role: session.role as SpartaRole,
      branch: session.branch || "HO",
      position: (session as any).position || (session.role.includes("ho") ? "Staff Head Office" : "Staff Cabang"),
    };
  } catch (error) {
    console.error("[Identity Service] Failed to resolve user identity:", error);
    return null;
  }
}
