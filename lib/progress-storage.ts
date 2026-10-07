/**
 * SPARTA SIAGA — Private Progress Photo Storage Service
 * 
 * Task 4: Menyimpan foto progress dan final/handover evidence di private storage
 * (storage/progress/) di LUAR public directory Next.js.
 * 
 * Reuses arsitektur Task 3 (Work Readiness private storage).
 * 
 * Pattern:
 *   Upload → Validation → Server Watermark → Private Storage → Protected API Endpoint
 * 
 * TIDAK ADA foto progress/final/handover yang disajikan dari public/uploads/progress/.
 */
import fs from "fs/promises";
import path from "path";

export const PROGRESS_STORAGE_DIR = path.join(process.cwd(), "storage", "progress");

export interface SaveProgressPhotoResult {
  photoId: string;
  storageKey: string;
  originalStorageKey: string;
  diskPath: string;
  originalDiskPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Menyimpan foto progress (original + watermarked) ke private storage.
 * Kedua file disimpan di storage/progress/ (bukan public/).
 */
export async function saveProgressPhoto(
  originalBuffer: Buffer,
  watermarkedBuffer: Buffer,
  reportId: string,
  mimeType: string,
  originalFilename?: string
): Promise<SaveProgressPhotoResult> {
  await fs.mkdir(PROGRESS_STORAGE_DIR, { recursive: true });

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const sanitizedReportId = reportId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const photoId = `pht_${uniqueId}`;

  const wmStorageKey = `wm_${sanitizedReportId}_${uniqueId}.${ext}`;
  const origStorageKey = `orig_${sanitizedReportId}_${uniqueId}.${ext}`;

  const wmDiskPath = path.join(PROGRESS_STORAGE_DIR, wmStorageKey);
  const origDiskPath = path.join(PROGRESS_STORAGE_DIR, origStorageKey);

  await fs.writeFile(origDiskPath, originalBuffer);
  await fs.writeFile(wmDiskPath, watermarkedBuffer);

  return {
    photoId,
    storageKey: wmStorageKey,
    originalStorageKey: origStorageKey,
    diskPath: wmDiskPath,
    originalDiskPath: origDiskPath,
    fileName: originalFilename
      ? path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_")
      : wmStorageKey,
    fileSize: originalBuffer.length,
    mimeType,
  };
}

/**
 * Mengambil file foto progress dari private storage secara aman.
 * Mencegah path traversal dan memvalidasi integritas lokasi berkas.
 * 
 * Mendukung fallback migrasi dari legacy public/uploads/progress/.
 */
export async function getProgressPhotoFile(
  storageKeyOrId: string
): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSize: number;
} | null> {
  // 1. Path traversal guard
  if (
    !storageKeyOrId ||
    storageKeyOrId.includes("..") ||
    storageKeyOrId.includes("/") ||
    storageKeyOrId.includes("\\")
  ) {
    return null;
  }

  // 2. Resolve di private storage
  const storageDir = path.resolve(PROGRESS_STORAGE_DIR);
  const resolvedPath = path.resolve(storageDir, storageKeyOrId);

  // Anti-traversal: resolved path HARUS di dalam storage directory
  if (!resolvedPath.startsWith(storageDir)) {
    return null;
  }

  // Deteksi MIME dari extension
  const ext = path.extname(storageKeyOrId).toLowerCase();
  let mimeType = "image/jpeg";
  if (ext === ".png") mimeType = "image/png";
  else if (ext === ".webp") mimeType = "image/webp";

  try {
    const buffer = await fs.readFile(resolvedPath);
    return {
      buffer,
      mimeType,
      fileName: storageKeyOrId,
      fileSize: buffer.length,
    };
  } catch {
    // 3. Fallback: cek legacy public/uploads/progress/
    const legacyDir = path.resolve(process.cwd(), "public", "uploads", "progress");
    const legacyPath = path.resolve(legacyDir, storageKeyOrId);

    // Anti-traversal guard untuk legacy path
    if (!legacyPath.startsWith(legacyDir)) {
      return null;
    }

    try {
      const buffer = await fs.readFile(legacyPath);

      // Migrasi otomatis ke private storage
      await fs.mkdir(storageDir, { recursive: true });
      await fs.writeFile(resolvedPath, buffer);
      // Hapus dari public agar tidak lagi publik-accessible
      await fs.unlink(legacyPath).catch(() => {});

      return {
        buffer,
        mimeType,
        fileName: storageKeyOrId,
        fileSize: buffer.length,
      };
    } catch {
      return null;
    }
  }
}
