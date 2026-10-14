import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

const queue = read("app/(siaga)/reports/shared-queue/page.tsx");
assert.match(queue, /Kelola PIC/, "Shared Queue harus membuka pengelolaan PIC");
assert.match(queue, /Riwayat PIC/, "Shared Queue harus menampilkan histori PIC");
assert.match(queue, /mutate\(selected\.id, "PATCH"/, "Shared Queue harus menghubungkan transfer PIC");
assert.match(queue, /mutate\(selected\.id, "DELETE"/, "Shared Queue harus menghubungkan release PIC");

const facility = read("app/(siaga)/admin/facilities/page.tsx");
assert.match(facility, /Riwayat perubahan/, "Master Fasilitas harus menampilkan audit timeline");
assert.match(facility, /\/audit/, "Master Fasilitas harus mengambil audit dari API protected");

const tracking = read("components/incident/maintenance-tracking-modal.tsx");
assert.match(tracking, /RepairLinksCard/, "Detail laporan harus menyediakan repair linking");

console.log("PASS Phase 2 operational UI contract");
