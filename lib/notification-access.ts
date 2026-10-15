import { UserContext } from "./report-permissions";

export interface NotificationReadScope {
  branch?: string;
  canViewAllBranches: boolean;
}

export class NotificationScopeError extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = "NotificationScopeError";
  }
}

function normalizeBranch(branch?: string | null): string | undefined {
  const normalized = branch?.trim();
  if (!normalized || normalized.toLowerCase() === "all") return undefined;
  return normalized.toUpperCase();
}

export function resolveNotificationReadScope(
  user: UserContext,
  requestedBranch?: string | null
): NotificationReadScope {
  const isGlobalUser = user.systemRole === "ADMIN" || user.scope === "HO";
  const normalizedRequested = normalizeBranch(requestedBranch);

  if (!isGlobalUser) {
    const userBranch = normalizeBranch(user.branch);
    if (normalizedRequested && userBranch && normalizedRequested !== userBranch) {
      throw new NotificationScopeError("Forbidden: Pengguna cabang hanya dapat mengakses notifikasi cabangnya sendiri.");
    }
    return {
      branch: userBranch || normalizedRequested,
      canViewAllBranches: false,
    };
  }

  return {
    branch: normalizedRequested,
    canViewAllBranches: true,
  };
}

