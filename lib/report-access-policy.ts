import type { IncidentRecord } from "@/types/incident";
import type { UserContext } from "./report-permissions";
import { canViewReport } from "./report-permissions";
import { canViewReportAsync } from "./permission-service";

const HO_POST_APPROVAL_STATUSES = [
  "confirmed_affected",
  "confirmed_safe",
  "in_estimation",
  "awaiting_spk",
  "spk_issued",
  "in_maintenance",
  "in_construction",
  "awaiting_st",
  "pending_final_approval",
  "approved_pending_close",
  "revision_requested",
  "resolved",
  "closed",
  "archived",
] as const;

export function canAccessReport(user: UserContext, report: IncidentRecord): boolean {
  return canViewReport(user, report);
}

export async function canAccessReportAsync(user: UserContext, report: IncidentRecord): Promise<boolean> {
  return canViewReportAsync(user, report);
}

export function getReportAccessSql(
  user: Pick<UserContext, "systemRole" | "scope" | "branch">,
  alias = "incidents",
  firstParameter = 1
): { clause: string; values: unknown[] } {
  if (user.systemRole === "ADMIN") return { clause: "TRUE", values: [] };

  if (user.scope === "HO") {
    return {
      clause: `(
        ${alias}.report_origin = 'automatic_earthquake'
        OR (${alias}.verification->'bmApproval'->>'decision') IN ('approved', 'safe')
        OR ${alias}.status = ANY($${firstParameter}::text[])
      )`,
      values: [[...HO_POST_APPROVAL_STATUSES]],
    };
  }

  const branch = user.branch?.trim();
  if (!branch) return { clause: "FALSE", values: [] };
  return {
    clause: `LOWER(TRIM(${alias}.branch)) = LOWER(TRIM($${firstParameter}))`,
    values: [branch],
  };
}
