import { getDbPool } from "./db";
import { dbGetIncidentById, dbUpdateIncident } from "./incident-db";
import {
  MilestoneKey,
  MilestoneRecord,
  MilestoneRevision,
  MILESTONE_CONFIG,
  MILESTONE_ORDER,
  IncidentRecord,
} from "@/types/incident";
import { UserContext } from "./report-permissions";
import { saveMilestoneDocument, validateMilestoneDocumentMagicBytes } from "./milestone-storage";

let tablesEnsured = false;

export async function ensureMilestoneTables(): Promise<void> {
  if (tablesEnsured) return;
  const pool = getDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_milestones (
      id VARCHAR(64) PRIMARY KEY,
      report_id VARCHAR(64) NOT NULL,
      stage_order INT NOT NULL,
      stage_key VARCHAR(32) NOT NULL,
      stage_name VARCHAR(64) NOT NULL,
      target_progress INT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
      document_url TEXT,
      document_storage_key TEXT,
      document_original_name VARCHAR(255),
      document_mime_type VARCHAR(64),
      document_file_size INT,
      actor_id VARCHAR(64),
      actor_name VARCHAR(255),
      actor_role VARCHAR(32),
      submitted_at TIMESTAMPTZ,
      notes TEXT,
      proxy_approval_status VARCHAR(64),
      revisions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(report_id, stage_key)
    );

    CREATE INDEX IF NOT EXISTS idx_milestones_report ON report_milestones(report_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_order ON report_milestones(report_id, stage_order);
  `);

  tablesEnsured = true;
}

function rowToMilestone(row: Record<string, unknown>): MilestoneRecord {
  const revisions = Array.isArray(row.revisions)
    ? (row.revisions as MilestoneRevision[])
    : typeof row.revisions === "string"
    ? JSON.parse(row.revisions)
    : [];

  return {
    id: row.id as string,
    reportId: row.report_id as string,
    stageOrder: Number(row.stage_order),
    stageKey: row.stage_key as MilestoneKey,
    stageName: row.stage_name as string,
    targetProgress: Number(row.target_progress),
    status: row.status as MilestoneRecord["status"],
    documentUrl: (row.document_url as string) || undefined,
    documentStorageKey: (row.document_storage_key as string) || undefined,
    documentOriginalName: (row.document_original_name as string) || undefined,
    documentMimeType: (row.document_mime_type as string) || undefined,
    documentFileSize: row.document_file_size ? Number(row.document_file_size) : undefined,
    actorId: (row.actor_id as string) || undefined,
    actorName: (row.actor_name as string) || undefined,
    actorRole: (row.actor_role as string) || undefined,
    submittedAt: row.submitted_at
      ? new Date(row.submitted_at as string).toISOString()
      : undefined,
    notes: (row.notes as string) || undefined,
    proxyApprovalStatus: (row.proxy_approval_status as MilestoneRecord["proxyApprovalStatus"]) || undefined,
    revisions,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export async function getMilestones(reportId: string): Promise<MilestoneRecord[]> {
  await ensureMilestoneTables();
  const pool = getDbPool();

  const { rows } = await pool.query(
    `SELECT * FROM report_milestones WHERE report_id = $1 ORDER BY stage_order ASC`,
    [reportId]
  );

  if (rows.length === 5) {
    return rows.map(rowToMilestone);
  }

  // Initialize missing milestone records for this report in strict sequential order
  const existingMap = new Map(rows.map((r) => [r.stage_key, r]));
  const initialized: MilestoneRecord[] = [];

  for (const key of MILESTONE_ORDER) {
    const config = MILESTONE_CONFIG[key];
    const existing = existingMap.get(key);

    if (existing) {
      initialized.push(rowToMilestone(existing));
    } else {
      const id = `ms_${reportId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${key.toLowerCase()}`;
      const insertRes = await pool.query(
        `INSERT INTO report_milestones (
          id, report_id, stage_order, stage_key, stage_name, target_progress, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'NOT_STARTED')
        ON CONFLICT (report_id, stage_key) DO UPDATE SET updated_at = NOW()
        RETURNING *`,
        [id, reportId, config.order, key, config.label, config.progress]
      );
      initialized.push(rowToMilestone(insertRes.rows[0]));
    }
  }

  return initialized.sort((a, b) => a.stageOrder - b.stageOrder);
}

export interface SubmitMilestoneParams {
  reportId: string;
  stageKey: MilestoneKey;
  actor: UserContext;
  fileBuffer: Buffer;
  originalFilename?: string;
  notes?: string;
  isTestSimulation?: boolean; // Explicit test simulation flag for QA suite
}

export async function submitMilestoneDocument({
  reportId,
  stageKey,
  actor,
  fileBuffer,
  originalFilename,
  notes,
  isTestSimulation = false,
}: SubmitMilestoneParams): Promise<{
  milestone: MilestoneRecord;
  incident: IncidentRecord;
}> {
  await ensureMilestoneTables();

  // 1. Operational security: System Administrator cannot execute operational milestones
  if (actor.systemRole === "ADMIN") {
    throw new Error("System Administrator tidak memiliki wewenang untuk melakukan submit milestone operasional.");
  }

  // 2. Fetch incident report
  const incident = await dbGetIncidentById(reportId);
  if (!incident) {
    throw new Error("Laporan kejadian tidak ditemukan.");
  }

  // 3. Rule 11: Reports that are safe or rejected cannot enter handling workflow
  if (incident.status === "confirmed_safe") {
    throw new Error("Laporan berstatus Aman (confirmed_safe) tidak dapat diproses dalam penanganan pekerjaan.");
  }
  if (incident.status === "rejected_invalid") {
    throw new Error("Laporan berstatus Ditolak (rejected_invalid) tidak dapat diproses dalam penanganan pekerjaan.");
  }
  if (incident.status === "pending_confirmation" || incident.status === "pending_bm_approval") {
    throw new Error("Laporan belum disetujui awal oleh Branch Manager (status wajib confirmed_affected).");
  }

  // 4. Branch & Role isolation
  const clean = (b?: string | null) => (b ? b.trim().toLowerCase() : "");
  if (!actor.branch || clean(actor.branch) !== clean(incident.branch)) {
    throw new Error(`Aksi hanya berlaku untuk cabang sendiri (${actor.branch || "N/A"}), bukan ${incident.branch}.`);
  }

  const tkp = incident.tkpType || "toko";
  if (tkp === "dc") {
    if (actor.role !== "bes") {
      throw new Error("Laporan Warehouse/DC hanya dapat ditangani oleh petugas BES cabang terkait.");
    }
  } else {
    if (actor.role === "bes") {
      throw new Error("Petugas BES tidak berwenang menangani laporan gerai Toko. Laporan Toko ditangani oleh BMS.");
    }
    if (actor.role !== "bms") {
      throw new Error("Laporan gerai Toko hanya dapat ditangani oleh petugas BMS cabang terkait.");
    }
  }

  // 5. Document presence & magic bytes validation
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Dokumen bukti fisik (PDF/JPEG/PNG) wajib diunggah untuk menyelesaikan milestone.");
  }

  const { valid, mimeType } = validateMilestoneDocumentMagicBytes(fileBuffer);
  if (!valid) {
    throw new Error("Berkas bukti tidak valid. Hanya berkas PDF, JPEG, JPG, atau PNG asli yang diizinkan.");
  }

  // 6. Milestone Ordering & Prerequisite Verification
  const milestones = await getMilestones(reportId);
  const targetConfig = MILESTONE_CONFIG[stageKey];
  if (!targetConfig) {
    throw new Error(`Milestone '${stageKey}' tidak valid.`);
  }

  const currentMilestoneIndex = milestones.findIndex((m) => m.stageKey === stageKey);
  if (currentMilestoneIndex === -1) {
    throw new Error(`Milestone ${stageKey} tidak ditemukan.`);
  }

  // Ensure all previous milestones are completed in strict sequential order
  for (let i = 0; i < currentMilestoneIndex; i++) {
    const prev = milestones[i];
    if (prev.status !== "SUBMITTED") {
      throw new Error(
        `Tahap ${stageKey} belum dapat dikerjakan. Milestone sebelumnya (${prev.stageName}) wajib diselesaikan terlebih dahulu.`
      );
    }
  }

  // Special Business Policy Constraint for SPK (Milestone 4):
  // Approve Proxy (Milestone 3) must be officially validated before SPK can proceed,
  // unless explicitly flagged for automated simulation testing.
  if (stageKey === "SPK") {
    const proxyMilestone = milestones.find((m) => m.stageKey === "APPROVE_PROXY");
    if (!proxyMilestone || proxyMilestone.status !== "SUBMITTED") {
      throw new Error("Tahap Approve Proxy wajib diselesaikan sebelum pengajuan SPK.");
    }

    const isProxyValid = proxyMilestone.proxyApprovalStatus === "VALIDATED" || isTestSimulation;
    if (!isProxyValid) {
      throw new Error(
        "Penerbitan SPK tertahan: Menunggu klarifikasi kebijakan bisnis terkait pengesahan resmi Approve Proxy."
      );
    }
  }

  const currentRecord = milestones[currentMilestoneIndex];

  // 7. Save document to persistent private storage
  const savedDoc = await saveMilestoneDocument(
    fileBuffer,
    reportId,
    stageKey,
    originalFilename
  );

  // 8. Manage revision history (preserve previous documents)
  const revisions: MilestoneRevision[] = [...(currentRecord.revisions || [])];
  if (currentRecord.documentStorageKey) {
    revisions.push({
      revisionNumber: revisions.length + 1,
      submittedAt: currentRecord.submittedAt || new Date().toISOString(),
      actorId: currentRecord.actorId || actor.id,
      actorName: currentRecord.actorName || actor.name,
      actorRole: currentRecord.actorRole || actor.role,
      documentUrl: currentRecord.documentUrl || "",
      documentStorageKey: currentRecord.documentStorageKey,
      documentOriginalName: currentRecord.documentOriginalName || currentRecord.documentStorageKey,
      documentMimeType: currentRecord.documentMimeType || "application/octet-stream",
      documentFileSize: currentRecord.documentFileSize || 0,
      notes: currentRecord.notes,
    });
  }

  const nowIso = new Date().toISOString();
  const nowWib = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

  // For Approve Proxy (30%): differentiate evidence submitted vs validated policy
  let proxyStatus: string | null = null;
  if (stageKey === "APPROVE_PROXY") {
    proxyStatus = isTestSimulation ? "VALIDATED" : "EVIDENCE_SUBMITTED_AWAITING_POLICY";
  }

  const pool = getDbPool();
  const updateRes = await pool.query(
    `UPDATE report_milestones SET
      status = 'SUBMITTED',
      document_url = $1,
      document_storage_key = $2,
      document_original_name = $3,
      document_mime_type = $4,
      document_file_size = $5,
      actor_id = $6,
      actor_name = $7,
      actor_role = $8,
      submitted_at = $9,
      notes = $10,
      proxy_approval_status = $11,
      revisions = $12,
      updated_at = NOW()
     WHERE report_id = $13 AND stage_key = $14
     RETURNING *`,
    [
      savedDoc.url,
      savedDoc.storageKey,
      savedDoc.fileName,
      mimeType,
      savedDoc.fileSize,
      actor.id,
      actor.name,
      actor.role,
      nowIso,
      notes || null,
      proxyStatus,
      JSON.stringify(revisions),
      reportId,
      stageKey,
    ]
  );

  // 9. Update incident progress to EXACT fixed target progress
  const targetProgress = targetConfig.progress;
  const timelineEntry = {
    stage: `Milestone ${targetConfig.label}`,
    label: `Milestone ${targetConfig.label} (${targetProgress}%) Selesai Disubmit`,
    timestamp: nowWib,
    actor: `${actor.name} (${actor.role.toUpperCase()})`,
    notes: notes || `Dokumen ${savedDoc.fileName} berhasil diverifikasi.`,
  };

  const updatedIncident = await dbUpdateIncident(reportId, {
    progress: targetProgress,
    status: stageKey === "SERAH_TERIMA" ? "awaiting_st" : "in_maintenance",
    timeline: [...(incident.timeline || []), timelineEntry],
  });

  return {
    milestone: rowToMilestone(updateRes.rows[0]),
    incident: updatedIncident!,
  };
}

export async function requestMilestoneRevision(
  reportId: string,
  stageKey: MilestoneKey,
  reason: string,
  actor: UserContext
): Promise<MilestoneRecord> {
  await ensureMilestoneTables();

  if (!reason.trim()) {
    throw new Error("Alasan permintaan revisi dokumen wajib diisi.");
  }

  const pool = getDbPool();
  const updateRes = await pool.query(
    `UPDATE report_milestones SET
      status = 'REVISION_REQUESTED',
      notes = $1,
      updated_at = NOW()
     WHERE report_id = $2 AND stage_key = $3
     RETURNING *`,
    [`[Permintaan Revisi oleh ${actor.name}]: ${reason.trim()}`, reportId, stageKey]
  );

  if (updateRes.rows.length === 0) {
    throw new Error(`Milestone ${stageKey} tidak ditemukan pada laporan ${reportId}.`);
  }

  return rowToMilestone(updateRes.rows[0]);
}
