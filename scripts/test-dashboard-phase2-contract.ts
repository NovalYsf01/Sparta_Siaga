import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("app/(siaga)/page.tsx", "utf8");
for (const label of ["Laporan Toko", "Laporan Fasilitas", "Shared Queue", "PIC belum ditetapkan", "Tertua menunggu"]) {
  assert.match(dashboard, new RegExp(label), `Dashboard harus menampilkan ${label}`);
}
assert.match(dashboard, /\/api\/incidents\/shared-queue/, "Dashboard harus memakai antrean yang sudah di-scope backend");

console.log("PASS Phase 2 dashboard contract");
