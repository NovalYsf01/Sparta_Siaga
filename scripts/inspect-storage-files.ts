import fs from "fs";
import path from "path";

function listDir(p: string, depth: number = 0) {
  if (depth > 4 || !fs.existsSync(p)) return;
  const items = fs.readdirSync(p);
  for (const it of items) {
    const full = path.join(p, it);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      console.log(`[DIR]  ${path.relative(process.cwd(), full)}`);
      listDir(full, depth + 1);
    } else {
      console.log(`[FILE] ${path.relative(process.cwd(), full)} (${stat.size} bytes)`);
    }
  }
}

console.log("=== INSPECTING STORAGE FOLDERS ===");
console.log("--- storage/ ---");
listDir(path.resolve("storage"));

console.log("\n--- public/uploads/ ---");
listDir(path.resolve("public/uploads"));
