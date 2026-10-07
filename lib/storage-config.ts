import fs from "fs/promises";
import path from "path";

export interface StoragePaths {
  root: string;
  readiness: string;
  progress: string;
}

export class StorageConfigError extends Error {
  readonly code: string;

  constructor(message: string, code: string = "INVALID_STORAGE_CONFIG") {
    super(message);
    this.name = "StorageConfigError";
    this.code = code;
  }
}

export function getPrivateStoragePaths(overrideRoot?: string): StoragePaths {
  const root = overrideRoot
    ? path.resolve(overrideRoot)
    : process.env.PRIVATE_STORAGE_ROOT?.trim()
      ? path.resolve(process.env.PRIVATE_STORAGE_ROOT.trim())
      : path.resolve(process.cwd(), "storage");

  return {
    root,
    readiness: path.join(root, "readiness"),
    progress: path.join(root, "progress"),
  };
}

export async function validatePrivateStorage(rootToCheck?: string): Promise<StoragePaths> {
  const paths = getPrivateStoragePaths(rootToCheck);
  const resolvedRoot = paths.root;

  // Check if root is equal to or inside public/
  const publicDir = path.resolve(process.cwd(), "public");
  const relative = path.relative(publicDir, resolvedRoot);
  const isInsidePublic = !relative.startsWith("..") && !path.isAbsolute(relative);
  const isPublicDir = resolvedRoot === publicDir;

  if (isInsidePublic || isPublicDir) {
    throw new StorageConfigError(
      "Private storage root cannot be located inside or equal to public directory",
      "PRIVATE_STORAGE_PUBLIC"
    );
  }

  // Create directories recursively
  await fs.mkdir(paths.root, { recursive: true });
  await fs.mkdir(paths.readiness, { recursive: true });
  await fs.mkdir(paths.progress, { recursive: true });

  // Perform a randomized create/write/read/delete probe
  const probeFilename = `.probe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const probePath = path.join(paths.root, probeFilename);
  const probeData = Buffer.from(`probe_${Date.now()}_${Math.random()}`);

  try {
    await fs.writeFile(probePath, probeData);
    const readBack = await fs.readFile(probePath);
    if (!readBack.equals(probeData)) {
      throw new StorageConfigError("Probe readback data mismatch", "STORAGE_PROBE_FAILED");
    }
    await fs.unlink(probePath);
  } catch (error: unknown) {
    if (error instanceof StorageConfigError) throw error;
    const message = error instanceof Error ? error.message : "unknown error";
    throw new StorageConfigError(
      `Private storage write probe failed: ${message}`,
      "STORAGE_PROBE_FAILED"
    );
  }

  return paths;
}
