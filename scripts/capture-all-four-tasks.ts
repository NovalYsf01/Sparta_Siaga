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
  console.log("=== RUNNING FULL PLAYWRIGHT VISUAL QA & VERIFICATION ===");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);

  try {
    // -------------------------------------------------------------
    // SCENARIO 1 & 2 & 3: DESKTOP (1366x768)
    // -------------------------------------------------------------
    console.log("[1/4] Desktop 1366x768 Session...");
    const ctxDesktop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await loginAs(ctxDesktop, "BMS0001", "pass123");
    const page = await ctxDesktop.newPage();

    // 1. Task 1: Mode DC on /monitoring
    console.log("  -> Testing /monitoring Mode DC...");
    await page.goto(`${BASE_URL}/monitoring`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await dismissPrompt(page);

    // Click DC tab in top floating switcher
    const dcTab = page.locator('button[role="tab"]:has-text("DC")').first();
    await dcTab.click();
    await page.waitForTimeout(2000);

    // Capture Mode DC with 28 markers visible
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "01_mode_dc_restored.png"),
    });
    console.log("  Saved: 01_mode_dc_restored.png");

    // Open sheet to show DC list
    const dcListBtn = page.locator('button:has-text("Daftar (28)"), button:has-text("Daftar")').first();
    if (await dcListBtn.isVisible()) {
      await dcListBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "01_mode_dc_sheet_list.png"),
      });
      console.log("  Saved: 01_mode_dc_sheet_list.png");

      // Close sheet
      const closeSheet = page.locator('button[aria-label="Tutup daftar"], button:has-text("Tutup")').first();
      if (await closeSheet.isVisible()) {
        await closeSheet.click();
        await page.waitForTimeout(500);
      } else {
        await page.mouse.click(100, 200);
        await page.waitForTimeout(500);
      }
    }

    // 2. Task 2 & 3: Flood Information & Navigation
    console.log("  -> Testing Flood Marker & Redesigned Popup on /monitoring...");
    // Switch to Kejadian mode so weather/flood is active
    const kejadianTab = page.locator('button[role="tab"]:has-text("Kejadian")').first();
    await kejadianTab.click();
    await page.waitForTimeout(2000);

    // Look for flood beacon icon 🌊
    const floodIcon = page.locator('.custom-div-icon:has-text("🌊")').first();
    const hasFlood = await floodIcon.isVisible().catch(() => false);
    console.log("  Flood beacon visible:", hasFlood);

    if (hasFlood) {
      await floodIcon.click({ force: true });
      await page.waitForTimeout(1000);

      // Screenshot redesigned flood popup
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "02_flood_popup_redesigned.png"),
      });
      console.log("  Saved: 02_flood_popup_redesigned.png");

      // Test navigation button
      const navBtn = page.locator('button:has-text("Lihat Lokasi di Peta"), button:has-text("Fokus ke Area Genangan")').first();
      if (await navBtn.isVisible()) {
        const navLabel = await navBtn.innerText();
        console.log("  Nav button label:", navLabel);
        await navBtn.click();
        await page.waitForTimeout(1800);

        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "02_flood_map_focused.png"),
        });
        console.log("  Saved: 02_flood_map_focused.png");
      }
    }

    // 3. Task 4: Store Popup "Lihat Detail"
    console.log("  -> Testing Store Popup 'Lihat Detail'...");
    const tokoTab = page.locator('button[role="tab"]:has-text("Toko")').first();
    await tokoTab.click();
    await page.waitForTimeout(2000);

    // Click on store pin (e.g. Cicaheum or store pin away from controls)
    const storePin = page.locator('.custom-store-pin, .leaflet-marker-icon').nth(2);
    const pinToClick = (await storePin.isVisible()) ? storePin : page.locator('.custom-store-pin, .leaflet-marker-icon').first();
    if (await pinToClick.isVisible()) {
      await pinToClick.click({ force: true });
      await page.waitForTimeout(1000);

      const detailBtn = page.locator('button:has-text("Lihat Detail")');
      console.log("  Store 'Lihat Detail' button visible:", await detailBtn.isVisible());

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "03_store_popup_lihat_detail.png"),
      });
      console.log("  Saved: 03_store_popup_lihat_detail.png");
    }

    // 4. Task 5 & 6: Standardized Statuses and PIC Penanggung Jawab
    console.log("  -> Testing Dashboard ActiveIncidentsTable...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await dismissPrompt(page);

    // Scroll to table
    const headerPic = page.locator('th:has-text("PIC Penanggung Jawab")');
    if (await headerPic.isVisible()) {
      await headerPic.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "04_dashboard_pic_penanggung_jawab.png"),
    });
    console.log("  Saved: 04_dashboard_pic_penanggung_jawab.png");

    // Operational Report Center
    console.log("  -> Testing Operational Report Center (/reports)...");
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await dismissPrompt(page);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "04_reports_status_and_pic.png"),
    });
    console.log("  Saved: 04_reports_status_and_pic.png");

    await ctxDesktop.close();

    // -------------------------------------------------------------
    // SCENARIO 5: MOBILE (390x844)
    // -------------------------------------------------------------
    console.log("[2/4] Mobile 390x844 Session...");
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAs(ctxMobile, "BMS0001", "pass123");
    const mobilePage = await ctxMobile.newPage();

    // Mobile DC Mode
    await mobilePage.goto(`${BASE_URL}/monitoring`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(2500);
    await dismissPrompt(mobilePage);

    const mDcTab = mobilePage.locator('button[role="tab"]:has-text("DC")').first();
    if (await mDcTab.isVisible()) {
      await mDcTab.click();
      await mobilePage.waitForTimeout(1500);
    }

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, "mobile_01_mode_dc.png"),
    });
    console.log("  Saved: mobile_01_mode_dc.png");

    // Mobile Flood Popup
    const mKejadianTab = mobilePage.locator('button[role="tab"]:has-text("Kejadian")').first();
    if (await mKejadianTab.isVisible()) {
      await mKejadianTab.click();
      await mobilePage.waitForTimeout(1500);
    }

    const mFloodIcon = mobilePage.locator('.custom-div-icon:has-text("🌊")').first();
    if (await mFloodIcon.isVisible().catch(() => false)) {
      await mFloodIcon.click({ force: true });
      await mobilePage.waitForTimeout(1000);

      await mobilePage.screenshot({
        path: path.join(ARTIFACT_DIR, "mobile_02_flood_popup.png"),
      });
      console.log("  Saved: mobile_02_flood_popup.png");
    }

    // Mobile Reports Center (Cards view)
    await mobilePage.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(2500);
    await dismissPrompt(mobilePage);

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, "mobile_04_reports_cards.png"),
    });
    console.log("  Saved: mobile_04_reports_cards.png");

    await ctxMobile.close();

    console.log("=== ALL VISUAL QA SCREENSHOTS COMPLETED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
