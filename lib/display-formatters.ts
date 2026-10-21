/**
 * SPARTA SIAGA — Presentation Layer Display & Sanitization Formatters
 *
 * Sanitizes and formats user-facing text across all interfaces:
 * - Strips test markers ([UAT-ATASAN-1], [UAT-ATASAN-2], [SIMULASI], etc.)
 * - Formats natural Indonesian titles and notifications without damage speculation
 * - Preserves internal identifiers, database keys, and audit integrity intact
 */

const TEST_MARKERS_REGEX = /^\s*\[(UAT-ATASAN-[12]|SIMULASI|TESTING|DUMMY|DATA PERCOBAAN)\]\s*/i;
const ALL_TEST_TAGS_REGEX = /\[(UAT-ATASAN-[12]|SIMULASI|TESTING|DUMMY|DATA PERCOBAAN)\]\s*/gi;
const EMOJI_PREFIXES_REGEX = /^(🚨|🌧️|⚠️|🔔)\s*/;

/**
 * Strips test markers from display titles and normalizes natural event wording.
 * Example:
 * "[UAT-ATASAN-2] Peringatan Gempa Otomatis M 5.2 Wilayah Jawa Barat"
 * -> "Peringatan Gempa M 5.2 di Wilayah Jawa Barat"
 */
export function cleanDisplayTitle(rawTitle?: string | null): string {
  if (!rawTitle) return "";

  let cleaned = rawTitle
    .replace(TEST_MARKERS_REGEX, "")
    .replace(ALL_TEST_TAGS_REGEX, "")
    .replace(EMOJI_PREFIXES_REGEX, "")
    .trim();

  // Normalize specific earthquake automated alert phrasing
  // "Peringatan Gempa Otomatis M 5.2 Wilayah Jawa Barat" -> "Peringatan Gempa M 5.2 di Wilayah Jawa Barat"
  cleaned = cleaned.replace(
    /Peringatan Gempa Otomatis M\s*([\d.]+)\s*(?:di\s*)?Wilayah\s*(.*)/i,
    "Peringatan Gempa M $1 di Wilayah $2"
  );

  // Clean remaining "Otomatis" if present in generic title
  cleaned = cleaned.replace(/Peringatan Gempa Otomatis/i, "Peringatan Gempa");

  return cleaned.trim();
}

/**
 * Strips test markers from descriptions, notes, and timeline logs while preserving authentic content.
 */
export function cleanDisplayText(rawText?: string | null): string {
  if (!rawText) return "";

  return rawText
    .replace(TEST_MARKERS_REGEX, "")
    .replace(ALL_TEST_TAGS_REGEX, "")
    .replace(EMOJI_PREFIXES_REGEX, "")
    .trim();
}

/**
 * Formats natural earthquake notification body without damage claims.
 * Example:
 * "Gempa berkekuatan M 5.2 dengan kedalaman 10 km terdeteksi di wilayah Jawa Barat. Toko Babakan Sari (SAT-B017) berada dalam radius pemantauan 35 km."
 */
export function formatEarthquakeNotificationBody(params: {
  magnitude: number | string;
  depthKm?: number | string | null;
  region?: string | null;
  storeName?: string | null;
  storeCode?: string | null;
  radiusKm?: number | string | null;
  customBody?: string | null;
}): string {
  if (params.customBody) {
    const cleaned = cleanDisplayText(params.customBody);
    if (cleaned.length > 0) return cleaned;
  }

  const mag = params.magnitude || "5.0";
  const depth = params.depthKm ? ` dengan kedalaman ${params.depthKm} km` : "";
  const region = params.region ? ` di wilayah ${params.region}` : "";
  
  let storePart = "";
  if (params.storeName) {
    const code = params.storeCode ? ` (${params.storeCode})` : "";
    const radius = params.radiusKm ? ` berada dalam radius pemantauan ${params.radiusKm} km.` : " berada dalam radius zona pemantauan.";
    storePart = ` Toko ${params.storeName}${code}${radius}`;
  }

  return `Gempa berkekuatan M ${mag}${depth} terdeteksi${region}.${storePart}`.trim();
}

/**
 * Formats Indonesian WIB timestamp for notification banners and cards.
 * Example: "14.07 WIB · SPARTA SIAGA"
 */
export function formatNotificationWibTimestamp(
  dateInput?: string | Date | null,
  includeAppTag: boolean = true
): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return includeAppTag ? "WIB · SPARTA SIAGA" : "WIB";

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}.${minutes} WIB`;

    return includeAppTag ? `${timeStr} · SPARTA SIAGA` : timeStr;
  } catch {
    return includeAppTag ? "WIB · SPARTA SIAGA" : "WIB";
  }
}

/**
 * Standardized status labels in human Indonesian (no raw technical enums).
 */
export function humanizeDocumentStatus(docKey: string, isAvailable: boolean): string {
  const docLabels: Record<string, string> = {
    CEKLIS: "Ceklis Lapangan",
    ESTIMASI: "Estimasi Biaya",
    APPROVE_PROXY: "Approve Proxy",
    SPK: "Surat Perintah Kerja (SPK)",
    SERAH_TERIMA: "Dokumen Serah Terima",
  };

  const name = docLabels[docKey] || docKey;
  return isAvailable ? `Dokumen ${name} tersedia` : `Dokumen ${name} belum diunggah`;
}
