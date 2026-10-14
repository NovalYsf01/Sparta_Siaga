import assert from "node:assert/strict";
import path from "node:path";

import { assertIsolatedDatabase } from "../lib/database-safety";
import { ExcelFacilitySource, parseFacilityRows } from "../lib/facility-import";

async function main() {
  const source = new ExcelFacilitySource(
    path.resolve(process.cwd(), "data/KOORDINAT GUDANG.xlsx")
  );
  const parsed = parseFacilityRows(await source.readRows());

  assert.equal(parsed.invalid.length, 0);
  assert.equal(parsed.records.length, 67);
  assert.deepEqual(
    Object.fromEntries(
      [...parsed.records.reduce((counts, row) => {
        counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b))
    ),
    { BULKY: 5, DC: 28, DEPO: 9, STORE_HUB: 12, WAREHOUSE: 13 }
  );

  const balaraja = parsed.records.filter((row) =>
    ["KY10", "KY11"].includes(row.code)
  );
  assert.equal(balaraja.length, 2);
  assert.equal(balaraja[0].latitude, balaraja[1].latitude);
  assert.equal(balaraja[0].longitude, balaraja[1].longitude);

  const invalid = parseFacilityRows([
    {
      "No.": 1,
      Kode: "A1",
      "Nama Toko": "Invalid",
      CATEGORY: "WAREHOUSE",
      Latitude: -91,
      Longitude: 107,
    },
    {
      "No.": 2,
      Kode: "A1",
      "Nama Toko": "Duplicate",
      CATEGORY: "WAREHOUSE",
      Latitude: -6,
      Longitude: 107,
    },
  ]);
  assert.equal(invalid.records.length, 0);
  assert.equal(invalid.invalid.length, 2);

  await assertIsolatedDatabase({
    query: async () => ({ rows: [{ database_name: "sparta_siaga_isolated" }] }),
  });
  await assert.rejects(
    assertIsolatedDatabase({
      query: async () => ({ rows: [{ database_name: "defaultdb" }] }),
    }),
    /Refusing database write: connected to "defaultdb"/
  );

  console.log("PASS facility import domain: 67 records, categories, duplicates, validation, DB guard");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
