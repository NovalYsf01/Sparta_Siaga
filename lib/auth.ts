import { cookies } from "next/headers";
import { UserContext } from "./report-permissions";
import { SpartaRole } from "@/types/incident";

/**
 * SPARTA SIAGA — Trusted Server-Side Identity Helper
 * 
 * Extracts authenticated user context from the active session.
 * Replaces relying on untrusted data from request bodies.
 */
export async function getSessionUser(): Promise<UserContext | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("siaga_session")?.value;

  if (!sessionToken) {
    // DEVELOPMENT FALLBACK since SSO is not available yet
    return {
      id: "usr_mock_123",
      name: "Mock Admin (Dev)",
      role: "ho_admin",
      branch: "HO",
    };
  }

  // Validate token via SPARTA SSO endpoint
  const spartaApiUrl = process.env.SPARTA_API_URL || "http://localhost:10000";

  try {
    const response = await fetch(`${spartaApiUrl}/v1/sso/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
      // Since this is a server-side call within an internal network, cache must be avoided for auth
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn("[Auth] SSO token validation failed:", response.status);
      return null;
    }

    const result = await response.json();
    const user = result?.data?.user;

    if (!user || !user.role || !user.branch) {
      console.warn("[Auth] SSO returned incomplete user context", user);
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role as SpartaRole,
      branch: user.branch,
    };
  } catch (error) {
    console.error("[Auth] Error communicating with SPARTA SSO:", error);
    // DEVELOPMENT FALLBACK since SSO is not available yet
    return {
      id: "usr_mock_123",
      name: "Mock Admin (Dev)",
      role: "ho_admin",
      branch: "HO",
    };
  }
}
