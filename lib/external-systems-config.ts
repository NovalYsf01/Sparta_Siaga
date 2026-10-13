/**
 * SPARTA SIAGA — External Maintenance Systems URL Configuration
 * Mengelola tautan kerja operasional BMS dan BES secara terpusat dan terverifikasi.
 */

export interface ExternalSystemConfig {
  name: string;
  targetRole: "BMS" | "BES";
  tkpType: "toko" | "dc";
  isConfigured: boolean;
  url: string | null;
  statusLabel: string;
}

export function getExternalSystemConfig(tkpType: "toko" | "dc"): ExternalSystemConfig {
  if (tkpType === "dc") {
    const rawUrl =
      process.env.NEXT_PUBLIC_BES_SYSTEM_URL?.trim() ||
      process.env.BES_SYSTEM_URL?.trim() ||
      "";

    const isConfigured = Boolean(rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")));

    return {
      name: "Sistem Kerja Engineering BES (Warehouse / DC)",
      targetRole: "BES",
      tkpType: "dc",
      isConfigured,
      url: isConfigured ? rawUrl : null,
      statusLabel: isConfigured
        ? "Tautan Sistem BES Tersedia"
        : "Tautan Sistem BES Belum Dikonfigurasi (Atur NEXT_PUBLIC_BES_SYSTEM_URL di environment)",
    };
  } else {
    const rawUrl =
      process.env.NEXT_PUBLIC_BMS_SYSTEM_URL?.trim() ||
      process.env.BMS_SYSTEM_URL?.trim() ||
      "";

    const isConfigured = Boolean(rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")));

    return {
      name: "Sistem Kerja Sparta Maintenance BMS (Gerai Toko)",
      targetRole: "BMS",
      tkpType: "toko",
      isConfigured,
      url: isConfigured ? rawUrl : null,
      statusLabel: isConfigured
        ? "Tautan Sistem BMS Tersedia"
        : "Tautan Sistem BMS Belum Dikonfigurasi (Atur NEXT_PUBLIC_BMS_SYSTEM_URL di environment)",
    };
  }
}
