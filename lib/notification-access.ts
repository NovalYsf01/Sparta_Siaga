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
  // BUSINESS REQUIREMENT (Global Disaster Information):
  // Disaster notifications are informational and available to all authenticated
  // SPARTA SIAGA users (HO, System Admin, and Branch users across different branches).
  // They must NOT be filtered solely by the user's assigned branch.
  // An optional branch parameter can be supplied if the user/client explicitly requests
  // to filter or drill down into a specific branch's affected stores.
  return {
    branch: normalizeBranch(requestedBranch),
    canViewAllBranches: true,
  };
}

