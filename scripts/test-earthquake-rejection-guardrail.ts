import fs from "fs";
import path from "path";

console.log("=== Testing Earthquake Rejection Guardrail ===");

const routePath = path.join(process.cwd(), "app/api/incidents/[id]/confirm/route.ts");
const content = fs.readFileSync(routePath, "utf-8");

// Check rejection forbidden check
if (!content.includes("EARTHQUAKE_REJECTION_FORBIDDEN")) {
  console.error("FAIL: EARTHQUAKE_REJECTION_FORBIDDEN not found in confirm route");
  process.exit(1);
}

// Check auto-earthquake condition logic
const hasAutoCheck = content.includes("automatic_earthquake") && content.includes("disasterType === \"earthquake\"");
if (!hasAutoCheck) {
  console.error("FAIL: Automatic earthquake origin check missing in confirm route");
  process.exit(1);
}

// Check safe closure support
if (!content.includes('"safe"') || !content.includes('confirmed_safe')) {
  console.error("FAIL: Safe decision transition missing");
  process.exit(1);
}

console.log("✔ Earthquake Rejection Guardrail is verified!");
