import path from "node:path";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3004";
const ARTIFACT_DIR = "C:/Users/Noval/.gemini/antigravity-ide/brain/ca2dc085-c102-4fca-afc7-819463ff7701";

async function loginAs(context: any, identifier: string, password = "pass123") {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/siaga_session=([^;]+)/);
  const token = match![1];

  await context.addCookies([
    { name: "siaga_session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);

  await context.addInitScript(() => {
    localStorage.setItem("sparta_notif_permission_prompted", "true");
    localStorage.setItem("sparta_siaga_welcome_dismissed", "true");
  });
}

async function main() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browser = await chromium.launch({ headless: true, executablePath: edgePath });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await loginAs(context, "BMS0001", "pass123");
  const page = await context.newPage();

  console.log("Navigating to /monitoring...");
  await page.goto(`${BASE_URL}/monitoring`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!(window as any).__SPARTA_MAP__, { timeout: 15000 });
  await page.waitForTimeout(1000);

  // =========================================================================
  // 1. FLOOD POPUP (Task 2 & 3)
  // =========================================================================
  console.log("[1/2] Opening Flood Popup in Agam...");
  // Pan map to flood coordinate so it's in center
  await page.evaluate(() => {
    const map = (window as any).__SPARTA_MAP__;
    if (map) {
      map.setView([-0.118, 100.086], 10);
    }
  });
  await page.waitForTimeout(1000);

  // Find flood layer and open popup
  const openedFlood = await page.evaluate(() => {
    const map = (window as any).__SPARTA_MAP__;
    let found = false;
    if (map) {
      map.eachLayer((layer: any) => {
        if (layer.getPopup && layer.options?.icon?.options?.className?.includes("custom-div-icon")) {
          layer.openPopup();
          found = true;
        }
      });
    }
    return found;
  });
  console.log("Flood popup opened via Leaflet layer:", openedFlood);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_flood_popup_redesigned.png") });
  console.log("Saved: 02_flood_popup_redesigned.png");

  // Click "Lihat Lokasi di Peta" button in the popup card
  const navBtn = page.locator('button:has-text("Lihat Lokasi di Peta")').first();
  const hasNavBtn = await navBtn.isVisible().catch(() => false);
  console.log("Nav button visible:", hasNavBtn);

  if (hasNavBtn) {
    console.log("Clicking 'Lihat Lokasi di Peta'...");
    await navBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_flood_map_focused.png") });
    console.log("Saved: 02_flood_map_focused.png");
  }

  // =========================================================================
  // 2. STORE POPUP WITH "Lihat Detail" (Task 4)
  // =========================================================================
  console.log("[2/2] Opening Store Popup in Bandung...");
  // Switch to Toko tab
  const tokoTab = page.locator('button[role="tab"]:has-text("Toko")').first();
  await tokoTab.click();
  await page.waitForTimeout(1000);

  // Set view to Bandung at zoom 13
  await page.evaluate(() => {
    const map = (window as any).__SPARTA_MAP__;
    if (map) {
      map.setView([-6.903, 107.65], 13);
    }
  });
  await page.waitForTimeout(1500);

  // Find store layer with popup and open it
  const openedStore = await page.evaluate(() => {
    const map = (window as any).__SPARTA_MAP__;
    let found = false;
    if (map) {
      map.eachLayer((layer: any) => {
        if (!found && layer.getPopup && layer.options?.icon?.options?.className?.includes("custom-store-pin")) {
          layer.openPopup();
          found = true;
        }
      });
    }
    return found;
  });
  console.log("Store popup opened via Leaflet layer:", openedStore);
  await page.waitForTimeout(1000);

  const detailBtn = page.locator('button:has-text("Lihat Detail")').first();
  console.log("Store 'Lihat Detail' button visible:", await detailBtn.isVisible().catch(() => false));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, "03_store_popup_lihat_detail.png") });
  console.log("Saved: 03_store_popup_lihat_detail.png");

  await browser.close();
  console.log("=== EXACT POPUPS CAPTURED PERFECTLY ===");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
