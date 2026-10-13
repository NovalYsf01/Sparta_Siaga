import fs from "fs/promises";
import path from "path";
import { getPrivateStoragePaths } from "./storage-config";

export function getInspectionStorageDir(): string {
  return getPrivateStoragePaths().inspection;
}

export interface SaveInspectionPhotoResult {
  photoId: string;
  storageKey: string;
  originalStorageKey: string;
  diskPath: string;
  originalDiskPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

/**
 * Menyimpan foto bukti pemeriksaan (original + watermarked) ke private storage (storage/inspection/).
 */
export async function saveInspectionPhoto(
  originalBuffer: Buffer,
  watermarkedBuffer: Buffer,
  reportId: string,
  mimeType: string,
  originalFilename?: string
): Promise<SaveInspectionPhotoResult> {
  const storageDir = getInspectionStorageDir();
  await fs.mkdir(storageDir, { recursive: true });

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const sanitizedReportId = reportId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const photoId = `insp_${uniqueId}`;

  const wmStorageKey = `wm_${sanitizedReportId}_${uniqueId}.${ext}`;
  const origStorageKey = `orig_${sanitizedReportId}_${uniqueId}.${ext}`;

  const wmDiskPath = path.join(storageDir, wmStorageKey);
  const origDiskPath = path.join(storageDir, origStorageKey);

  await fs.writeFile(origDiskPath, originalBuffer);
  await fs.writeFile(wmDiskPath, watermarkedBuffer);

  const cleanFilename = originalFilename
    ? path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_")
    : wmStorageKey;

  return {
    photoId,
    storageKey: wmStorageKey,
    originalStorageKey: origStorageKey,
    diskPath: wmDiskPath,
    originalDiskPath: origDiskPath,
    fileName: cleanFilename,
    fileSize: originalBuffer.length,
    mimeType,
    url: `/api/incidents/${encodeURIComponent(reportId)}/inspection/evidence/${encodeURIComponent(wmStorageKey)}`,
  };
}

/**
 * Mengambil berkas foto pemeriksaan dari private storage secara aman.
 * Melindungi dari path traversal vulnerability.
 */
export async function getInspectionPhotoFile(
  storageKeyOrId: string
): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSize: number;
} | null> {
  if (
    !storageKeyOrId ||
    storageKeyOrId.includes("..") ||
    storageKeyOrId.includes("/") ||
    storageKeyOrId.includes("\\")
  ) {
    return null;
  }

  const storageDir = getInspectionStorageDir();
  const filePath = path.join(storageDir, storageKeyOrId);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return null;

    const buffer = await fs.readFile(filePath);
    const ext = path.extname(storageKeyOrId).toLowerCase();
    const mimeType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

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
