// ============================================================
// CENTRALIZED PERMISSION KEYS & TYPES (SHARED CLIENT & SERVER)
// ============================================================

export const PERMISSION_KEYS = [
  // LAPORAN
  "REPORT_VIEW_ALL",
  "REPORT_VIEW_OWN",
  "REPORT_CONFIRM",
  "REPORT_FOLLOW_UP",
  "REPORT_UPDATE_PROGRESS",
  "REPORT_CLOSE",
  // NOTIFIKASI
  "NOTIFICATION_VIEW",
  // MANAGEMENT
  "MANAGEMENT_INSTRUCTION_CREATE",
  // ESTIMASI (Foundation only - not full workflow)
  "ESTIMATION_TRIGGER",
  "ESTIMATION_VIEW",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionEffect = "ALLOW" | "DENY";
export type ScopeType = "OWN_SCOPE" | "SPECIFIC_BRANCH" | "ALL_BRANCHES";

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: "LAPORAN" | "NOTIFIKASI" | "MANAGEMENT" | "ESTIMASI";
  description: string;
  isOperational?: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // LAPORAN
  {
    key: "REPORT_VIEW_ALL",
    label: "Lihat Semua Laporan (Nasional)",
    category: "LAPORAN",
    description: "Izin memantau seluruh laporan bencana di seluruh cabang secara nasional.",
  },
  {
    key: "REPORT_VIEW_OWN",
    label: "Lihat Laporan Cabang Sendiri",
    category: "LAPORAN",
    description: "Izin melihat laporan yang terjadi pada cakupan cabang / toko sendiri.",
  },
  {
    key: "REPORT_CONFIRM",
    label: "Konfirmasi Laporan",
    category: "LAPORAN",
    description: "Izin melakukan verifikasi dan konfirmasi kondisi toko terdampak di lapangan.",
    isOperational: true,
  },
  {
    key: "REPORT_FOLLOW_UP",
    label: "Follow Up Laporan",
    category: "LAPORAN",
    description: "Izin menindaklanjuti investigasi dan penanganan laporan operasional.",
    isOperational: true,
  },
  {
    key: "REPORT_UPDATE_PROGRESS",
    label: "Update Progress",
    category: "LAPORAN",
    description: "Izin memperbarui persentase progress dan catatan perbaikan teknis.",
    isOperational: true,
  },
  {
    key: "REPORT_CLOSE",
    label: "Close Laporan",
    category: "LAPORAN",
    description: "Izin menyelesaikan dan menutup laporan insiden/kerusakan.",
    isOperational: true,
  },

  // NOTIFIKASI
  {
    key: "NOTIFICATION_VIEW",
    label: "Lihat Notifikasi",
    category: "NOTIFIKASI",
    description: "Izin menerima dan membuka daftar notifikasi peringatan bencana.",
  },

  // MANAGEMENT
  {
    key: "MANAGEMENT_INSTRUCTION_CREATE",
    label: "Management Instruction",
    category: "MANAGEMENT",
    description: "Izin membuat instruksi tanggap darurat manajemen untuk disiarkan ke cabang.",
  },

  // ESTIMASI
  {
    key: "ESTIMATION_TRIGGER",
    label: "Buat / Trigger Estimasi",
    category: "ESTIMASI",
    description: "Izin memicu pembuatan tiket estimasi perbaikan / pemeliharaan.",
  },
  {
    key: "ESTIMATION_VIEW",
    label: "Lihat Status Estimasi",
    category: "ESTIMASI",
    description: "Izin melihat status dan rincian estimasi perbaikan.",
  },
];

// ============================================================
// ADMINISTRATIVE CAPABILITIES (INHERENT TO SYSTEM ADMIN)
// ============================================================

