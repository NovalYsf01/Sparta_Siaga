import path from "node:path";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3004";
const ARTIFACT_DIR = "C:/Users/Noval/.gemini/antigravity-ide/brain/ca2dc085-c102-4fca-afc7-819463ff7701";

async function loginAndSetCookie(context: any, identifier: string, password = "pass123") {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`Login API failed: ${res.status}`);
  const cookieHeader = res.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/siaga_session=([^;]+)/);
  if (!tokenMatch) throw new Error("No siaga_session cookie found");
  const token = tokenMatch[1];
  await context.addCookies([
    { name: "siaga_session", value: token, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
  ]);
  await context.addInitScript(() => {
    localStorage.setItem("sparta_notif_permission_prompted", "true");
    localStorage.setItem("sparta_siaga_welcome_dismissed", "true");
  });
}

async function dismissPrompt(page: any) {
  const later = page.locator('button:has-text("Nanti Saja"), button:has-text("Tutup"), button:has-text("Mengerti")');
  if (await later.first().isVisible().catch(() => false)) {
    await later.first().click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function run() {
  console.log("==================================================================");
  console.log("  CAPTURING EARTHQUAKE MONITORING & MOBILE HOTFIX SCREENSHOTS    ");
  console.log("==================================================================\n");

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) {
    launchOptions.executablePath = edgePath;
  }

  const browser = await chromium.launch(launchOptions);
  console.log("Browser launched successfully.");

  try {
    // -------------------------------------------------------------
    // 1. Mobile 360x640 (Compact Android) - Top Bar & Map
    // -------------------------------------------------------------
    console.log("[1/5] Viewport Mobile 360x640: Top Bar, Layout & Kontrol Peta button...");
    const ctx360 = await browser.newContext({
      viewport: { width: 360, height: 640 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAndSetCookie(ctx360, "ho", "pass123");
    const page360 = await ctx360.newPage();
    await page360.goto(`${BASE_URL}/monitoring`, { waitUntil: "networkidle" });
    await page360.waitForTimeout(2000);
    await dismissPrompt(page360);

    const shot360Default = path.join(ARTIFACT_DIR, "hotfix_monitoring_360_default.png");
    await page360.screenshot({ path: shot360Default });
    console.log(`      ✓ Saved: ${shot360Default}`);

    // Open Kontrol Peta Bottom Sheet
    const kontrolPetaBtn = page360.locator('button:has-text("Kontrol Peta")');
    if (await kontrolPetaBtn.isVisible().catch(() => false)) {
      await kontrolPetaBtn.click();
      await page360.waitForTimeout(1000);
      const shot360Sheet = path.join(ARTIFACT_DIR, "hotfix_monitoring_360_bottom_sheet.png");
      await page360.screenshot({ path: shot360Sheet });
      console.log(`      ✓ Saved: ${shot360Sheet}`);

      // Toggle to 24 Jam
      const btn24h = page360.locator('button:has-text("24 Jam")');
      if (await btn24h.isVisible().catch(() => false)) {
        await btn24h.click();
        await page360.waitForTimeout(1000);
        const shot360_24h = path.join(ARTIFACT_DIR, "hotfix_monitoring_360_24h_active.png");
        await page360.screenshot({ path: shot360_24h });
        console.log(`      ✓ Saved: ${shot360_24h}`);
      }

      // Close Sheet
      const closeBtn = page360.locator('button[aria-label="Tutup Kontrol Peta"]');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page360.waitForTimeout(500);
      }
    }
    await ctx360.close();

    // -------------------------------------------------------------
    // 2. Mobile 390x844 (Standard iPhone) - Leaflet Bottom Clearance & All Markers
    // -------------------------------------------------------------
    console.log("[2/5] Viewport Mobile 390x844: Leaflet Controls Clearance & Earthquake Focus...");
    const ctx390 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAndSetCookie(ctx390, "ho", "pass123");
    const page390 = await ctx390.newPage();
    await page390.goto(`${BASE_URL}/monitoring`, { waitUntil: "networkidle" });
    await page390.waitForTimeout(2000);
    await dismissPrompt(page390);

    const shot390Default = path.join(ARTIFACT_DIR, "hotfix_monitoring_390_default.png");
    await page390.screenshot({ path: shot390Default });
    console.log(`      ✓ Saved: ${shot390Default}`);

    // Click on "Gempa" list modal to select an earthquake and test focus
    const gempaBtn = page390.locator('button:has-text("Gempa")').first();
    if (await gempaBtn.isVisible().catch(() => false)) {
      await gempaBtn.click();
      await page390.waitForTimeout(1000);
      const shot390Modal = path.join(ARTIFACT_DIR, "hotfix_monitoring_390_earthquake_modal.png");
      await page390.screenshot({ path: shot390Modal });
      console.log(`      ✓ Saved: ${shot390Modal}`);

      const focusBtnInsideModal = page390.locator('[data-testid="focus-earthquake-btn"]').first();
      if (await focusBtnInsideModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        await focusBtnInsideModal.click();
        await page390.waitForTimeout(2000);
      } else {
        const closeX = page390.locator('button:has-text("Tutup"), button:has(svg.lucide-x)').first();
        if (await closeX.isVisible().catch(() => false)) {
          await closeX.click();
        }
      }

      const shot390Focused = path.join(ARTIFACT_DIR, "hotfix_monitoring_390_event_focus.png");
      await page390.screenshot({ path: shot390Focused });
      console.log(`      ✓ Saved: ${shot390Focused}`);
    }
    await ctx390.close();

    // -------------------------------------------------------------
    // 3. Tablet 768x1024
    // -------------------------------------------------------------
    console.log("[3/5] Viewport Tablet 768x1024...");
    const ctx768 = await browser.newContext({
      viewport: { width: 768, height: 1024 },
    });
    await loginAndSetCookie(ctx768, "ho", "pass123");
    const page768 = await ctx768.newPage();
    await page768.goto(`${BASE_URL}/monitoring`, { waitUntil: "networkidle" });
    await page768.waitForTimeout(2000);
    await dismissPrompt(page768);

    const shot768 = path.join(ARTIFACT_DIR, "hotfix_monitoring_768_tablet.png");
    await page768.screenshot({ path: shot768 });
    console.log(`      ✓ Saved: ${shot768}`);
    await ctx768.close();

    // -------------------------------------------------------------
    // 4. Desktop 1366x768 (Desktop Regression Check)
    // -------------------------------------------------------------
    console.log("[4/5] Viewport Desktop 1366x768: Map Monitoring Desktop with Controls...");
    const ctx1366 = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAndSetCookie(ctx1366, "ho", "pass123");
    const page1366 = await ctx1366.newPage();
    await page1366.goto(`${BASE_URL}/monitoring`, { waitUntil: "networkidle" });
    await page1366.waitForTimeout(2500);
    await dismissPrompt(page1366);

    const shot1366 = path.join(ARTIFACT_DIR, "hotfix_monitoring_1366_desktop.png");
    await page1366.screenshot({ path: shot1366 });
    console.log(`      ✓ Saved: ${shot1366}`);
    await ctx1366.close();

    console.log("\nAll smoke screenshots captured successfully!");
  } catch (err) {
    console.error("Screenshot capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
