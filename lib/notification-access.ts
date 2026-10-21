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
  // Disaster notifications are national read-only information for every authenticated
  // user who has NOTIFICATION_VIEW. Operational incident access remains branch-scoped.
  void user;
  return {
    branch: normalizeBranch(requestedBranch),
    canViewAllBranches: true,
  };
}

