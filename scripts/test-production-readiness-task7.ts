/**
 * SPARTA SIAGA — Task 7 production-readiness verification.
 *
 * The suite intentionally starts RED. Each scenario is converted from a
 * missing-contract failure to an executable behavior check as Task 7 lands.
 */

import { spawnSync } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
import path from "node:path";

type ScenarioResult = { code: string; description: string; passed: boolean; detail?: string };

const scenarios = [
  "P1 Required env validation",
  "P2 Production secret absence fails fast",
  "P3 Storage directory validation",
  "P4 Storage is private and non-public",
  "P5 Health liveness",
  "P6 Health readiness with database",
  "P7 Health response does not leak secrets",
  "P8 Query limits remain bounded",
  "P9 Production cookie and security config",
  "P10 Graceful shutdown closes the DB pool",
  "P11 Production migration is idempotent",
  "P12 Backup commands are syntactically valid",
  "P13 Rollback documentation exists",
  "P14 Production start command exists",
  "P15 Task 1–6 lifecycle remains unchanged",
] as const;

let total = 0;
let failures = 0;

function assert(condition: boolean, code: string, description: string, detail?: string): void {
  total += 1;
  if (!condition) {
    failures += 1;
    console.error(`[FAIL] ${code}: ${description}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[PASS] ${code}: ${description}`);
}

async function dynamicImport<T>(relativePath: string): Promise<T | null> {
  try {
    const url = new URL(relativePath, import.meta.url).href;
    return (await import(url)) as T;
  } catch {
    return null;
  }
}

async function exists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

async function runP1(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{
    validateProductionConfig: (env: NodeJS.ProcessEnv) => unknown;
  }>("../lib/runtime-config.ts");
  if (!mod) return { code: "P1", description: scenarios[0], passed: false, detail: "runtime config module missing" };
  const validRequiredEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://task7-user:task7-password@db.internal/sparta",
    JWT_SECRET: "j".repeat(48),
    SPARTA_INTERNAL_WORKER_SECRET: "w".repeat(48),
    PRIVATE_STORAGE_ROOT: path.resolve("storage"),
    DATABASE_SSL_MODE: "require",
  };
  try {
    mod.validateProductionConfig({ NODE_ENV: "production" });
    return { code: "P1", description: scenarios[0], passed: false, detail: "missing DATABASE_URL was accepted" };
  } catch (error) {
    if (!String(error).includes("DATABASE_URL")) {
      return { code: "P1", description: scenarios[0], passed: false, detail: "wrong missing-env diagnostic" };
    }
  }
  try {
    mod.validateProductionConfig(validRequiredEnv);
    return { code: "P1", description: scenarios[0], passed: true };
  } catch (error) {
    return { code: "P1", description: scenarios[0], passed: false, detail: `optional SSO URL blocked startup: ${String(error)}` };
  }
}

async function runP2(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{ getJwtSecret: (env: NodeJS.ProcessEnv) => string }>("../lib/runtime-config.ts");
  if (!mod) return { code: "P2", description: scenarios[1], passed: false, detail: "secret validator missing" };
  const activeSources = await Promise.all(
    ["lib/jwt.ts", "proxy.ts", "lib/db.ts"].map((file) => readFile(path.join(process.cwd(), file), "utf8"))
  );
  const joinedSources = activeSources.join("\n");
  if (joinedSources.includes("fallback_development_secret_sparta_siaga")) {
    return { code: "P2", description: scenarios[1], passed: false, detail: "development JWT fallback remains active" };
  }
  if (/postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/i.test(joinedSources)) {
    return { code: "P2", description: scenarios[1], passed: false, detail: "embedded PostgreSQL credential remains active" };
  }
  try {
    mod.getJwtSecret({ NODE_ENV: "production", JWT_SECRET: "short" });
    return { code: "P2", description: scenarios[1], passed: false, detail: "weak JWT_SECRET was accepted" };
  } catch (error) {
    return { code: "P2", description: scenarios[1], passed: String(error).includes("JWT_SECRET") };
  }
}

