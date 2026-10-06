/**
 * SPARTA SIAGA — Work Readiness Foundation Domain
 * 
 * Sesuai Business Rule Terbaru Pak Iqbal:
 * 1. TKP TOKO — HANDLER BMS:
 *    - BMC_ESTIMATION_APPROVED
 *    - BMC_APPROVAL_EVIDENCE
 *    - SPARTA_MAINTENANCE_START_EVIDENCE
 * 
 * 2. TKP DC/WH — HANDLER BES:
 *    - PUM_APPROVED
 *    - FUND_DISBURSED
 *    - PUM_APPROVAL_EVIDENCE
 *    - MATERIAL_PURCHASE_RECEIPT
 * 
 * 3. HANDLER BUILDING:
 *    - SPK_RELEASED
 *    - SPK_EVIDENCE
 * 
 * 4. HANDLER REKANAN:
 *    - SPK_RELEASED
 *    - SPK_EVIDENCE
 * 
 * PENTING:
 * - ESTIMATION_COMPLETED ≠ READY_FOR_WORK
 * - work_status = NOT_READY sampai seluruh syarat readiness tervalidasi.
 * - Final Manager Approval: BLOCKED — WAITING CONFIRMATION FROM PAK IQBAL.
 */

export type WorkReadinessCategory = "STORE_BMS" | "DC_WH_BES" | "BUILDING" | "REKANAN";

export type WorkReadinessRequirementKey =
  // STORE_BMS
  | "BMC_ESTIMATION_APPROVED"
  | "BMC_APPROVAL_EVIDENCE"
  | "SPARTA_MAINTENANCE_START_EVIDENCE"
  // DC_WH_BES
  | "PUM_APPROVED"
  | "FUND_DISBURSED"
  | "PUM_APPROVAL_EVIDENCE"
  | "MATERIAL_PURCHASE_RECEIPT"
  // BUILDING & REKANAN
  | "SPK_RELEASED"
  | "SPK_EVIDENCE";

export interface WorkReadinessRequirementItem {
  key: WorkReadinessRequirementKey;
  label: string;
  description: string;
  type: "BOOLEAN_APPROVAL" | "FILE_ATTACHMENT" | "RECEIPT_ATTACHMENT";
  isRequired: boolean;
}

export const WORK_READINESS_REQUIREMENTS: Record<
  WorkReadinessCategory,
  WorkReadinessRequirementItem[]
> = {
  STORE_BMS: [
    {
      key: "BMC_ESTIMATION_APPROVED",
      label: "Approval Estimasi BMC",
      description: "Estimasi biaya perbaikan telah disetujui oleh BMC.",
      type: "BOOLEAN_APPROVAL",
      isRequired: true,
    },
    {
      key: "BMC_APPROVAL_EVIDENCE",
      label: "Screenshot Bukti Approval BMC",
      description: "Lampiran bukti visual persetujuan estimasi dari BMC.",
      type: "FILE_ATTACHMENT",
      isRequired: true,
    },
    {
      key: "SPARTA_MAINTENANCE_START_EVIDENCE",
      label: "Screenshot Bukti Mulai Kerja Sparta Maintenance",
      description: "Bukti mulai pekerjaan yang tercatat pada sistem Sparta Maintenance.",
      type: "FILE_ATTACHMENT",
      isRequired: true,
    },
  ],

  DC_WH_BES: [
    {
      key: "PUM_APPROVED",
      label: "PUM Disetujui",
      description: "Pengajuan Uang Muka (PUM) telah disetujui secara resmi.",
      type: "BOOLEAN_APPROVAL",
      isRequired: true,
    },
    {
      key: "FUND_DISBURSED",
      label: "Dana Telah Cair",
      description: "Dana perbaikan dari PUM telah dicairkan.",
      type: "BOOLEAN_APPROVAL",
      isRequired: true,
    },
    {
      key: "PUM_APPROVAL_EVIDENCE",
      label: "Lampiran Form PUM Approved",
      description: "Dokumen/foto lembar PUM yang sudah bertanda tangan/approval.",
      type: "FILE_ATTACHMENT",
      isRequired: true,
    },
    {
      key: "MATERIAL_PURCHASE_RECEIPT",
      label: "Nota Pembelian Material",
      description: "Struk/nota resmi pembelian material fisik pekerjaan.",
      type: "RECEIPT_ATTACHMENT",
      isRequired: true,
    },
  ],

  BUILDING: [
    {
      key: "SPK_RELEASED",
      label: "SPK Kontraktor Dirilis",
      description: "Surat Perintah Kerja (SPK) ke kontraktor pelaksana telah dirilis.",
      type: "BOOLEAN_APPROVAL",
      isRequired: true,
    },
    {
      key: "SPK_EVIDENCE",
      label: "Lampiran Dokumen SPK",
      description: "Salinan dokumen resmi SPK yang telah ditandatangani.",
      type: "FILE_ATTACHMENT",
      isRequired: true,
    },
  ],

  REKANAN: [
    {
      key: "SPK_RELEASED",
      label: "SPK Kontraktor/Rekanan Dirilis",
      description: "Surat Perintah Kerja (SPK) ke rekanan pelaksana telah dirilis.",
      type: "BOOLEAN_APPROVAL",
      isRequired: true,
    },
    {
      key: "SPK_EVIDENCE",
      label: "Lampiran Dokumen SPK Rekanan",
      description: "Salinan dokumen resmi SPK rekanan yang telah disetujui.",
      type: "FILE_ATTACHMENT",
      isRequired: true,
    },
  ],
};

