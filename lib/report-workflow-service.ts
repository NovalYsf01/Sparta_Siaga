import { randomUUID } from "node:crypto";
import { getDbPool } from "./db";
import { canConfirmInitialReport, canSubmitInspection, nextInitialStatus, validateInspectionSubmission } from "./report-workflow-policy";
import type { UserContext } from "./report-permissions";
import type { IncidentRecord } from "../types/incident";
import type { IncidentConfirmationDecision, IncidentInspectionSubmission, InspectionVerificationLevel, ManagerDecisionType } from "../types/report-workflow";

export class ReportWorkflowError extends Error {
  constructor(public code: string, message: string, public status = 422) {
    super(message);
  }
}

export interface ReportWorkflowRepository {
  transaction<T>(work: (repository: ReportWorkflowRepository) => Promise<T>): Promise<T>;
  lockIncident(reportId: string): Promise<IncidentRecord | null>;
  countEvidenceForReport(reportId: string): Promise<number>;
  insertSubmission(submission: IncidentInspectionSubmission): Promise<void>;
  getSubmission(reportId: string, version: number): Promise<IncidentInspectionSubmission | null>;
  insertDecision(decision: IncidentConfirmationDecision): Promise<void>;
  updateIncident(reportId: string, patch: Partial<IncidentRecord>): Promise<IncidentRecord>;
  attachPendingEvidence?(reportId: string, submissionId: string): Promise<void>;
}

export interface SubmitInspectionCommand {
  reportId: string;
  verificationLevel: InspectionVerificationLevel;
  conditionNotes: string;
  evidenceCount?: number;
  emergencyExceptionReason?: string | null;
}

export interface DecideInitialReportCommand {
  reportId: string;
  submissionVersion: number;
  decision: ManagerDecisionType;
  reason?: string | null;
  operationalStatus?: "Buka Normal" | "Tutup Sementara";
}

