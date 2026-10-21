import { Client } from "pg";
import { getRuntimeConfig } from "../lib/runtime-config";

async function terminateIdle() {
  const config = getRuntimeConfig();
  const client = new Client({
    connectionString: config.databaseUrl.replace(/\?sslmode=[^&]+/, ""),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Aiven DB. Checking active & idle connections...");

    const checkRes = await client.query(`
      SELECT pid, usename, state, query_start, state_change, query
      FROM pg_stat_activity
      WHERE datname = 'sparta_siaga_isolated'
    `);
    console.log(`Current connections count: ${checkRes.rows.length}`);
    for (const r of checkRes.rows) {
      console.log(`PID ${r.pid} | User: ${r.usename} | State: ${r.state} | Query: ${r.query?.slice(0, 50)}`);
    }

    const termRes = await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'sparta_siaga_isolated'
        AND pid <> pg_backend_pid()
        AND state LIKE 'idle%'
    `);
    console.log(`Terminated ${termRes.rows.length} idle connections.`);
  } catch (err: any) {
    console.error("Error terminating idle connections:", err.message);
  } finally {
    await client.end();
  }
}

terminateIdle().catch(console.error);