/**
 * Menentukan kategori readiness berdasarkan kombinasi TKP dan Handler.
 * Mendukung format string case-insensitive.
 */
export function resolveWorkReadinessCategory(
  tkpType?: string | null,
  handlerType?: string | null
): WorkReadinessCategory | null {
  const normTkp = (tkpType || "").trim().toLowerCase();
  const normHandler = (handlerType || "").trim().toUpperCase();

  // 1. Building handler selalu memakai kategori BUILDING
  if (normHandler === "BUILDING" || normHandler === "BLD") {
    return "BUILDING";
  }

  // 2. Rekanan handler selalu memakai kategori REKANAN
  if (normHandler === "REKANAN" || normHandler === "CONTRACTOR") {
    return "REKANAN";
  }

  // 3. TKP DC / Warehouse dengan handler BES
  if (
    normHandler === "BES" ||
    normTkp === "dc" ||
    normTkp === "wh" ||
    normTkp === "warehouse"
  ) {
    return "DC_WH_BES";
  }

  // 4. Default Toko dengan handler BMS
  if (normHandler === "BMS" || normTkp === "toko" || normTkp === "store") {
    return "STORE_BMS";
  }

  return "STORE_BMS";
}

/**
 * Mendapatkan daftar checklist persyaratan work readiness yang berlaku
 * untuk kombinasi TKP dan Handler tertentu.
 */
export function getWorkReadinessRequirements(
  tkpType?: string | null,
  handlerType?: string | null
): WorkReadinessRequirementItem[] {
  const category = resolveWorkReadinessCategory(tkpType, handlerType);
  if (!category) return [];
  return WORK_READINESS_REQUIREMENTS[category] || [];
}

export interface WorkReadinessEvaluationResult {
  category: WorkReadinessCategory;
  isReady: boolean;
  totalRequirements: number;
  completedRequirements: number;
  missingRequirements: WorkReadinessRequirementItem[];
  details: Record<
    WorkReadinessRequirementKey,
    {
      completed: boolean;
      value?: any;
    }
  >;
}

/**
 * Mengevaluasi apakah data/bukti yang disubmit telah memenuhi seluruh
 * syarat Work Readiness untuk memulai pekerjaan fisik.
 */
export function evaluateWorkReadiness(
  tkpType: string | null | undefined,
  handlerType: string | null | undefined,
  submittedEvidences: Record<string, any> = {}
): WorkReadinessEvaluationResult {
  const category = resolveWorkReadinessCategory(tkpType, handlerType) || "STORE_BMS";
  const requirements = WORK_READINESS_REQUIREMENTS[category] || [];

  const missingRequirements: WorkReadinessRequirementItem[] = [];
  const details: any = {};
  let completedCount = 0;

  for (const req of requirements) {
    const val = submittedEvidences[req.key];
    const isCompleted =
      val === true ||
      (typeof val === "string" && val.trim().length > 0) ||
      (typeof val === "object" && val !== null && Object.keys(val).length > 0);

    details[req.key] = {
      completed: Boolean(isCompleted),
      value: val ?? null,
    };

    if (isCompleted) {
      completedCount++;
    } else if (req.isRequired) {
      missingRequirements.push(req);
    }
  }

  return {
    category,
    isReady: missingRequirements.length === 0,
    totalRequirements: requirements.length,
    completedRequirements: completedCount,
    missingRequirements,
    details,
  };
}

/**
 * Helper validasi singkat apakah transisi menuju READY_FOR_WORK diperbolehkan.
 */
export function canTransitionToReadyForWork(
  tkpType: string | null | undefined,
  handlerType: string | null | undefined,
  submittedEvidences: Record<string, any> = {}
): boolean {
  const evaluation = evaluateWorkReadiness(tkpType, handlerType, submittedEvidences);
  return evaluation.isReady;
}

/**
 * Status approval final Manager:
 * BLOCKED — WAITING CONFIRMATION FROM PAK IQBAL
 * Role / jabatan Manager belum di-hardcode.
 */
export const FINAL_MANAGER_APPROVAL_STATUS = "BLOCKED — WAITING CONFIRMATION FROM PAK IQBAL" as const;
