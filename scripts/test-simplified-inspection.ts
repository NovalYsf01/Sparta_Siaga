import fs from "fs";
import path from "path";

console.log("=== Testing Simplified Field Inspection & BnM Decision ===");

const modalPath = path.join(process.cwd(), "components/incident/store-verification-modal.tsx");
const modalContent = fs.readFileSync(modalPath, "utf-8");

const confirmRoutePath = path.join(process.cwd(), "app/api/incidents/[id]/confirm/route.ts");
const confirmRouteContent = fs.readFileSync(confirmRoutePath, "utf-8");

// 1. Verify elimination of categories, severity, and operationalStatus selectors from the BMS/BES inspection form
const hasCategoriesSelector = /availableCategories\s*=/.test(modalContent) || /toggleCategory\(/.test(modalContent) || /Kategori Kerusakan:/.test(modalContent);
if (hasCategoriesSelector) {
  console.error("FAIL: categories selector is still present in store-verification-modal.tsx");
  process.exit(1);
}

const hasSeveritySelector = /Tingkat Keparahan:/.test(modalContent) || /setSeverity\(/.test(modalContent);
if (hasSeveritySelector) {
  console.error("FAIL: severity selector is still present in store-verification-modal.tsx");
  process.exit(1);
}

const hasOperationalStatusSelector = /Status Operasional:/.test(modalContent) || /setOperationalStatus\(/.test(modalContent);
if (hasOperationalStatusSelector) {
  console.error("FAIL: operationalStatus selector is still present in store-verification-modal.tsx");
  process.exit(1);
}

// 2. Verify Presence of Simplified Inputs
if (!/Ada Kerusakan/i.test(modalContent) || !/Tidak Ada Kerusakan|Kondisi Aman/i.test(modalContent)) {
  console.error("FAIL: Damage radio options are missing");
  process.exit(1);
}

if (!/Minimal.+foto/i.test(modalContent)) {
  console.error("FAIL: Minimum 1 photo requirement notice missing");
  process.exit(1);
}

// 3. Verify Earthquake Rejection Guardrail in BnM view of modal
if (!/EARTHQUAKE/i.test(modalContent) && !/automatic_earthquake/i.test(modalContent)) {
  console.error("FAIL: Earthquake rejection guardrail missing from modal UI");
  process.exit(1);
}

// 4. Verify Earthquake Rejection Guardrail in backend API
if (!/EARTHQUAKE_REJECTION_FORBIDDEN/.test(confirmRouteContent)) {
  console.error("FAIL: EARTHQUAKE_REJECTION_FORBIDDEN guardrail missing in confirm route");
  process.exit(1);
}

console.log("✔ Simplified Field Inspection and BnM Decision verified successfully!");
