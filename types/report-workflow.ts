export type InitialWorkflowStatus =
  | "draft"
  | "preliminary_unverified"
  | "field_inspection_required"
  | "awaiting_manager_confirmation"
  | "clarification_required";

export type InspectionVerificationLevel =
  | "PRELIMINARY_UNVERIFIED"
  | "FIELD_VERIFIED";

export type ManagerDecisionType =
  | "DAMAGE_CONFIRMED"
  | "NO_DAMAGE_CONFIRMED"
  | "CLARIFICATION_REQUIRED";

export type EvidenceOrigin =
  | "CAMERA_SELF"
  | "GALLERY_SELF"
  | "GALLERY_THIRD_PARTY";

export type EvidencePhase = "INITIAL" | "CLARIFICATION" | "FOLLOW_UP";

export interface EmergencyEvidenceException {
  reason: string;
  declaredByUserId: string;
  declaredByName: string;
  declaredAt: string;
}

export interface IncidentInspectionSubmission {
  id: string;
  reportId: string;
  version: number;
  verificationLevel: InspectionVerificationLevel;
  conditionNotes: string;
  emergencyException?: EmergencyEvidenceException | null;
  submittedByUserId: string;
  submittedByName: string;
  submittedAt: string;
}

export interface IncidentConfirmationDecision {
  id: string;
  reportId: string;
  submissionVersion: number;
  decision: ManagerDecisionType;
  reason?: string | null;
  decidedByUserId: string;
  decidedByName: string;
  canonicalBranch: string;
  decidedAt: string;
}

export interface IncidentEvidence {
  id: string;
  reportId: string;
  submissionId?: string | null;
  phase: EvidencePhase;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  caption: string;
  origin: EvidenceOrigin;
  thirdPartySourceName?: string | null;
  thirdPartySourceDescription?: string | null;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface InspectionSubmissionInput {
  verificationLevel: InspectionVerificationLevel;
  conditionNotes: string;
  evidenceCount: number;
  emergencyExceptionReason?: string | null;
}

export interface InspectionValidationResult {
  valid: boolean;
  code?:
    | "CONDITION_NOTES_REQUIRED"
    | "EVIDENCE_OR_EXCEPTION_REQUIRED"
    | "EMERGENCY_EXCEPTION_REASON_REQUIRED";
}
