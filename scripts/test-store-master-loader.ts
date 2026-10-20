import assert from "node:assert/strict";
import { getOrLoadMasterStores, getBranchCentroidsFromStores } from "../lib/store-master-loader";
import { closeDbPool } from "../lib/db";

async function main() {
  console.log("=== Testing Store Master Loader ===");
  const stores = await getOrLoadMasterStores();
  console.log(`Loaded ${stores.length} stores.`);
  assert(stores.length > 20000, `Expected >20,000 stores from master, got ${stores.length}`);

  // Test first store structure
  const s0 = stores[0];
  assert(s0.kode_toko, "Store must have kode_toko");
  assert(s0.nama_toko, "Store must have nama_toko");
  assert(s0.cabang, "Store must have cabang");
  assert(typeof s0.latitude === "number", "Store must have numeric latitude");
  assert(typeof s0.longitude === "number", "Store must have numeric longitude");

  // Test Branch Centroids
  const centroids = getBranchCentroidsFromStores(stores);
  console.log(`Calculated ${centroids.length} branch centroids.`);
  assert(centroids.length >= 25, `Expected >= 25 branches, got ${centroids.length}`);

  for (const c of centroids.slice(0, 5)) {
    console.log(` - Branch ${c.cabang}: ${c.store_count} stores, center (${c.lat}, ${c.lon})`);
    assert(c.store_count > 0, "Store count must be > 0");
    assert(c.lat !== 0 && c.lon !== 0, "Centroid coordinates must not be 0");
  }

  console.log("PASS: Store Master Loader successfully verified!");
}

main()
  .catch((err) => {
    console.error("FAIL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDbPool();
  });