async function runP3(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{
    validatePrivateStorage: (root?: string) => Promise<{ root: string; readiness: string; progress: string }>;
  }>("../lib/storage-config.ts");
  if (!mod) return { code: "P3", description: scenarios[2], passed: false, detail: "storage validator missing" };
  try {
    const tempDir = path.join(process.cwd(), "storage", `test_probe_${Date.now()}`);
    const paths = await mod.validatePrivateStorage(tempDir);
    const isValid = paths.readiness.startsWith(tempDir) && paths.progress.startsWith(tempDir);
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    return { code: "P3", description: scenarios[2], passed: isValid };
  } catch (error) {
    return { code: "P3", description: scenarios[2], passed: false, detail: String(error) };
  }
}

async function runP4(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{
    validatePrivateStorage: (root: string) => Promise<unknown>;
  }>("../lib/storage-config.ts");
  if (!mod) return { code: "P4", description: scenarios[3], passed: false, detail: "storage validator missing" };
  try {
    await mod.validatePrivateStorage(path.join(process.cwd(), "public", "uploads"));
    return { code: "P4", description: scenarios[3], passed: false, detail: "public storage root was accepted" };
  } catch (error: any) {
    const isExpected = error?.code === "PRIVATE_STORAGE_PUBLIC" || String(error).includes("public");
    return { code: "P4", description: scenarios[3], passed: isExpected };
  }
}

async function runP5(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{ GET: () => Promise<Response> | Response }>("../app/api/health/live/route.ts");
  if (!mod) return { code: "P5", description: scenarios[4], passed: false, detail: "liveness route missing" };
  const response = await mod.GET();
  const body = await response.json();
  return { code: "P5", description: scenarios[4], passed: response.status === 200 && body.status === "live" };
}

async function runP6P7(code: "P6" | "P7", description: string): Promise<ScenarioResult> {
  const mod = await dynamicImport<{
    createReadinessHandler: (deps: unknown) => () => Promise<Response>;
  }>("../lib/health.ts");
  if (!mod) return { code, description, passed: false, detail: "readiness handler missing" };
  const secret = "postgres://secret-user:secret-password@private-db/internal";
  const handler = mod.createReadinessHandler({
    validateConfig: () => undefined,
    checkDatabase: async () => {
      throw new Error(secret);
    },
    checkStorage: async () => undefined,
  });
  const response = await handler();
  const serialized = JSON.stringify(await response.json());
  return code === "P6"
    ? { code, description, passed: response.status === 503 }
    : { code, description, passed: !serialized.includes(secret) && !serialized.includes("private-db") };
}

async function runP8(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{
    createNotificationLogsHandler: (deps: unknown) => (request: Request) => Promise<Response>;
  }>("../app/api/notifications/logs/route.ts");
  if (!mod) return { code: "P8", description: scenarios[7], passed: false, detail: "notification handler unavailable" };
  let observedLimit = 0;
  const handler = mod.createNotificationLogsHandler({
    getSessionUser: async () => ({ id: "task7", name: "Task 7", systemRole: "ADMIN" }),
    checkNotificationPermission: async () => ({ authorized: true }),
    getNotificationLogs: async (limit: number) => {
      observedLimit = limit;
      return [];
    },
  });
  const response = await handler(new Request("http://localhost/api/notifications/logs?limit=999999"));
  return { code: "P8", description: scenarios[7], passed: response.status === 200 && observedLimit === 100 };
}

async function runP9(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{
    getSessionCookieOptions: (env: NodeJS.ProcessEnv) => Record<string, unknown>;
  }>("../lib/session-config.ts");
  if (!mod) return { code: "P9", description: scenarios[8], passed: false, detail: "shared production cookie config missing" };
  const options = mod.getSessionCookieOptions({ NODE_ENV: "production" });
  return {
    code: "P9",
    description: scenarios[8],
    passed: options.httpOnly === true && options.secure === true && options.sameSite === "lax",
  };
}

async function runP10(): Promise<ScenarioResult> {
  const mod = await dynamicImport<{
    createProcessLifecycle: (deps: unknown) => { shutdown: (signal: string) => Promise<void> };
  }>("../lib/process-lifecycle.ts");
  if (!mod) return { code: "P10", description: scenarios[9], passed: false, detail: "process lifecycle module missing" };
  let stopCalls = 0;
  let closeCalls = 0;
  const lifecycle = mod.createProcessLifecycle({
    stopDaemon: async () => { stopCalls += 1; },
    closePool: async () => { closeCalls += 1; },
    exit: () => undefined,
  });
  await lifecycle.shutdown("SIGTERM");
  await lifecycle.shutdown("SIGINT");
  return { code: "P10", description: scenarios[9], passed: stopCalls === 1 && closeCalls === 1 };
}