export function createReportWorkflowService(repository: ReportWorkflowRepository, now = () => new Date()) {
  return {
    async submitInspection(command: SubmitInspectionCommand, actor: UserContext): Promise<IncidentRecord> {
      return repository.transaction(async (tx) => {
        const report = await tx.lockIncident(command.reportId);
        if (!report) throw new ReportWorkflowError("REPORT_NOT_FOUND", "Laporan tidak ditemukan.", 404);
        if (!canSubmitInspection(actor, report)) {
          throw new ReportWorkflowError("INSPECTION_FORBIDDEN", "Pemeriksaan hanya dapat dikirim Tim Toko yang ditugaskan pada toko laporan.", 403);
        }
        const evidenceCount = await tx.countEvidenceForReport(report.id);
        const validation = validateInspectionSubmission({
          verificationLevel: command.verificationLevel,
          conditionNotes: command.conditionNotes,
          evidenceCount,
          emergencyExceptionReason: command.emergencyExceptionReason,
        });
        if (!validation.valid) throw new ReportWorkflowError(validation.code || "INVALID_INSPECTION", "Foto kondisi atau alasan pengecualian darurat wajib dilengkapi.", 400);

        const timestamp = now().toISOString();
        const version = (report.latestInspectionVersion ?? 0) + 1;
        const submission: IncidentInspectionSubmission = {
          id: `ins_${randomUUID()}`,
          reportId: report.id,
          version,
          verificationLevel: command.verificationLevel,
          conditionNotes: command.conditionNotes.trim(),
          emergencyException: command.emergencyExceptionReason?.trim() ? {
            reason: command.emergencyExceptionReason.trim(),
            declaredByUserId: actor.id,
            declaredByName: actor.name,
            declaredAt: timestamp,
          } : null,
          submittedByUserId: actor.id,
          submittedByName: actor.name,
          submittedAt: timestamp,
        };
        await tx.insertSubmission(submission);
        await tx.attachPendingEvidence?.(report.id, submission.id);
        return tx.updateIncident(report.id, {
          status: "awaiting_manager_confirmation",
          latestInspectionVersion: version,
          timeline: [...report.timeline, {
            stage: "Pemeriksaan Lapangan Diajukan",
            label: `Pemeriksaan versi ${version} diajukan untuk konfirmasi Manager Branch.`,
            timestamp,
            actor: actor.name,
            notes: submission.conditionNotes,
          }],
        });
      });
    },

    async decideInitialReport(command: DecideInitialReportCommand, actor: UserContext): Promise<IncidentRecord> {
      return repository.transaction(async (tx) => {
        const report = await tx.lockIncident(command.reportId);
        if (!report) throw new ReportWorkflowError("REPORT_NOT_FOUND", "Laporan tidak ditemukan.", 404);
        if (!canConfirmInitialReport(actor, report)) {
          throw new ReportWorkflowError("CONFIRMATION_FORBIDDEN", "Konfirmasi awal hanya dapat dilakukan Manager Branch yang bertanggung jawab.", 403);
        }
        if (command.submissionVersion !== report.latestInspectionVersion) {
          throw new ReportWorkflowError("STALE_SUBMISSION", "Versi pemeriksaan sudah tidak berlaku.", 409);
        }
        const submission = await tx.getSubmission(report.id, command.submissionVersion);
        if (!submission) throw new ReportWorkflowError("SUBMISSION_NOT_FOUND", "Pemeriksaan lapangan tidak ditemukan.", 404);
        if (command.decision === "CLARIFICATION_REQUIRED" && !command.reason?.trim()) {
          throw new ReportWorkflowError("CLARIFICATION_REASON_REQUIRED", "Alasan klarifikasi wajib diisi.", 400);
        }

        const timestamp = now().toISOString();
        const decision: IncidentConfirmationDecision = {
          id: `dec_${randomUUID()}`,
          reportId: report.id,
          submissionVersion: submission.version,
          decision: command.decision,
          reason: command.reason?.trim() || null,
          decidedByUserId: actor.id,
          decidedByName: actor.name,
          canonicalBranch: report.branch,
          decidedAt: timestamp,
        };
        await tx.insertDecision(decision);
        const status = nextInitialStatus(report.status, command.decision);
        return tx.updateIncident(report.id, {
          status,
          verification: command.decision === "CLARIFICATION_REQUIRED" ? report.verification : {
            confirmedBy: actor.name,
            confirmedAt: timestamp,
            isDamaged: command.decision === "DAMAGE_CONFIRMED",
            notes: command.reason || submission.conditionNotes,
            operationalStatus: command.operationalStatus,
          },
          timeline: [...report.timeline, {
            stage: "Keputusan Manager Branch",
            label: command.decision === "DAMAGE_CONFIRMED" ? "Ada Kerusakan" : command.decision === "NO_DAMAGE_CONFIRMED" ? "Tidak Ada Kerusakan" : "Perlu Klarifikasi",
            timestamp,
            actor: actor.name,
            notes: command.reason || undefined,
          }],
        });
      });
    },
  };
}

// Database rows are dynamically shaped at the pg boundary and normalized here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToIncident(row: Record<string, any>): IncidentRecord {
  return {
    id: row.id, date: row.date, disasterType: row.disaster_type,
    reportOrigin: row.report_origin, reporter: row.reporter ?? undefined,
    earthquakeEventId: row.earthquake_event_id ?? undefined,
    earthquakeSource: row.earthquake_source ?? undefined,
    earthquakeProvenance: row.earthquake_provenance ?? undefined,
    tkpType: row.tkp_type ?? undefined, storeId: row.store_id, storeName: row.store_name,
    branch: row.branch, locationCity: row.location_city, status: row.status,
    progress: row.progress, verification: row.verification ?? undefined,
    fieldPhotos: row.field_photos ?? [], timeline: row.timeline ?? [],
    latestInspectionVersion: row.latest_inspection_version ?? 0,
    canonicalEarthquakeEventId: row.canonical_earthquake_event_id ?? undefined,
    canonicalStoreId: row.canonical_store_id ?? undefined,
    earthquakeIdentityVersion: row.earthquake_identity_version ?? undefined,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : undefined,
  };
}

