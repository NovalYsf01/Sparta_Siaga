import fs from "fs";
import path from "path";
import { resolveNotificationReadScope } from "../lib/notification-access";
import { UserContext } from "../lib/report-permissions";

console.log("=== Testing Notifications & Button Cleanup ===");

// 1. Verify notification scope access for branch user
const branchUser: UserContext = {
  id: "USR-BMS-001",
  name: "BMS User",
  role: "bms",
  systemRole: "USER",
  scope: "BRANCH",
  branch: "Bandung",
};

try {
  const scope = resolveNotificationReadScope(branchUser, "ALL");
  console.log("✔ Branch user viewing ALL notifications resolved without throwing 403:", scope);
} catch (err: any) {
  console.error("FAIL: resolveNotificationReadScope threw error for branch user:", err.message);
  process.exit(1);
}

// 2. Verify removal of redundant buttons in notification-center-sheet.tsx
const sheetPath = path.join(process.cwd(), "components/notifications/notification-center-sheet.tsx");
const sheetContent = fs.readFileSync(sheetPath, "utf-8");

if (sheetContent.includes("Tandai Semua Dibaca")) {
  console.error("FAIL: 'Tandai Semua Dibaca' is still present in notification-center-sheet.tsx");
  process.exit(1);
}

if (sheetContent.includes("Rincian Cabang")) {
  console.error("FAIL: 'Rincian Cabang' button is still present in notification-center-sheet.tsx");
  process.exit(1);
}

console.log("✔ Notifications and button cleanup verified successfully!");
