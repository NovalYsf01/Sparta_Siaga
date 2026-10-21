import fs from "fs";
import path from "path";

console.log("=== Testing UI Menu Navigation & Indonesian Language ===");

// 1. Verify Data Fasilitas is hidden from user navigation menus
const shellPath = path.join(process.cwd(), "components/layout/incident-app-shell.tsx");
const shellContent = fs.readFileSync(shellPath, "utf-8");

if (shellContent.includes('"Data Fasilitas"')) {
  console.error("FAIL: 'Data Fasilitas' still present in incident-app-shell.tsx navigation");
  process.exit(1);
}

const mobileHomePath = path.join(process.cwd(), "components/mobile/mobile-incident-home.tsx");
const mobileHomeContent = fs.readFileSync(mobileHomePath, "utf-8");

if (mobileHomeContent.includes('"Data Fasilitas"')) {
  console.error("FAIL: 'Data Fasilitas' still present in mobile-incident-home.tsx");
  process.exit(1);
}

console.log("✔ Navigation menus and language cleanups verified successfully!");
