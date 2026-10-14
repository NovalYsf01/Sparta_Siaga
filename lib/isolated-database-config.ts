import fs from "node:fs";
import path from "node:path";

import { ISOLATED_DATABASE_NAME } from "./database-safety";

export function loadIsolatedDatabaseUrl(): string {
  const envFile = path.resolve(process.cwd(), ".env.local");
  const content = fs.readFileSync(envFile, "utf8");
  const match = content.match(
    /^\s*SPARTA_ISOLATED_TEST_DATABASE_URL\s*=\s*(.*?)\s*$/m
  );
  const raw = match?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!raw) {
    throw new Error("SPARTA_ISOLATED_TEST_DATABASE_URL tidak ditemukan.");
  }
  const parsed = new URL(raw);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (databaseName !== ISOLATED_DATABASE_NAME) {
    throw new Error(
      `Refusing database write: configured database is "${databaseName || "unknown"}".`
    );
  }
  return raw;
}

export function selectIsolatedDatabaseEnvironment(): void {
  process.env.DATABASE_URL = loadIsolatedDatabaseUrl();
  process.env.DATABASE_SSL_MODE = "require";
}
