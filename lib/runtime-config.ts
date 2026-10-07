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

function getNodeEnvironment(value: string | undefined): NodeEnvironment {
  if (value === "production" || value === "test") return value;
  return "development";
}

function requireValue(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
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
  const selectedName = names.find((name) => env[name]?.trim());
  if (!selectedName) return undefined;

  try {
    const url = new URL(env[selectedName]!.trim());
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
  maximum: number
): number {
  const raw = env[name]?.trim();
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

function getDatabaseSslMode(env: NodeJS.ProcessEnv, nodeEnv: NodeEnvironment): DatabaseSslMode {
  const value = env.DATABASE_SSL_MODE?.trim() || (nodeEnv === "production" ? "require" : "disable");
  if (value !== "disable" && value !== "require" && value !== "verify-full") {
    throw new RuntimeConfigError("DATABASE_SSL_MODE must be disable, require, or verify-full");
  }
  if (value === "verify-full" && !env.DATABASE_SSL_CA_BASE64?.trim()) {
    throw new RuntimeConfigError("DATABASE_SSL_CA_BASE64 is required for verify-full");
  }
  return value;
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
  const databaseUrl = parsePostgresUrl(requireValue(env, "DATABASE_URL"));
  const privateStorageRoot = env.PRIVATE_STORAGE_ROOT?.trim()
    || (nodeEnv === "production" ? "" : "storage");

  if (!privateStorageRoot) {
    throw new RuntimeConfigError("PRIVATE_STORAGE_ROOT is required in production");
  }
  if (nodeEnv === "production" && !isAbsoluteStoragePath(privateStorageRoot)) {
    throw new RuntimeConfigError("PRIVATE_STORAGE_ROOT must be absolute in production");
  }

  const dbSslMode = getDatabaseSslMode(env, nodeEnv);
  const dbSslCaBase64 = env.DATABASE_SSL_CA_BASE64?.trim();

  return {
    nodeEnv,
    databaseUrl,
    jwtSecret: getJwtSecret(env),
    workerSecret: getWorkerSecret(env, nodeEnv),
    appUrl: parseOptionalUrl(env, ["APP_BASE_URL", "NEXT_PUBLIC_APP_URL"], nodeEnv),
    spartaApiUrl: parseOptionalUrl(env, ["SPARTA_API_URL"], nodeEnv),
    spartaLoginUrl: parseOptionalUrl(env, ["SPARTA_LOGIN_URL"], nodeEnv),
    privateStorageRoot,
    dbPoolMax: parseBoundedInteger(env, "DATABASE_POOL_MAX", 10, 1, 50),
    dbConnectionTimeoutMs: parseBoundedInteger(
      env,
      "DATABASE_CONNECTION_TIMEOUT_MS",
      5_000,
      1_000,
      120_000
    ),
    dbIdleTimeoutMs: parseBoundedInteger(
      env,
      "DATABASE_IDLE_TIMEOUT_MS",
      30_000,
      1_000,
      120_000
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

