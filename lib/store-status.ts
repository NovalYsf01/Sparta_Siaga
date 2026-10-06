import { SpatialRisk, OperationalStatus, MapVisualStatus } from "@/types/store";
import { IncidentRecord } from "@/types/incident";

/**
 * Derives the two-dimensional spatial risk and operational status,
 * and produces the unified map visual presentation status.
 * 
 * Rules:
 * 1. Operational status has visual priority over spatial risk.
 * 2. Visual Status:
 *    - NORMAL: no active report + spatial SAFE
 *    - PERLU_PERHATIAN: spatial MONITOR / PRIORITY_MONITOR, or report NEED_CONFIRMATION
 *    - TERDAMPAK: field-confirmed affected
 *    - DALAM_PENANGANAN: estimation, ready_for_work, or in_progress
 *    - SELESAI: work_completed, resolved, or confirmed_safe
 */
export function deriveStoreStatuses(
  spatialRisk: SpatialRisk,
  incident?: IncidentRecord
): {
  operationalStatus: OperationalStatus;
  visualStatus: MapVisualStatus;
} {
  let operationalStatus: OperationalStatus = "NONE";

  if (incident) {
    switch (incident.status) {
      case "pending_confirmation":
      case "verifying":
        operationalStatus = "NEED_CONFIRMATION";
        break;
      case "confirmed_affected":
        operationalStatus = "CONFIRMED_AFFECTED";
        break;
      case "in_estimation":
        operationalStatus = "ESTIMATION";
        break;
      case "awaiting_spk":
      case "spk_issued":
        operationalStatus = "READY_FOR_WORK";
        break;
      case "in_maintenance":
      case "in_construction":
      case "investigating":
        operationalStatus = "IN_PROGRESS";
        break;
      case "awaiting_st":
        operationalStatus = "WORK_COMPLETED";
        break;
      case "confirmed_safe":
      case "resolved":
      case "archived":
        operationalStatus = "RESOLVED";
        break;
      default:
        operationalStatus = "NONE";
    }
  }

  let visualStatus: MapVisualStatus = "NORMAL";

  if (
    operationalStatus === "ESTIMATION" ||
    operationalStatus === "READY_FOR_WORK" ||
    operationalStatus === "IN_PROGRESS"
  ) {
    visualStatus = "DALAM_PENANGANAN";
  } else if (operationalStatus === "CONFIRMED_AFFECTED") {
    visualStatus = "TERDAMPAK";
  } else if (operationalStatus === "WORK_COMPLETED" || operationalStatus === "RESOLVED") {
    visualStatus = "SELESAI";
  } else if (
    operationalStatus === "NEED_CONFIRMATION" ||
    spatialRisk === "MONITOR" ||
    spatialRisk === "PRIORITY_MONITOR"
  ) {
    visualStatus = "PERLU_PERHATIAN";
  } else {
    visualStatus = "NORMAL";
  }

  return { operationalStatus, visualStatus };
}
