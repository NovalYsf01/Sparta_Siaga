import { Pool } from "pg";
import { getRuntimeConfig } from "./runtime-config";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const config = getRuntimeConfig();
    const rawConnectionString = config.databaseUrl;

    const connectionString = rawConnectionString.replace(/\?sslmode=[^&]+/, "");

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[Database Pool] Unexpected error on idle client:", err);
    });
  }

  return pool;
}
