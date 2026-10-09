import type { SpartaRole, IncidentRecord } from "@/types/incident";

export type InitialWorkflowAction = "INSPECT" | "CONFIRM" | "NONE";

export function getInitialWorkflowAction(role: SpartaRole | null | undefined, status: IncidentRecord["status"]): InitialWorkflowAction {
  if (role === "tim_toko" && ["field_inspection_required", "clarification_required", "draft", "preliminary_unverified"].includes(status)) return "INSPECT";
  if (role === "bm" && status === "awaiting_manager_confirmation") return "CONFIRM";
  return "NONE";
}
