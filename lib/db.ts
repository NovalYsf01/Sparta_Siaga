import { Pool, PoolConfig } from "pg";
import { getRuntimeConfig } from "./runtime-config";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

export function getDbPool(): Pool {
  if (!globalForDb.pool) {
    const config = getRuntimeConfig();
    const rawConnectionString = config.databaseUrl;

    const connectionString = rawConnectionString.replace(/\?sslmode=[^&]+/, "");

    const poolConfig: PoolConfig = {
      connectionString,
      max: config.dbPoolMax,
      idleTimeoutMillis: config.dbIdleTimeoutMs,
      connectionTimeoutMillis: config.dbConnectionTimeoutMs,
    };

    if (config.dbSslMode === "disable") {
      poolConfig.ssl = false;
    } else if (config.dbSslMode === "verify-full") {
      poolConfig.ssl = {
        rejectUnauthorized: true,
        ca: config.dbSslCa,
      };
    } else {
      // "require" or default
      poolConfig.ssl = {
        rejectUnauthorized: false,
      };
    }

    globalForDb.pool = new Pool(poolConfig);

    globalForDb.pool.on("error", (err) => {
      console.error("[Database Pool] Unexpected error on idle client:", err);
    });
  }

  return globalForDb.pool;
}

export async function closeDbPool(): Promise<void> {
  const active = globalForDb.pool;
  globalForDb.pool = undefined;
  if (active) {
    await active.end();
  }
}
