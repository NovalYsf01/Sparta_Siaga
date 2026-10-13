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
  process.env.DATABASE_URL = isolatedUrl;
  process.env.DATABASE_SSL_MODE = "require";

  const p = getDbPool();
  const dbRes = await p.query("SELECT current_database() as db");
  console.log("DATABASE:", dbRes.rows[0].db);

  const usersRes = await p.query(
    "SELECT id, name, business_role, system_role, status, scope, branch FROM users ORDER BY id"
  );
  console.log("USERS IN DB:", usersRes.rows);

  const colsRes = await p.query(
    "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
  );
  console.log("USERS COLUMNS:", colsRes.rows);
}

main().catch(console.error);
