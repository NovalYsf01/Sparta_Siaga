import { createReadinessHandler } from "@/lib/health";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { getDbPool } from "@/lib/db";
import { validatePrivateStorage } from "@/lib/storage-config";

export const dynamic = "force-dynamic";

export const GET = createReadinessHandler({
  validateConfig: () => {
    getRuntimeConfig();
  },
  checkDatabase: async () => {
    const pool = getDbPool();
    await pool.query("SELECT 1");
  },
  checkStorage: async () => {
    await validatePrivateStorage();
  },
});
