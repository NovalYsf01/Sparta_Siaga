import fs from "fs/promises";
import path from "path";
import { getPrivateStoragePaths } from "./storage-config";

export function getMilestoneStorageDir(): string {
  return getPrivateStoragePaths().milestones;
}

export interface SaveMilestoneDocumentResult {
  storageKey: string;
  diskPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export function validateMilestoneDocumentMagicBytes(buffer: Buffer): {
  valid: boolean;
  mimeType: string;
  extension: string;
} {
  if (buffer.length < 4) {
    return { valid: false, mimeType: "", extension: "" };
  }

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, mimeType: "application/pdf", extension: "pdf" };
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png", extension: "png" };
  }

  // WEBP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: "image/webp", extension: "webp" };
  }

  return { valid: false, mimeType: "", extension: "" };
}

export async function saveMilestoneDocument(
  buffer: Buffer,
  reportId: string,
  milestoneKey: string,
  originalFilename?: string
): Promise<SaveMilestoneDocumentResult> {
  const { valid, mimeType, extension } = validateMilestoneDocumentMagicBytes(buffer);
  if (!valid) {
    throw new Error("Berkas harus berupa PDF, JPEG, JPG, atau PNG yang valid.");
  }

  const storageDir = getMilestoneStorageDir();
  await fs.mkdir(storageDir, { recursive: true });

  const sanitizedReportId = reportId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const sanitizedKey = milestoneKey.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storageKey = `doc_${sanitizedReportId}_${sanitizedKey}_${uniqueSuffix}.${extension}`;
  const diskPath = path.join(storageDir, storageKey);

  await fs.writeFile(diskPath, buffer);

  const cleanFilename = originalFilename
    ? path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_")
    : storageKey;

  return {
    storageKey,
    diskPath,
    fileName: cleanFilename,
    fileSize: buffer.length,
    mimeType,
    url: `/api/incidents/${encodeURIComponent(reportId)}/milestones/document/${encodeURIComponent(storageKey)}`,
  };
}

export async function getMilestoneDocumentFile(
  storageKey: string
): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSize: number;
} | null> {
  if (
    !storageKey ||
    storageKey.includes("..") ||
    storageKey.includes("/") ||
    storageKey.includes("\\")
  ) {
    return null;
  }

  const storageDir = getMilestoneStorageDir();
  const filePath = path.join(storageDir, storageKey);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return null;

    const buffer = await fs.readFile(filePath);
    const ext = path.extname(storageKey).toLowerCase();
    const mimeType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

    return {
      buffer,
      mimeType,
      fileName: storageKey,
      fileSize: buffer.length,
    };
  } catch {
    return null;
  }
}
