import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/(siaga)/monitoring/page.tsx", "utf8");
const route = fs.readFileSync("app/api/locations/facilities/route.ts", "utf8");
const map = fs.readFileSync("components/map/map-inner.tsx", "utf8");

for (const token of ["facilityType", "facilityBranch", "facilityStatus", "facilityMapping"]) {
  assert.match(page, new RegExp(token), `Filter ${token} harus tersedia`);
}
assert.match(page, /onViewportChange/, "Halaman peta harus menerima perubahan viewport");
assert.match(page, /Detail fasilitas/, "Mobile harus memiliki bottom sheet detail fasilitas");
assert.match(route, /north|south|east|west/, "API fasilitas harus mendukung bounding box");
assert.match(map, /onViewportChange/, "Map harus meneruskan bounds setelah moveend");

console.log("PASS Phase 2 map contract");
