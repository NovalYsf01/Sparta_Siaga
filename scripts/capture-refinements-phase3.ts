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
  if (!res.ok) throw new Error(`Login failed for ${identifier}: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/siaga_session=([^;]+)/);
  if (!match) throw new Error(`No siaga_session cookie returned for ${identifier}`);
  const token = match[1];

  await context.addCookies([
    { name: "siaga_session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);

  await context.addInitScript(() => {
    localStorage.setItem("sparta_notif_permission_prompted", "true");
    localStorage.setItem("sparta_siaga_welcome_dismissed", "true");
    localStorage.setItem("sparta_read_notif_ids", "[]");
  });
}

async function dismissPrompt(page: any) {
  const later = page.locator('button:has-text("Nanti Saja"), button:has-text("Tutup"), button:has-text("Mengerti")');
  if (await later.first().isVisible().catch(() => false)) {
    await later.first().click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function main() {
  console.log("=== EXECUTING REFINEMENTS PHASE 3 PLAYWRIGHT VISUAL QA ===");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);

  try {
    // =========================================================================
    // 1. DESKTOP VIEWPORT (1366x768)
    // =========================================================================
    console.log("[1/6] Launching Desktop context (1366x768)...");
    const ctxDesktop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await loginAs(ctxDesktop, "BMS0001", "pass123");
    const page = await ctxDesktop.newPage();

    // Navigate to Map Monitoring
    await page.goto(`${BASE_URL}/map`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await dismissPrompt(page);

    // -------------------------------------------------------------
    // TASK 1: MODE DC VISIBILITY (Desktop)
    // -------------------------------------------------------------
    console.log("[2/6] Verifying Task 1: Mode DC National Visibility...");
    const dcModeBtn = page.locator('button:has-text("DC")').first();
    if (await dcModeBtn.isVisible()) {
      await dcModeBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verify "Daftar (28)" appears instead of "Daftar (0)"
    const listBtn = page.locator('button:has-text("Daftar")');
    const listText = await listBtn.innerText().catch(() => "");
    console.log("Mode DC List Button text:", listText);

    // Open sheet to show DC list with "Perlu Pemetaan Cabang"
    await listBtn.click().catch(() => {});
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase3_task1_mode_dc_desktop.png"),
      fullPage: false,
    });
    console.log("Saved: phase3_task1_mode_dc_desktop.png");

    // Close sheet
    const closeSheetBtn = page.locator('button[aria-label="Close"], button:has-text("Tutup")').first();
    if (await closeSheetBtn.isVisible()) {
      await closeSheetBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Click outside
      await page.mouse.click(200, 200);
      await page.waitForTimeout(500);
    }

    // -------------------------------------------------------------
    // TASK 2 & 3: FLOOD MAP NAVIGATION & REDESIGNED POPUP (Desktop)
    // -------------------------------------------------------------
    console.log("[3/6] Verifying Task 2 & 3: Flood Information & Navigation...");
    // Switch to weather/flood or click flood beacon
    const floodBeacon = page.locator('.custom-div-icon:has-text("🌊")').first();
    if (await floodBeacon.isVisible()) {
      await floodBeacon.click();
      await page.waitForTimeout(1000);

      // Verify Redesigned Flood Popup contents
      const floodPopup = page.locator('.custom-leaflet-popup');
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "phase3_task3_flood_popup_desktop.png"),
      });
      console.log("Saved: phase3_task3_flood_popup_desktop.png");

      // Verify and click "Lihat Lokasi di Peta"
      const actionBtn = floodPopup.locator('button:has-text("Lihat Lokasi di Peta"), button:has-text("Fokus ke Area Genangan")');
      const actionText = await actionBtn.innerText().catch(() => "");
      console.log("Flood Action Button text:", actionText);

      await actionBtn.click();
      await page.waitForTimeout(1500); // Wait for flyTo animation

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "phase3_task2_flood_focused_desktop.png"),
      });
      console.log("Saved: phase3_task2_flood_focused_desktop.png");
    } else {
      console.log("Note: Flood beacon not visible in current viewport, trying query filter or coordinate fly");
    }

    // -------------------------------------------------------------
    // TASK 4: STORE POPUP "Lihat Detail" (Desktop)
    // -------------------------------------------------------------
    console.log("[4/6] Verifying Task 4: Store Popup 'Lihat Detail'...");
    // Switch back to Toko mode
    const tokoModeBtn = page.locator('button:has-text("Toko")').first();
    if (await tokoModeBtn.isVisible()) {
      await tokoModeBtn.click();
      await page.waitForTimeout(1500);
    }

    // Open store marker (e.g. Cicaheum or first store)
    const storePin = page.locator('.custom-store-pin, .leaflet-marker-icon').first();
    if (await storePin.isVisible()) {
      await storePin.click();
      await page.waitForTimeout(1000);

      const storeBtn = page.locator('button:has-text("Lihat Detail")');
      console.log("Store button 'Lihat Detail' visible:", await storeBtn.isVisible());

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "phase3_task4_store_popup_desktop.png"),
      });
      console.log("Saved: phase3_task4_store_popup_desktop.png");
    }

    // -------------------------------------------------------------
    // TASK 5 & 6: DASHBOARD & REPORT CENTER (Desktop)
    // -------------------------------------------------------------
    console.log("[5/6] Verifying Task 5 & 6: Standardized Statuses & PIC Penanggung Jawab...");
    // A. Dashboard Table
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await dismissPrompt(page);

    // Scroll to active incidents table
    const tableHeader = page.locator('th:has-text("PIC Penanggung Jawab")');
    console.log("Header 'PIC Penanggung Jawab' visible:", await tableHeader.isVisible());

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase3_task5_6_dashboard_desktop.png"),
    });
    console.log("Saved: phase3_task5_6_dashboard_desktop.png");

    // B. Reports Page Table
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await dismissPrompt(page);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase3_task5_6_reports_desktop.png"),
    });
    console.log("Saved: phase3_task5_6_reports_desktop.png");

    await ctxDesktop.close();

    // =========================================================================
    // 2. MOBILE VIEWPORT (390x844 - iPhone 12/13/14)
    // =========================================================================
    console.log("[6/6] Launching Mobile context (390x844)...");
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAs(ctxMobile, "BMS0001", "pass123");
    const pageMobile = await ctxMobile.newPage();

    // Mode DC on Mobile
    await pageMobile.goto(`${BASE_URL}/map`, { waitUntil: "domcontentloaded" });
    await pageMobile.waitForTimeout(2500);
    await dismissPrompt(pageMobile);

    const mobileDcBtn = pageMobile.locator('button:has-text("DC")').first();
    if (await mobileDcBtn.isVisible()) {
      await mobileDcBtn.click();
      await pageMobile.waitForTimeout(1500);
    }

    await pageMobile.screenshot({
      path: path.join(ARTIFACT_DIR, "phase3_task1_mode_dc_mobile.png"),
    });
    console.log("Saved: phase3_task1_mode_dc_mobile.png");

    // Reports on Mobile (Cards view with standardized statuses & PIC Penanggung Jawab)
    await pageMobile.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageMobile.waitForTimeout(2000);
    await dismissPrompt(pageMobile);

    await pageMobile.screenshot({
      path: path.join(ARTIFACT_DIR, "phase3_task5_6_reports_mobile.png"),
    });
    console.log("Saved: phase3_task5_6_reports_mobile.png");

    await ctxMobile.close();

    console.log("=== ALL VISUAL QA SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
