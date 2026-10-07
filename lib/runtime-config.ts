import fs from "node:fs";
import path from "node:path";

export type NodeEnvironment = "development" | "test" | "production";
export type DatabaseSslMode = "disable" | "require" | "verify-full";

export interface RuntimeConfig {
  nodeEnv: NodeEnvironment;
  databaseUrl: string;
  jwtSecret: string;
  workerSecret: string;
  appUrl?: URL;
  spartaApiUrl?: URL;
  spartaLoginUrl?: URL;
  privateStorageRoot: string;
  dbPoolMax: number;
  dbConnectionTimeoutMs: number;
  dbIdleTimeoutMs: number;
  dbSslMode: DatabaseSslMode;
  dbSslCa?: string;
}

export class RuntimeConfigError extends Error {
  readonly code = "INVALID_RUNTIME_CONFIG";

  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigError";
  }
}

const DEVELOPMENT_JWT_SECRET = "sparta-siaga-development-jwt-secret-only";
const DEVELOPMENT_WORKER_SECRET = "sparta-siaga-development-worker-secret-only";

let localEnvCache: Record<string, string> | null = null;

function loadLocalEnvFile(): Record<string, string> {
  const loaded: Record<string, string> = {};
  for (const filename of [".env.local", ".env"]) {
    try {
      const fullPath = path.join(process.cwd(), filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let val = (match[2] || "").trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (loaded[key] === undefined) {
              loaded[key] = val;
            }
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // ignore missing files
    }
  }
  return loaded;
}

function getNodeEnvironment(value: string | undefined): NodeEnvironment {
  if (value === "production" || value === "test") return value;
  return "development";
}

function getEnvValue(env: NodeJS.ProcessEnv, name: string, nodeEnv: NodeEnvironment): string | undefined {
  const val = env[name]?.trim();
  if (val) return val;
  if (nodeEnv !== "production") {
    if (!localEnvCache) {
      localEnvCache = loadLocalEnvFile();
    }
    return localEnvCache[name];
  }
  return undefined;
}

function requireValue(env: NodeJS.ProcessEnv, name: string, nodeEnv: NodeEnvironment): string {
  const value = getEnvValue(env, name, nodeEnv);
  if (!value) throw new RuntimeConfigError(`${name} is required`);
  return value;
}

function parsePostgresUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      throw new Error("unsupported protocol");
    }
    return raw;
  } catch {
    throw new RuntimeConfigError("DATABASE_URL must be a valid PostgreSQL URL");
  }
}

function parseOptionalUrl(
  env: NodeJS.ProcessEnv,
  names: string[],
  nodeEnv: NodeEnvironment
): URL | undefined {
  const selectedName = names.find((name) => getEnvValue(env, name, nodeEnv));
  if (!selectedName) return undefined;

  try {
    const raw = getEnvValue(env, selectedName, nodeEnv)!;
    const url = new URL(raw);
    if (nodeEnv === "production" && url.protocol !== "https:") {
      throw new RuntimeConfigError(`${selectedName} must use HTTPS in production`);
    }
    return url;
  } catch (error) {
    if (error instanceof RuntimeConfigError) throw error;
    throw new RuntimeConfigError(`${selectedName} must be a valid URL`);
  }
}

function parseBoundedInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
  nodeEnv: NodeEnvironment
): number {
  const raw = getEnvValue(env, name, nodeEnv);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RuntimeConfigError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function isAbsoluteStoragePath(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function getDatabaseSslMode(
  env: NodeJS.ProcessEnv,
  nodeEnv: NodeEnvironment,
  databaseUrl?: string
): DatabaseSslMode {
  const value = getEnvValue(env, "DATABASE_SSL_MODE", nodeEnv);
  if (value) {
    if (value !== "disable" && value !== "require" && value !== "verify-full") {
      throw new RuntimeConfigError("DATABASE_SSL_MODE must be disable, require, or verify-full");
    }
    if (value === "verify-full" && !getEnvValue(env, "DATABASE_SSL_CA_BASE64", nodeEnv)) {
      throw new RuntimeConfigError("DATABASE_SSL_CA_BASE64 is required for verify-full");
    }
    return value;
  }
  if (databaseUrl && /sslmode=require/i.test(databaseUrl)) {
    return "require";
  }
  return nodeEnv === "production" ? "require" : "disable";
}

export function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const nodeEnv = getNodeEnvironment(env.NODE_ENV);
  const secret = env.JWT_SECRET?.trim() || (nodeEnv === "production" ? "" : DEVELOPMENT_JWT_SECRET);
  if (!secret || (nodeEnv === "production" && secret.length < 32)) {
    throw new RuntimeConfigError("JWT_SECRET must contain at least 32 characters in production");
  }
  return secret;
}

function getWorkerSecret(env: NodeJS.ProcessEnv, nodeEnv: NodeEnvironment): string {
  const secret = env.SPARTA_INTERNAL_WORKER_SECRET?.trim()
    || (nodeEnv === "production" ? "" : DEVELOPMENT_WORKER_SECRET);
  if (!secret || (nodeEnv === "production" && secret.length < 32)) {
    throw new RuntimeConfigError(
      "SPARTA_INTERNAL_WORKER_SECRET must contain at least 32 characters in production"
    );
  }
  return secret;
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnv = getNodeEnvironment(env.NODE_ENV);
  const databaseUrl = parsePostgresUrl(requireValue(env, "DATABASE_URL", nodeEnv));
  const privateStorageRoot = getEnvValue(env, "PRIVATE_STORAGE_ROOT", nodeEnv)
    || (nodeEnv === "production" ? "" : "storage");

  if (!privateStorageRoot) {
    throw new RuntimeConfigError("PRIVATE_STORAGE_ROOT is required in production");
  }
  if (nodeEnv === "production" && !isAbsoluteStoragePath(privateStorageRoot)) {
    throw new RuntimeConfigError("PRIVATE_STORAGE_ROOT must be absolute in production");
  }

  const dbSslMode = getDatabaseSslMode(env, nodeEnv, databaseUrl);
  const dbSslCaBase64 = getEnvValue(env, "DATABASE_SSL_CA_BASE64", nodeEnv);

  return {
    nodeEnv,
    databaseUrl,
    jwtSecret: getJwtSecret(env),
    workerSecret: getWorkerSecret(env, nodeEnv),
    appUrl: parseOptionalUrl(env, ["APP_BASE_URL", "NEXT_PUBLIC_APP_URL"], nodeEnv),
    spartaApiUrl: parseOptionalUrl(env, ["SPARTA_API_URL"], nodeEnv),
    spartaLoginUrl: parseOptionalUrl(env, ["SPARTA_LOGIN_URL"], nodeEnv),
    privateStorageRoot,
    dbPoolMax: parseBoundedInteger(env, "DATABASE_POOL_MAX", 10, 1, 50, nodeEnv),
    dbConnectionTimeoutMs: parseBoundedInteger(
      env,
      "DATABASE_CONNECTION_TIMEOUT_MS",
      5_000,
      1_000,
      120_000,
      nodeEnv
    ),
    dbIdleTimeoutMs: parseBoundedInteger(
      env,
      "DATABASE_IDLE_TIMEOUT_MS",
      30_000,
      1_000,
      120_000,
      nodeEnv
    ),
    dbSslMode,
    dbSslCa: dbSslCaBase64
      ? Buffer.from(dbSslCaBase64, "base64").toString("utf8")
      : undefined,
  };
}

export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return getRuntimeConfig({ ...env, NODE_ENV: "production" });
}