export const ADMIN_CAPABILITIES = [
  "MANAGE_USERS",
  "MANAGE_ROLES",
  "MANAGE_PERMISSIONS",
  "VIEW_AUDIT_LOG",
  "SYSTEM_CONFIGURATION",
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

// ============================================================
// OPERATIONAL PERMISSIONS (BUSINESS OPERATIONS — REQUIRE EXPLICIT PERMISSION/SCOPE)
// ============================================================

export const OPERATIONAL_PERMISSIONS: readonly PermissionKey[] = [
  "REPORT_CONFIRM",
  "REPORT_FOLLOW_UP",
  "REPORT_UPDATE_PROGRESS",
  "REPORT_CLOSE",
  "MANAGEMENT_INSTRUCTION_CREATE",
  "ESTIMATION_TRIGGER",
] as const;

export const MONITORING_PERMISSIONS: readonly PermissionKey[] = [
  "REPORT_VIEW_ALL",
  "NOTIFICATION_VIEW",
  "ESTIMATION_VIEW",
] as const;

export function isOperationalPermission(key: PermissionKey): boolean {
  return (OPERATIONAL_PERMISSIONS as readonly string[]).includes(key);
}

export function isMonitoringPermission(key: PermissionKey): boolean {
  return (MONITORING_PERMISSIONS as readonly string[]).includes(key);
}

// ============================================================
// ROLE PERMISSION CATALOG (INHERENT PERMISSIONS PER BUSINESS ROLE)
// ============================================================
// Menentukan permission apa saja yang memang secara business rule
// merupakan hak bawaan role tersebut dan dapat dikelola (ON/OFF) oleh Admin.
// Permission di luar katalog role TIDAK BOLEH tampil di tab Hak Akses Role.
export const ROLE_PERMISSION_CATALOG: Record<string, readonly PermissionKey[]> = {
  ho_admin: [
    "REPORT_VIEW_ALL",
    "NOTIFICATION_VIEW",
    "ESTIMATION_VIEW",
  ],
  gm_ho: [
    "REPORT_VIEW_ALL",
    "NOTIFICATION_VIEW",
    "MANAGEMENT_INSTRUCTION_CREATE",
    "ESTIMATION_VIEW",
  ],
  sm_ho: [
    "REPORT_VIEW_ALL",
    "NOTIFICATION_VIEW",
    "MANAGEMENT_INSTRUCTION_CREATE",
    "ESTIMATION_VIEW",
  ],
  bm: [
    "REPORT_VIEW_OWN",
    "REPORT_CONFIRM",
    "REPORT_FOLLOW_UP",
    "REPORT_UPDATE_PROGRESS",
    "REPORT_CLOSE",
    "NOTIFICATION_VIEW",
    "ESTIMATION_VIEW",
  ],
  tim_toko: [
    "REPORT_VIEW_OWN",
    "REPORT_CONFIRM",
    "REPORT_FOLLOW_UP",
    "REPORT_UPDATE_PROGRESS",
    "REPORT_CLOSE",
    "NOTIFICATION_VIEW",
    "ESTIMATION_VIEW",
  ],
  sparta_maintenance: [
    "REPORT_VIEW_OWN",
    "REPORT_FOLLOW_UP",
    "REPORT_UPDATE_PROGRESS",
    "NOTIFICATION_VIEW",
    "ESTIMATION_VIEW",
  ],
  bms: [
    "REPORT_VIEW_OWN",
    "REPORT_FOLLOW_UP",
    "REPORT_UPDATE_PROGRESS",
    "NOTIFICATION_VIEW",
    "ESTIMATION_TRIGGER",
    "ESTIMATION_VIEW",
  ],
  bmc: [
    "REPORT_VIEW_OWN",
    "REPORT_FOLLOW_UP",
    "REPORT_UPDATE_PROGRESS",
    "NOTIFICATION_VIEW",
    "ESTIMATION_VIEW",
  ],
  bbc: [
    "REPORT_VIEW_OWN",
    "REPORT_FOLLOW_UP",
    "REPORT_UPDATE_PROGRESS",
    "NOTIFICATION_VIEW",
    "ESTIMATION_VIEW",
  ],
  bnm: [
    "REPORT_VIEW_OWN",
    "REPORT_FOLLOW_UP",
    "REPORT_UPDATE_PROGRESS",
    "NOTIFICATION_VIEW",
    "ESTIMATION_VIEW",
  ],
} as const;

export function isPermissionInRoleCatalog(role: string, permission: PermissionKey): boolean {
  const catalog = ROLE_PERMISSION_CATALOG[role.toLowerCase()];
  if (!catalog) return false;
  return (catalog as readonly string[]).includes(permission);
}

// Default State per Catalog Permission (All inherent permissions default to ALLOW unless toggled OFF)
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Partial<Record<PermissionKey, PermissionEffect>>> = {
  ho_admin: {
    REPORT_VIEW_ALL: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  gm_ho: {
    REPORT_VIEW_ALL: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    MANAGEMENT_INSTRUCTION_CREATE: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  sm_ho: {
    REPORT_VIEW_ALL: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    MANAGEMENT_INSTRUCTION_CREATE: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  bm: {
    REPORT_VIEW_OWN: "ALLOW",
    REPORT_CONFIRM: "ALLOW",
    REPORT_FOLLOW_UP: "ALLOW",
    REPORT_UPDATE_PROGRESS: "ALLOW",
    REPORT_CLOSE: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  tim_toko: {
    REPORT_VIEW_OWN: "ALLOW",
    REPORT_CONFIRM: "ALLOW",
    REPORT_FOLLOW_UP: "ALLOW",
    REPORT_UPDATE_PROGRESS: "ALLOW",
    REPORT_CLOSE: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  sparta_maintenance: {
    REPORT_VIEW_OWN: "ALLOW",
    REPORT_FOLLOW_UP: "ALLOW",
    REPORT_UPDATE_PROGRESS: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  bms: {
    REPORT_VIEW_OWN: "ALLOW",
    REPORT_FOLLOW_UP: "ALLOW",
    REPORT_UPDATE_PROGRESS: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_TRIGGER: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  bmc: {
    REPORT_VIEW_OWN: "ALLOW",
    REPORT_FOLLOW_UP: "ALLOW",
    REPORT_UPDATE_PROGRESS: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  bbc: {
    REPORT_VIEW_OWN: "ALLOW",
    REPORT_FOLLOW_UP: "ALLOW",
    REPORT_UPDATE_PROGRESS: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
  bnm: {
    REPORT_VIEW_OWN: "ALLOW",
    REPORT_FOLLOW_UP: "ALLOW",
    REPORT_UPDATE_PROGRESS: "ALLOW",
    NOTIFICATION_VIEW: "ALLOW",
    ESTIMATION_VIEW: "ALLOW",
  },
};

export interface RolePermissionRecord {
  id: string;
  businessRole: string;
  permissionKey: PermissionKey;
  effect: PermissionEffect;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissionOverrideRecord {
  id: string;
  userId: string;
  permissionKey: PermissionKey;
  effect: PermissionEffect;
  scopeType: ScopeType;
  branchCode: string | null;
  reason: string;
  startsAt: string;
  expiresAt: string | null;
  grantedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionAuditLogRecord {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  targetRole: string | null;
  targetUserId: string | null;
  permissionKey: PermissionKey;
  effect: PermissionEffect;
  scopeType: ScopeType | null;
  branchCode: string | null;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
}
