import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3004";
const OUTPUT_DIR = path.resolve(process.cwd(), "artifacts/phase2/screenshots");
const ARTIFACT_DIR = "C:\\Users\\Noval\\.gemini\\antigravity-ide\\brain\\ca2dc085-c102-4fca-afc7-819463ff7701";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function saveScreenshot(page: any, name: string) {
  const p1 = path.join(OUTPUT_DIR, name);
  const p2 = path.join(ARTIFACT_DIR, name);
  await page.screenshot({ path: p1, fullPage: false });
  fs.copyFileSync(p1, p2);
  console.log(`[Captured]: ${name}`);
}

async function createContext(browser: any, options: any = {}) {
  const ctx = await browser.newContext(options);
  await ctx.addInitScript(() => {
    localStorage.setItem("sparta_notif_permission_prompted", "true");
  });
  return ctx;
}

async function login(page: any, identifier: string, pass: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.locator("#login-identifier").fill(identifier);
  await page.locator("#login-password").fill(pass);
  await Promise.all([
    page.waitForResponse((r: any) => r.url().includes("/api/auth/login") && r.status() === 200),
    page.getByRole("button", { name: "Masuk" }).click(),
  ]);
  await page.waitForURL((url: any) => url.pathname === "/" || url.pathname === "", { timeout: 15000 });
  // Dismiss notification prompt if open
  try {
    const laterBtn = page.getByRole("button", { name: "Nanti Saja" });
    if (await laterBtn.isVisible({ timeout: 1500 })) {
      await laterBtn.click({ force: true });
    }
  } catch {}
  await page.waitForTimeout(1000);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
  });

  try {
    console.log("--- 1. ADMIN DESKTOP & SIDEBAR RESTORATION ---");
    const adminCtx = await createContext(browser, { viewport: { width: 1440, height: 900 } });
    const adminPage = await adminCtx.newPage();
    await login(adminPage, "admin", "admin123");
    
    // Ensure sidebar items are visible
    await adminPage.waitForSelector("aside", { timeout: 10000 });
    await saveScreenshot(adminPage, "1_sidebar_restored_admin.png");
    await adminCtx.close();

    console.log("--- 2. BMS NOTIFIKASI & RESPON ---");
    const bmsCtx = await createContext(browser, { viewport: { width: 1440, height: 900 } });
    const bmsPage = await bmsCtx.newPage();
    await login(bmsPage, "bms", "pass123");
    await saveScreenshot(bmsPage, "2_bms_dashboard.png");

    // Click Notification bell in navbar
    const notifBtn = bmsPage.locator("button[aria-label*='Notifikasi'], button[title*='Notifikasi'], nav button:has(svg.lucide-bell)");
    if (await notifBtn.first().isVisible({ timeout: 5000 })) {
      await notifBtn.first().click({ force: true });
      await bmsPage.waitForTimeout(1200);
      await saveScreenshot(bmsPage, "2_bms_notification_sheet.png");
      // Close notification sheet
      await bmsPage.keyboard.press("Escape");
      await bmsPage.waitForTimeout(600);
    }

    // Click on Detail button in ActiveIncidentsTable
    const tableRow = bmsPage.locator("tbody tr").first();
    if (await tableRow.isVisible({ timeout: 5000 })) {
      const detailBtn = tableRow.getByRole("button", { name: "Detail" });
      if (await detailBtn.isVisible({ timeout: 2000 })) {
        await detailBtn.click({ force: true });
      } else {
        await tableRow.click({ force: true });
      }
      await bmsPage.waitForTimeout(1200);
      await saveScreenshot(bmsPage, "2_bms_incident_detail_modal.png");
    }
    await bmsCtx.close();

    console.log("--- 3. BMM CABANG MONITORING (4 KPIS & APPROVAL) ---");
    const bmmCtx = await createContext(browser, { viewport: { width: 1440, height: 900 } });
    const bmmPage = await bmmCtx.newPage();
    await login(bmmPage, "bmm", "pass123");
    await bmmPage.waitForTimeout(1500);
    await saveScreenshot(bmmPage, "3_bmm_dashboard.png");
    await bmmCtx.close();

    console.log("--- 4. HO NASIONAL MONITORING (READ-ONLY & CABANG TABLE) ---");
    const hoCtx = await createContext(browser, { viewport: { width: 1440, height: 900 } });
    const hoPage = await hoCtx.newPage();
    await login(hoPage, "ho", "pass123");
    await hoPage.waitForTimeout(1500);
    await saveScreenshot(hoPage, "4_ho_dashboard_monitoring.png");
    await hoCtx.close();

    console.log("--- 5. STATUS ON PROGRESS & TARGET SELESAI ---");
    const reportCtx = await createContext(browser, { viewport: { width: 1440, height: 900 } });
    const reportPage = await reportCtx.newPage();
    await login(reportPage, "bms", "pass123");
    await reportPage.goto(`${BASE_URL}/reports`, { waitUntil: "networkidle" });
    await reportPage.waitForTimeout(1500);
    await saveScreenshot(reportPage, "5_reports_on_progress_target.png");
    await reportCtx.close();

    console.log("--- 6. MOBILE FIRST RESPONSIVENESS (390px) ---");
    const mobCtx = await createContext(browser, {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobPage = await mobCtx.newPage();
    await login(mobPage, "bms", "pass123");
    await mobPage.waitForTimeout(1000);
    await saveScreenshot(mobPage, "6_mobile_bms_home.png");

    await mobPage.goto(`${BASE_URL}/reports`, { waitUntil: "networkidle" });
    await mobPage.waitForTimeout(1000);
    await saveScreenshot(mobPage, "6_mobile_reports_cards.png");
    await mobCtx.close();

    console.log("ALL DELIVERABLE SCREENSHOTS SUCCESSFULLY CAPTURED!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
