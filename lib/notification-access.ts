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
  const canViewAllBranches = user.systemRole === "ADMIN" || user.scope === "HO";

  if (canViewAllBranches) {
    return {
      branch: normalizeBranch(requestedBranch),
      canViewAllBranches: true,
    };
  }

  if (user.scope !== "BRANCH") {
    throw new NotificationScopeError("User tidak memiliki scope notification yang valid.");
  }

  const sessionBranch = normalizeBranch(user.branch);
  if (!sessionBranch) {
    throw new NotificationScopeError("Branch user tidak memiliki branch aktif.");
  }

  return {
    branch: sessionBranch,
    canViewAllBranches: false,
  };
}
