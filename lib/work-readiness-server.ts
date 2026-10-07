import fs from "fs/promises";
import path from "path";
import { getDbPool } from "./db";
import { dbGetIncidentById } from "./incident-db";
import {
  EstimationIntegrationService,
  EstimationRouteRecord,
  WorkStatus,
} from "./estimation-service";
import {
  WorkReadinessCategory,
  WorkReadinessRequirementKey,
  WORK_READINESS_REQUIREMENTS,
  resolveWorkReadinessCategory,
  evaluateWorkReadiness,
  validateReadinessEvidenceBytes,
  WorkReadinessRequirementData,
  WorkReadinessEvaluationResult,
} from "./work-readiness";

import { getPrivateStoragePaths } from "./storage-config";

export function getReadinessStorageDir(): string {
  return getPrivateStoragePaths().readiness;
}

export const READINESS_STORAGE_DIR = getReadinessStorageDir();

export interface SaveReadinessFileResult {
  evidenceId: string;
  storageKey: string;
  fileUrl: string;
  diskPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Menyimpan berkas bukti fisik kesiapan kerja ke private storage lokal (di luar public static directory).
 */
export async function saveReadinessEvidenceFile(
  buffer: Buffer,
  reportId: string,
  reqKey: string,
  originalFilename: string,
  mimeType: string
): Promise<SaveReadinessFileResult> {
  const uploadDir = getReadinessStorageDir();
  await fs.mkdir(uploadDir, { recursive: true });

  const ext =
    mimeType === "application/pdf"
      ? "pdf"
      : mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
      ? "webp"
      : "jpg";

  const sanitizedBase = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const evidenceId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storageKey = `${reportId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${reqKey}_${evidenceId}.${ext}`;
  const diskPath = path.join(uploadDir, storageKey);

  await fs.writeFile(diskPath, buffer);

  return {
    evidenceId,
    storageKey,
    fileUrl: `/api/incidents/${encodeURIComponent(reportId)}/readiness/evidence/${evidenceId}`,
    diskPath,
    fileName: sanitizedBase || storageKey,
    fileSize: buffer.length,
    mimeType,
  };
}

export interface UpdateReadinessParams {
  reportId: string;
  actor: {
    id: string;
    name: string;
    branch?: string | null;
  };
  requirementKey: WorkReadinessRequirementKey;
  booleanValue?: boolean;
  fileEvidence?: {
    buffer: Buffer;
    originalFilename: string;
  };
  notes?: string;
  explicitTransitionToReady?: boolean;
}

export interface UpdateReadinessResult {
  success: boolean;
  category: WorkReadinessCategory;
  workStatus: WorkStatus;
  evaluation: WorkReadinessEvaluationResult;
  route: EstimationRouteRecord;
  message?: string;
}

/**
 * Service pemrosesan update readiness item (boolean atau bukti upload)
 * dengan validasi server-side menyeluruh dan state machine guard.
 */
export async function processReadinessUpdate(
  params: UpdateReadinessParams
): Promise<UpdateReadinessResult> {
  const { reportId, actor, requirementKey, booleanValue, fileEvidence, notes } = params;

  // 1. Ambil Laporan & Rute Estimasi
  const incident = await dbGetIncidentById(reportId);
  if (!incident) {
    const err: any = new Error("Laporan tidak ditemukan.");
    err.code = "REPORT_NOT_FOUND";
    err.status = 404;
    throw err;
  }

  const route = await EstimationIntegrationService.getRouteByReportId(reportId);
  if (!route) {
    const err: any = new Error("Rute estimasi untuk laporan ini belum dibuat.");
    err.code = "ESTIMATION_NOT_FOUND";
    err.status = 422;
    throw err;
  }

  // 2. State Machine Lock: Jika pekerjaan sudah READY_FOR_WORK, IN_PROGRESS, atau COMPLETED -> Lock
  if (route.workStatus !== "NOT_READY") {
    const err: any = new Error(
      `Persyaratan kesiapan kerja telah divalidasi dan terkunci (Status pekerjaan saat ini: '${route.workStatus}').`
    );
    err.code = "WORK_ALREADY_READY";
    err.status = 422;
    throw err;
  }

  // 3. Resolve kategori langsung dari domain report & route (Client TIDAK BISA spoof)
  const category = resolveWorkReadinessCategory(incident.tkpType, route.handlerType) || "STORE_BMS";
  const requirements = WORK_READINESS_REQUIREMENTS[category] || [];

  // Validasi bahwa requirementKey memang milik kategori aktif
  const targetReq = requirements.find((r) => r.key === requirementKey);
  if (!targetReq) {
    const err: any = new Error(
      `Persyaratan '${requirementKey}' tidak berlaku untuk kategori readiness '${category}' (TKP: ${incident.tkpType}, Handler: ${route.handlerType}).`
    );
    err.code = "INVALID_READINESS_REQUIREMENT";
    err.status = 400;
    throw err;
  }

  // 4. Siapkan existing readiness_data
  const currentReadinessData: Record<string, any> = {
    ...(route.readinessData || {}),
    category,
  };

  // 5. Proses Berdasarkan Tipe Requirement
  const nowIso = new Date().toISOString();

  if (targetReq.type === "BOOLEAN_APPROVAL") {
    if (booleanValue === undefined) {
      const err: any = new Error(`Nilai persetujuan (boolean) wajib disertakan untuk '${targetReq.label}'.`);
      err.code = "BOOLEAN_VALUE_REQUIRED";
      err.status = 400;
      throw err;
    }

    const itemData: WorkReadinessRequirementData = {
      satisfied: Boolean(booleanValue),
      type: "BOOLEAN_APPROVAL",
      value: Boolean(booleanValue),
      notes: notes || null,
      updatedBy: actor.id,
      updatedByName: actor.name,
      updatedAt: nowIso,
    };

    currentReadinessData[requirementKey] = itemData;
  } else {
    // Tipe FILE_ATTACHMENT atau RECEIPT_ATTACHMENT
    if (!fileEvidence || !fileEvidence.buffer) {
      const err: any = new Error(`Berkas lampiran fisik wajib diunggah untuk '${targetReq.label}'.`);
      err.code = "EVIDENCE_FILE_REQUIRED";
      err.status = 400;
      throw err;
    }

    // Validasi magic bytes
    const validation = validateReadinessEvidenceBytes(fileEvidence.buffer);
    if (!validation.valid) {
      const err: any = new Error(validation.error || "Berkas tidak valid.");
      err.code = "FILE_TYPE_NOT_ALLOWED";
      err.status = 400;
      throw err;
    }

    // Simpan ke disk
    const saveResult = await saveReadinessEvidenceFile(
      fileEvidence.buffer,
      reportId,
      requirementKey,
      fileEvidence.originalFilename,
      validation.mimeType
    );

    const itemData: WorkReadinessRequirementData = {
      satisfied: true,
      type: targetReq.type,
      evidenceId: saveResult.evidenceId,
      storageKey: saveResult.storageKey,
      fileUrl: saveResult.fileUrl,
      fileName: saveResult.fileName,
      fileSize: saveResult.fileSize,
      mimeType: saveResult.mimeType,
      notes: notes || null,
      updatedBy: actor.id,
      updatedByName: actor.name,
      updatedAt: nowIso,
    };

    currentReadinessData[requirementKey] = itemData;
  }

  // 6. Evaluasi Kesiapan Kerja
  const evaluation = evaluateWorkReadiness(
    incident.tkpType,
    route.handlerType,
    currentReadinessData
  );

  // 7. Simpan ke database
  let targetWorkStatus: WorkStatus = route.workStatus;

  // Auto transition to READY_FOR_WORK jika seluruh syarat terpenuhi DAN status estimasi ESTIMATION_COMPLETED
  if (evaluation.isReady && route.status === "ESTIMATION_COMPLETED") {
    targetWorkStatus = "READY_FOR_WORK";
    const updatedRoute = await EstimationIntegrationService.updateWorkStatus(
      reportId,
      "READY_FOR_WORK",
      {
        readinessEvidences: currentReadinessData,
      }
    );
    return {
      success: true,
      category,
      workStatus: "READY_FOR_WORK",
      evaluation,
      route: updatedRoute,
      message: "Seluruh persyaratan terpenuhi. Status pekerjaan telah dialihkan ke SIAP DIKERJAKAN (READY_FOR_WORK).",
    };
  }

  // Jika belum lengkap, simpan evidence dan pertahankan NOT_READY
  const pool = getDbPool();
  const updateRes = await pool.query(
    `UPDATE report_estimation_routes SET
      readiness_data = $1,
      updated_at = NOW()
    WHERE report_id = $2
    RETURNING *`,
    [JSON.stringify(currentReadinessData), reportId]
  );

  const updatedRoute = (await EstimationIntegrationService.getRouteByReportId(reportId))!;

  return {
    success: true,
    category,
    workStatus: "NOT_READY",
    evaluation,
    route: updatedRoute,
    message: evaluation.isReady
      ? "Seluruh persyaratan terpenuhi, menunggu penyelesaian estimasi resmi untuk beralih ke Siap Dikerjakan."
      : `Persyaratan berhasil diperbarui. (${evaluation.completedRequirements}/${evaluation.totalRequirements} terpenuhi)`,
  };
}

/**
 * Mengambil berkas bukti kesiapan kerja dari private storage secara aman.
 * Mencegah path traversal dan memvalidasi integritas lokasi berkas.
 */
export async function getReadinessEvidenceFile(
  reportId: string,
  identifier: string
): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSize: number;
} | null> {
  // 1. Sanitasi identifier parameter — tolak traversal payload
  if (!identifier || identifier.includes("..") || identifier.includes("/") || identifier.includes("\\")) {
    return null;
  }

  // 2. Ambil data route estimasi
  const route = await EstimationIntegrationService.getRouteByReportId(reportId);
  if (!route || !route.readinessData) {
    return null;
  }

  // 3. Cari metadata evidence di dalam readinessData berdasarkan key atau evidenceId/storageKey
  let targetItem: WorkReadinessRequirementData | null = null;

  if (route.readinessData[identifier]) {
    targetItem = route.readinessData[identifier];
  } else {
    for (const key of Object.keys(route.readinessData)) {
      const item = route.readinessData[key];
      if (item && typeof item === "object" && (item.evidenceId === identifier || item.storageKey === identifier)) {
        targetItem = item;
        break;
      }
    }
  }

  if (!targetItem) {
    return null;
  }

  // 4. Resolve berkas fisik di private storage
  const storageDir = path.resolve(getReadinessStorageDir());
  const targetFileName = targetItem.storageKey || (targetItem.fileUrl ? path.basename(targetItem.fileUrl) : null);
  if (!targetFileName) {
    return null;
  }

  // Anti-path traversal guard
  const resolvedPath = path.resolve(storageDir, targetFileName);
  if (!resolvedPath.startsWith(storageDir)) {
    return null;
  }

  try {
    const buffer = await fs.readFile(resolvedPath);
    return {
      buffer,
      mimeType: targetItem.mimeType || "application/octet-stream",
      fileName: targetItem.fileName || targetFileName,
      fileSize: buffer.length,
    };
  } catch {
    // 5. Fallback backward-compatible: jika masih berada di public/uploads/readiness (data dev/test lama)
    const legacyDir = path.resolve(process.cwd(), "public", "uploads", "readiness");
    const legacyPath = path.resolve(legacyDir, targetFileName);
    if (legacyPath.startsWith(legacyDir)) {
      try {
        const buffer = await fs.readFile(legacyPath);
        // Migrasi otomatis ke private storage
        await fs.mkdir(storageDir, { recursive: true });
        await fs.writeFile(resolvedPath, buffer);
        // Hapus berkas dari public directory agar tidak lagi terekspos secara publik
        await fs.unlink(legacyPath).catch(() => {});
        return {
          buffer,
          mimeType: targetItem.mimeType || "application/octet-stream",
          fileName: targetItem.fileName || targetFileName,
          fileSize: buffer.length,
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}

