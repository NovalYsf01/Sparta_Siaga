import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

function localEnvironment() {
  const source = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
  const result: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) result[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  const isolated = result.SPARTA_ISOLATED_TEST_DATABASE_URL;
  if (!isolated || new URL(isolated).pathname !== "/sparta_siaga_isolated") {
    throw new Error("Playwright refuses to start without sparta_siaga_isolated.");
  }
  process.env.DATABASE_URL = isolated;
  process.env.DATABASE_SSL_MODE = "require";
  if (result.JWT_SECRET) process.env.JWT_SECRET = result.JWT_SECRET;
  return {
    ...process.env,
    DATABASE_URL: isolated,
    DATABASE_SSL_MODE: "require",
    DATABASE_POOL_MAX: "2",
    SPARTA_API_URL: "https://sparta.test.invalid",
    SPARTA_LOGIN_URL: "https://sparta.test.invalid/login",
    APP_BASE_URL: "https://siaga.test.invalid",
    NEXT_PUBLIC_APP_URL: "https://siaga.test.invalid",
    PRIVATE_STORAGE_ROOT: path.resolve(process.cwd(), "storage"),
    SPARTA_INTERNAL_WORKER_SECRET: "playwright-isolated-worker-secret-32-chars",
  } as Record<string, string>;
}

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "artifacts/phase2/test-results",
  timeout: 90_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3014",
    launchOptions: { executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm.cmd exec next start -p 3014",
    url: "http://127.0.0.1:3014/api/health/live",
    timeout: 120_000,
    reuseExistingServer: false,
    env: localEnvironment(),
  },
});
