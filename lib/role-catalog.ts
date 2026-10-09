// ============================================================
// SPARTA SIAGA — CANONICAL ROLE CATALOG & IDENTITY DEFINITIONS
// Single Source of Truth for Human Business Roles, Scope, and Metadata
// ============================================================

export type SystemRoleType = "ADMIN" | "USER";
export type ScopeType = "HO" | "BRANCH";

export interface BusinessRoleDefinition {
  key: string;
  label: string;
  fullLabel?: string;
  scope: ScopeType;
  category: "HO" | "BRANCH" | "LEGACY" | "INTEGRATION";
  selectable: boolean;
  description: string;
}

/**
 * 11 CANONICAL HUMAN BUSINESS ROLES
 * 3 Head Office roles + 8 Branch operational roles.
 * Seluruhnya merupakan human persona yang dapat login dan dipilih dalam User Management.
 */
export const CANONICAL_HUMAN_ROLES: readonly BusinessRoleDefinition[] = [
  // --- HEAD OFFICE ---
  {
    key: "ho_admin",
    label: "HO Admin",
    fullLabel: "Head Office Administrator",
    scope: "HO",
    category: "HO",
    selectable: true,
    description: "Pemantau nasional lintas cabang dan administrasi operasional HO (bukan System Admin teknik).",
  },
  {
    key: "gm_ho",
    label: "GM HO",
    fullLabel: "General Manager Head Office",
    scope: "HO",
    category: "HO",
    selectable: true,
    description: "Manajemen eksekutif HO, pemantau nasional dan penerbit Instruksi Manajemen tanggap darurat.",
  },
  {
    key: "sm_ho",
    label: "SM HO",
    fullLabel: "Senior Manager Head Office",
    scope: "HO",
    category: "HO",
    selectable: true,
    description: "Senior Manajemen HO, pemantau nasional dan penerbit Instruksi Manajemen tanggap darurat.",
  },

  // --- BRANCH ---
  {
    key: "bm",
    label: "Manager Branch",
    fullLabel: "Branch Manager",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "Pimpinan cabang, pemegang wewenang approval final penyelesaian pekerjaan dan Case Close cabang sendiri.",
  },
  {
    key: "tim_toko",
    label: "Tim Toko",
    fullLabel: "Tim Personil Gerai / Toko",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "Personil lapangan gerai ritel, pelapor awal dan verifikator kondisi darurat toko.",
  },
  {
    key: "bms",
    label: "BMS",
    fullLabel: "Branch Maintenance Support",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "PIC teknis lapangan pemeliharaan toko, pembuat estimasi TKP Toko, updater progress, dan pengaju penyelesaian fisik.",
  },
  {
    key: "bmc",
    label: "BMC",
    fullLabel: "Branch Maintenance Coordinator",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "Koordinator pemeliharaan cabang, validator dan pemberi approval koordinator atas pekerjaan BMS.",
  },
  {
    key: "bes",
    label: "BES",
    fullLabel: "Branch Engineering Support",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "PIC teknis lapangan Engineering (Gudang / DC), updater progress DC, dan pengaju penyelesaian pekerjaan DC.",
  },
  {
    key: "bec",
    label: "BEC",
    fullLabel: "Branch Engineering Coordinator",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "Koordinator Engineering cabang, validator dan pemberi approval koordinator atas pekerjaan BES.",
  },
  {
    key: "bbs",
    label: "BBS",
    fullLabel: "Branch Building Support",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "PIC teknis lapangan Sipil / Building, updater progress Building, dan pengaju penyelesaian pekerjaan Building.",
  },
  {
    key: "bbc",
    label: "BBC",
    fullLabel: "Branch Building Coordinator",
    scope: "BRANCH",
    category: "BRANCH",
    selectable: true,
    description: "Koordinator Sipil / Building cabang, validator dan pemberi approval koordinator atas pekerjaan BBS.",
  },
] as const;

