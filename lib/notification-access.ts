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

  // Notifikasi peringatan bencana bersifat informasi siaga nasional
  // Seluruh peran operasional dapat melihat feed notifikasi tanpa error blokir 403
  if (isGlobalUser) {
    return {
      branch: normalizedRequested,
      canViewAllBranches: true,
    };
  }

  // Pengguna cabang: jika filter spesifik diminta, gunakan filter tersebut.
  // Jika tidak, tampilkan peringatan cabang atau feed bencana nasional secara aman.
  return {
    branch: normalizedRequested || normalizeBranch(user.branch),
    canViewAllBranches: !normalizedRequested,
  };
}

