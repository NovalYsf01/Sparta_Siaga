import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

export interface WatermarkOptions {
  reportId: string;
  reportNumber?: string; // User-facing report number (e.g. LAP-MAN-2026-0042)
  storeName?: string; // Store name (e.g. Alfamart Mekarwangi)
  progressPercentage: number;
  actorName?: string;
  photoType?: "PROGRESS" | "FINAL" | "HANDOVER";
  customDate?: Date; // Optional server-trusted date override (default: new Date())
}

export interface WatermarkResult {
  originalPath: string; // URL accessible path, e.g. /uploads/progress/orig_...
  watermarkedPath: string; // URL accessible path, e.g. /uploads/progress/wm_...
  originalDiskPath: string;
  watermarkedDiskPath: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  watermarkTimestamp: string;
}

// Magic bytes validation for image security
export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; mimeType: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false, mimeType: "unknown" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png" };
  }

  // WEBP: RIFF .... WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return { valid: true, mimeType: "image/webp" };
  }

  return { valid: false, mimeType: "unknown" };
}

/**
 * Format server timestamp in Indonesian format (WIB)
 * Example: 06 Oktober 2026 • 14:35 WIB
 */
export function formatServerTimestampWib(date: Date = new Date()): string {
  const fullMonths = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Force Asia/Jakarta timezone
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const day = getPart("day");
  const monthIdx = parseInt(getPart("month"), 10) - 1;
  const monthName = fullMonths[monthIdx] || "Oktober";
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${day} ${monthName} ${year} • ${hour}:${minute} WIB`;
}

/**
 * Applies automated server watermark to image buffer and saves both original and watermarked versions.
 */
export async function processAndWatermarkPhoto(
  inputBuffer: Buffer,
  options: WatermarkOptions
): Promise<WatermarkResult> {
  // 1. Validate magic bytes
  const { valid, mimeType } = validateImageMagicBytes(inputBuffer);
  if (!valid) {
    throw new Error("File bukan format gambar yang valid. Hanya JPEG, PNG, dan WEBP yang diizinkan.");
  }

  // 2. Read image metadata via sharp
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 800;

  // 3. Trusted server timestamp
  const trustedDate = options.customDate || new Date();
  const formattedTimestamp = formatServerTimestampWib(trustedDate);

  // 4. Calculate watermark banner dimensions (crisp at bottom, proportional)
  const bannerHeight = Math.max(90, Math.min(160, Math.round(height * 0.16)));
  const fontSizeHeader = Math.max(14, Math.round(bannerHeight * 0.20));
  const fontSizeBody = Math.max(11, Math.round(bannerHeight * 0.15));
  const paddingX = Math.max(18, Math.round(width * 0.025));

  // Determine label for photo type
  const typeBadge =
    options.photoType === "FINAL"
      ? " [BUKTI FINAL]"
      : options.photoType === "HANDOVER"
      ? " [SERAH TERIMA]"
      : "";

  const displayReportNumber = options.reportNumber || options.reportId;
  const displayStoreName = options.storeName || "Lokasi Pelaporan";

  // SVG overlay for watermark banner (Section M format)
  const svgBanner = `
    <svg width="${width}" height="${bannerHeight}" viewBox="0 0 ${width} ${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0F172A" stop-opacity="0.90" />
          <stop offset="100%" stop-color="#020617" stop-opacity="0.98" />
        </linearGradient>
      </defs>
      <!-- Background Bar -->
      <rect x="0" y="0" width="${width}" height="${bannerHeight}" fill="url(#bgGrad)" />
      <!-- Accent Line (Top Blue) -->
      <rect x="0" y="0" width="${width}" height="4" fill="#2563EB" />
      
      <!-- Left Column: SPARTA SIAGA, No. Laporan, Toko -->
      <text x="${paddingX}" y="${Math.round(bannerHeight * 0.32)}" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSizeHeader}px" letter-spacing="1">
        SPARTA SIAGA${typeBadge}
      </text>
      <text x="${paddingX}" y="${Math.round(bannerHeight * 0.60)}" fill="#93C5FD" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="${fontSizeBody}px">
        No. Laporan: ${escapeXml(displayReportNumber)}
      </text>
      <text x="${paddingX}" y="${Math.round(bannerHeight * 0.84)}" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="${fontSizeBody}px">
        Toko: ${escapeXml(displayStoreName)}
      </text>

      <!-- Right Column: Trusted Server Timestamp & Progress % -->
      <text x="${width - paddingX}" y="${Math.round(bannerHeight * 0.38)}" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="${fontSizeBody}px" text-anchor="end">
        ${escapeXml(formattedTimestamp)}
      </text>
      <text x="${width - paddingX}" y="${Math.round(bannerHeight * 0.78)}" fill="#38BDF8" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${fontSizeHeader}px" text-anchor="end">
        Progress: ${options.progressPercentage}%
      </text>
    </svg>
  `.trim();

  // 5. Composite watermark at the bottom of the photo
  const topPosition = Math.max(0, height - bannerHeight);
  const watermarkedBuffer = await sharp(inputBuffer)
    .composite([
      {
        input: Buffer.from(svgBanner),
        top: topPosition,
        left: 0,
      },
    ])
    .toBuffer();

  // 6. Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "public", "uploads", "progress");
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const origFileName = `orig_${options.reportId}_${uniqueId}.${ext}`;
  const wmFileName = `wm_${options.reportId}_${uniqueId}.${ext}`;

  const origDiskPath = path.join(uploadDir, origFileName);
  const wmDiskPath = path.join(uploadDir, wmFileName);

  // 7. Write both files (non-destructive)
  await fs.writeFile(origDiskPath, inputBuffer);
  await fs.writeFile(wmDiskPath, watermarkedBuffer);

  return {
    originalPath: `/uploads/progress/${origFileName}`,
    watermarkedPath: `/uploads/progress/${wmFileName}`,
    originalDiskPath: origDiskPath,
    watermarkedDiskPath: wmDiskPath,
    mimeType,
    fileSize: inputBuffer.length,
    width,
    height,
    watermarkTimestamp: formattedTimestamp,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}
