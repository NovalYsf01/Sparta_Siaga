import { getDbPool } from "../lib/db";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  let isolatedUrl = "";
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*SPARTA_ISOLATED_TEST_DATABASE_URL\s*=\s*(.*)?\s*$/);
    if (match) {
      isolatedUrl = match[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }
  if (isolatedUrl) {
    process.env.DATABASE_URL = isolatedUrl;
    process.env.DATABASE_SSL_MODE = "require";
  }

  const p = getDbPool();
  try {
    const tablesRes = await p.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("TABLES:", tablesRes.rows.map((r) => r.table_name));

    const storesExists = tablesRes.rows.some((r) => r.table_name === "stores");
    if (storesExists) {
      const countRes = await p.query("SELECT COUNT(*) as cnt FROM stores");
      console.log("STORES COUNT:", countRes.rows[0].cnt);
      const cols = await p.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores' ORDER BY ordinal_position"
      );
      console.log("STORES COLS:", cols.rows);
    } else {
      console.log("STORES TABLE DOES NOT EXIST");
    }

    const historyExists = tablesRes.rows.some((r) => r.table_name === "store_sync_history");
    console.log("STORE_SYNC_HISTORY EXISTS:", historyExists);
  } finally {
    await p.end();
  }
}

main().catch(console.error);