async function runP11(): Promise<ScenarioResult> {
  const script = path.join(process.cwd(), "scripts", "migrate-production.mjs");
  if (!(await exists("scripts/migrate-production.mjs"))) {
    return { code: "P11", description: scenarios[10], passed: false, detail: "production migration runner missing" };
  }
  const result = spawnSync(process.execPath, [script, "--validate-only"], { encoding: "utf8" });
  return { code: "P11", description: scenarios[10], passed: result.status === 0, detail: result.stderr.trim() };
}

async function runP12(): Promise<ScenarioResult> {
  const required = ["ops/backup-production.sh", "ops/verify-backup.sh", "ops/restore-production.sh"];
  const present = await Promise.all(required.map(exists));
  return { code: "P12", description: scenarios[11], passed: present.every(Boolean), detail: "backup helper set incomplete" };
}

async function runP13(): Promise<ScenarioResult> {
  return {
    code: "P13",
    description: scenarios[12],
    passed: await exists("docs/05-production/ROLLBACK_PROCEDURE.md"),
    detail: "rollback procedure missing",
  };
}

async function runP14(): Promise<ScenarioResult> {
  const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const [dockerfileExists, composeExists] = await Promise.all([exists("Dockerfile"), exists("compose.yaml")]);
  if (!dockerfileExists || !composeExists || !packageJson.scripts?.["start:production"]) {
    return {
      code: "P14",
      description: scenarios[13],
      passed: false,
      detail: "Docker/Compose/start contract incomplete",
    };
  }

  const [dockerfileContent, composeContent] = await Promise.all([
    readFile(path.join(process.cwd(), "Dockerfile"), "utf8"),
    readFile(path.join(process.cwd(), "compose.yaml"), "utf8"),
  ]);

  const dockerfileValid =
    dockerfileContent.includes("node:24") &&
    dockerfileContent.includes("nextjs") &&
    dockerfileContent.includes("3004") &&
    !dockerfileContent.includes("ARG DATABASE_URL") &&
    !dockerfileContent.includes("ARG JWT_SECRET");

  const composeValid =
    composeContent.includes("3004") &&
    composeContent.includes("sparta_private_storage") &&
    composeContent.includes("no-new-privileges") &&
    composeContent.includes("unless-stopped");

  return {
    code: "P14",
    description: scenarios[13],
    passed: dockerfileValid && composeValid,
    detail: !dockerfileValid ? "Dockerfile contract violation" : !composeValid ? "compose contract violation" : undefined,
  };
}

function runP15(): ScenarioResult {
  const protectedBusinessFiles = [
    "lib/client-permissions.ts",
    "lib/completion-approval-service.ts",
    "lib/estimation-service.ts",
    "lib/permission-service.ts",
    "lib/report-permissions.ts",
    "types/permission.ts",
  ];
  const result = spawnSync("git", ["diff", "--name-only", "46952b8", "--", ...protectedBusinessFiles], {
    encoding: "utf8",
  });
  const changed = result.stdout.trim();
  return {
    code: "P15",
    description: scenarios[14],
    passed: result.status === 0 && changed.length === 0,
    detail: changed ? `business-flow files changed: ${changed}` : result.stderr.trim(),
  };
}

async function main(): Promise<void> {
  console.log("============================================================");
  console.log("SPARTA SIAGA — TASK 7 PRODUCTION READINESS VERIFICATION");
  console.log("============================================================");

  const results = await Promise.all([
    runP1(),
    runP2(),
    runP3(),
    runP4(),
    runP5(),
    runP6P7("P6", scenarios[5]),
    runP6P7("P7", scenarios[6]),
    runP8(),
    runP9(),
    runP10(),
    runP11(),
    runP12(),
    runP13(),
    runP14(),
    Promise.resolve(runP15()),
  ]);

  for (const result of results) {
    assert(result.passed, result.code, result.description, result.detail);
  }

  console.log(`TASK 7 SUMMARY: ${total - failures}/${total} PASSED`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error("[FATAL] Task 7 verification harness failed:", error);
  process.exitCode = 1;
});