/**
 * SPECIAL / LEGACY / INTEGRATION ROLES
 * Dipertahankan untuk audit dan backward-compatibility kode lama.
 * TIDAK BOLEH muncul pada dropdown pembuatan user baru (selectable = false).
 */
export const SPECIAL_LEGACY_ROLES: readonly BusinessRoleDefinition[] = [
  {
    key: "sparta_maintenance",
    label: "Sparta Maintenance",
    fullLabel: "SPARTA Maintenance System",
    scope: "BRANCH",
    category: "INTEGRATION",
    selectable: false,
    description: "Sistem destinasi integrasi estimasi internal BMS (bukan persona login manusia).",
  },
  {
    key: "bnm",
    label: "BnM",
    fullLabel: "Branch & Maintenance Department",
    scope: "BRANCH",
    category: "INTEGRATION",
    selectable: false,
    description: "Departemen/target instruksi dan destinasi alur Rekanan via BNM_MANTRA (bukan persona login manusia).",
  },
  {
    key: "tim_maintenance",
    label: "Tim Maintenance",
    scope: "BRANCH",
    category: "LEGACY",
    selectable: false,
    description: "Role legacy versi awal (telah digantikan oleh spesialisasi BMS/BES/BBS).",
  },
  {
    key: "tim_office",
    label: "Tim Office",
    scope: "BRANCH",
    category: "LEGACY",
    selectable: false,
    description: "Role legacy versi awal.",
  },
  {
    key: "tim_warehouse",
    label: "Tim Warehouse",
    scope: "BRANCH",
    category: "LEGACY",
    selectable: false,
    description: "Role legacy versi awal (telah digantikan oleh alur BES/BEC).",
  },
] as const;

/**
 * Gabungan seluruh definisi role untuk lookup universal
 */
export const ALL_BUSINESS_ROLES: readonly BusinessRoleDefinition[] = [
  ...CANONICAL_HUMAN_ROLES,
  ...SPECIAL_LEGACY_ROLES,
] as const;

/**
 * Subset: Hanya human roles yang selectable untuk User Management UI & APIs
 */
export const HUMAN_SELECTABLE_ROLES = CANONICAL_HUMAN_ROLES;

export const HUMAN_SELECTABLE_HO_ROLES = CANONICAL_HUMAN_ROLES.filter(
  (r) => r.scope === "HO"
);

export const HUMAN_SELECTABLE_BRANCH_ROLES = CANONICAL_HUMAN_ROLES.filter(
  (r) => r.scope === "BRANCH"
);

/**
 * Lookup definisi role berdasarkan key (case-insensitive)
 */
export function getBusinessRoleDefinition(
  key?: string | null
): BusinessRoleDefinition | undefined {
  if (!key) return undefined;
  const lower = key.toLowerCase();
  return ALL_BUSINESS_ROLES.find((r) => r.key.toLowerCase() === lower);
}

/**
 * Cek apakah sebuah role key adalah human role yang valid dan selectable
 */
export function isValidHumanBusinessRole(key?: string | null): boolean {
  if (!key) return false;
  const def = getBusinessRoleDefinition(key);
  return Boolean(def && def.selectable);
}

/**
 * Turunkan scope server-side secara otoritatif dari Business Role
 * HO roles -> "HO"
 * BRANCH roles -> "BRANCH"
 * Invalid role -> null
 */
export function deriveScopeFromBusinessRole(
  key?: string | null
): ScopeType | null {
  if (!key) return null;
  const def = getBusinessRoleDefinition(key);
  if (!def) return null;
  return def.scope;
}

/**
 * Canonical display label resolver untuk seluruh tampilan UI dan logging
 */
export function getRoleDisplayLabel(role?: string | null): string {
  if (!role) return "User";
  const r = role.toLowerCase();

  // Khusus System Admin
  if (r === "admin" || r === "sys_admin" || r === "system_admin") {
    return "System Admin";
  }

  const def = getBusinessRoleDefinition(r);
  if (def) {
    return def.label;
  }

  // Fallback prettified text
  return role.replace(/_/g, " ").toUpperCase();
}
