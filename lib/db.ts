import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    let rawConnectionString =
      process.env.DATABASE_URL ||
      "postgres://avnadmin:AVNS_8sX6jLeh-dd1i1HLGnY@sparta-sentinel-db-sparta-sentinel-project.k.aivencloud.com:15196/defaultdb";

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
