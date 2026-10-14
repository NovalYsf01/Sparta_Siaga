import path from "node:path";

import { closeDbPool, getDbPool } from "../lib/db";
import { applyFacilityImport, previewFacilityImport } from "../lib/facility-db";
import { ExcelFacilitySource, parseFacilityRows } from "../lib/facility-import";
import { selectIsolatedDatabaseEnvironment } from "../lib/isolated-database-config";

async function main() {
  selectIsolatedDatabaseEnvironment();
  const apply = process.argv.includes("--apply");
  const source = new ExcelFacilitySource(
    path.resolve(process.cwd(), "data/KOORDINAT GUDANG.xlsx")
  );
  const parsed = parseFacilityRows(await source.readRows());
  const client = await getDbPool().connect();

  try {
    const preview = await previewFacilityImport(client, source, parsed);
    console.log(
      JSON.stringify(
        {
          mode: apply ? "APPLY" : "PREVIEW",
          source: preview.sourceName,
          total: preview.total,
          new: preview.newCount,
          changed: preview.changedCount,
          unchanged: preview.unchangedCount,
          invalid: preview.invalidCount,
          invalidRows: preview.invalid,
        },
        null,
        2
      )
    );

    if (!apply) return;
    const runId = await applyFacilityImport(client, preview);
    console.log(`Import applied. Run ID: ${runId}`);
  } finally {
    client.release();
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