// Pool and PoolClient expose compatible query methods but distinct generic overloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function postgresRepository(client?: any): ReportWorkflowRepository {
  const pool = getDbPool();
  const queryable = client ?? pool;
  return {
    async transaction<T>(work: (repository: ReportWorkflowRepository) => Promise<T>): Promise<T> {
      if (client) return work(postgresRepository(client));
      const connection = await pool.connect();
      try {
        await connection.query("BEGIN");
        const result = await work(postgresRepository(connection));
        await connection.query("COMMIT");
        return result;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally {
        connection.release();
      }
    },
    async lockIncident(reportId) {
      const { rows } = await queryable.query("SELECT * FROM incidents WHERE id = $1 FOR UPDATE", [reportId]);
      return rows[0] ? rowToIncident(rows[0]) : null;
    },
    async countEvidenceForReport(reportId) {
      const { rows } = await queryable.query("SELECT COUNT(*)::int AS count FROM incident_evidence WHERE report_id = $1 AND submission_id IS NULL", [reportId]);
      return rows[0]?.count ?? 0;
    },
    async insertSubmission(item) {
      await queryable.query(`INSERT INTO incident_inspection_submissions (
        id, report_id, version, verification_level, condition_notes,
        emergency_exception_reason, emergency_exception_by_user_id,
        emergency_exception_by_name, emergency_exception_at,
        submitted_by_user_id, submitted_by_name, submitted_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [
        item.id, item.reportId, item.version, item.verificationLevel, item.conditionNotes,
        item.emergencyException?.reason ?? null, item.emergencyException?.declaredByUserId ?? null,
        item.emergencyException?.declaredByName ?? null, item.emergencyException?.declaredAt ?? null,
        item.submittedByUserId, item.submittedByName, item.submittedAt,
      ]);
    },
    async getSubmission(reportId, version) {
      const { rows } = await queryable.query("SELECT * FROM incident_inspection_submissions WHERE report_id = $1 AND version = $2", [reportId, version]);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id, reportId: row.report_id, version: row.version,
        verificationLevel: row.verification_level, conditionNotes: row.condition_notes,
        emergencyException: row.emergency_exception_reason ? {
          reason: row.emergency_exception_reason,
          declaredByUserId: row.emergency_exception_by_user_id,
          declaredByName: row.emergency_exception_by_name,
          declaredAt: new Date(row.emergency_exception_at).toISOString(),
        } : null,
        submittedByUserId: row.submitted_by_user_id, submittedByName: row.submitted_by_name,
        submittedAt: new Date(row.submitted_at).toISOString(),
      };
    },
    async insertDecision(item) {
      await queryable.query(`INSERT INTO incident_confirmation_decisions (
        id, report_id, submission_version, decision, reason, decided_by_user_id,
        decided_by_name, canonical_branch, decided_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [item.id, item.reportId,
        item.submissionVersion, item.decision, item.reason ?? null, item.decidedByUserId,
        item.decidedByName, item.canonicalBranch, item.decidedAt]);
    },
    async updateIncident(reportId, patch) {
      const { rows } = await queryable.query(`UPDATE incidents SET status = COALESCE($2, status),
        latest_inspection_version = COALESCE($3, latest_inspection_version),
        verification = COALESCE($4::jsonb, verification), timeline = COALESCE($5::jsonb, timeline),
        updated_at = NOW() WHERE id = $1 RETURNING *`, [reportId, patch.status ?? null,
        patch.latestInspectionVersion ?? null, patch.verification ? JSON.stringify(patch.verification) : null,
        patch.timeline ? JSON.stringify(patch.timeline) : null]);
      return rowToIncident(rows[0]);
    },
    async attachPendingEvidence(reportId, submissionId) {
      await queryable.query("UPDATE incident_evidence SET submission_id = $2 WHERE report_id = $1 AND submission_id IS NULL", [reportId, submissionId]);
    },
  };
}

export const reportWorkflowService = createReportWorkflowService(postgresRepository());
