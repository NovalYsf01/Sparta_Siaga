import fs from "fs";
import path from "path";

console.log("=== Testing Mobile Responsive & Modal Stability ===");

const modalPath = path.join(process.cwd(), "components/incident/select-report-modal.tsx");
const modalContent = fs.readFileSync(modalPath, "utf-8");

// 1. Verify absence of touch-none on the modal backdrop
if (modalContent.includes("touch-none")) {
  console.error("FAIL: touch-none is present on select-report-modal.tsx backdrop, which causes touch trap on mobile");
  process.exit(1);
}

// 2. Verify fixed header, fixed search bar, and internal scroll container
if (!modalContent.includes("shrink-0")) {
  console.error("FAIL: fixed header/search shrink-0 is missing in select-report-modal.tsx");
  process.exit(1);
}

if (!modalContent.includes("overflow-y-auto") || !modalContent.includes("overscroll-contain")) {
  console.error("FAIL: internal scrollable container with overscroll-contain missing");
  process.exit(1);
}

// 3. Verify Indonesian disaster mapping in modal
if (!modalContent.includes("formatDisasterIndonesian") || !modalContent.includes("Gempa Bumi")) {
  console.error("FAIL: Indonesian disaster formatting missing in select-report-modal.tsx");
  process.exit(1);
}

console.log("✔ Mobile responsive and modal stability verified successfully!");
