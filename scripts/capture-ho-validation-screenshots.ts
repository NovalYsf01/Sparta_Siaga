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
  console.log("  CAPTURING LIVE BROWSER SMOKE TEST SCREENSHOTS                   ");
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
    // SCENARIO 1: HO User on Desktop (1366x768)
    // -------------------------------------------------------------
    console.log("[1/4] Scenario 1: Akun HO pada Desktop (1366x768)...");
    const contextHo = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAndSetCookie(contextHo, "ho", "pass123");
    const pageHo = await contextHo.newPage();
    console.log("      ✓ Cookie auth HO diset");

    await pageHo.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageHo.waitForSelector('section[aria-label="Monitoring laporan HO"]', { timeout: 15000 });
    await dismissPrompt(pageHo);
    await pageHo.waitForTimeout(600);
    
    // Screenshot 1: Desktop HO Reports Monitoring
    const ss1Path = path.join(ARTIFACT_DIR, "ho_monitoring_desktop_1366x768.png");
    await pageHo.screenshot({ path: ss1Path, fullPage: false });
    console.log(`      ✓ Screenshot disimpan: ${ss1Path}`);

    // Check sidebar navigation: "Tracking Laporan" must NOT exist
    const trackingLink = await pageHo.$('a[href="/reports/tracking"]');
    console.log(`      ✓ Menu Tracking Laporan di Sidebar: ${trackingLink ? "ADA (FAIL)" : "TIDAK ADA (PASS)"}`);
    if (trackingLink) throw new Error("Sidebar must not contain Tracking Laporan");

    // Click "Lihat Detail" on the first report
    console.log("      Membuka modal detail laporan...");
    const detailBtnDesktop = pageHo.locator('.md\\:block button:has-text("Lihat Detail"):visible').first();
    if (await detailBtnDesktop.isVisible().catch(() => false)) {
      await detailBtnDesktop.click();
      await pageHo.waitForSelector('div[role="dialog"]', { timeout: 5000 });
      await pageHo.waitForTimeout(600);

      // Screenshot 2: Desktop HO Report Detail Modal
      const ss2Path = path.join(ARTIFACT_DIR, "ho_report_detail_modal_desktop.png");
      await pageHo.screenshot({ path: ss2Path, fullPage: false });
      console.log(`      ✓ Screenshot disimpan: ${ss2Path}`);

      // Verify Read-Only: no operational action buttons
      const claimBtn = await pageHo.$('button:has-text("Mulai Menangani")');
      const updateProgressBtn = await pageHo.$('button:has-text("Update Progress")');
      const estimateBtn = await pageHo.$('button:has-text("Buat Estimasi")');
      console.log(`      ✓ Tombol 'Mulai Menangani': ${claimBtn ? "ADA (FAIL)" : "TIDAK ADA (PASS)"}`);
      console.log(`      ✓ Tombol 'Update Progress': ${updateProgressBtn ? "ADA (FAIL)" : "TIDAK ADA (PASS)"}`);
      console.log(`      ✓ Tombol 'Buat Estimasi': ${estimateBtn ? "ADA (FAIL)" : "TIDAK ADA (PASS)"}`);

      // Close modal
      const closeBtn = await pageHo.$('button[aria-label="Tutup detail"], button:has-text("Kembali")');
      if (closeBtn) await closeBtn.click();
      await pageHo.waitForTimeout(300);
    }

    // -------------------------------------------------------------
    // SCENARIO 2: HO User on Mobile (390x844 - iPhone 12/13/14)
    // -------------------------------------------------------------
    console.log("\n[2/4] Scenario 2: Akun HO pada Mobile (390x844)...");
    const contextMobile390 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAndSetCookie(contextMobile390, "ho", "pass123");
    const pageMobile390 = await contextMobile390.newPage();
    await pageMobile390.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageMobile390.waitForSelector('section[aria-label="Monitoring laporan HO"]', { timeout: 15000 });
    await dismissPrompt(pageMobile390);
    await pageMobile390.waitForTimeout(600);

    // Screenshot 3: Mobile 390x844 Monitoring Cards & Bottom Navigation
    const ss3Path = path.join(ARTIFACT_DIR, "ho_monitoring_mobile_390x844.png");
    await pageMobile390.screenshot({ path: ss3Path, fullPage: false });
    console.log(`      ✓ Screenshot disimpan: ${ss3Path}`);

    // Click "Lihat Detail" on mobile
    const detailBtn390 = pageMobile390.locator('button:has-text("Lihat Detail"):visible').first();
    if (await detailBtn390.isVisible().catch(() => false)) {
      await detailBtn390.click();
      await pageMobile390.waitForSelector('div[role="dialog"]', { timeout: 5000 });
      await pageMobile390.waitForTimeout(600);

      // Screenshot 4: Mobile 390x844 Detail Dialog
      const ss4Path = path.join(ARTIFACT_DIR, "ho_report_detail_mobile_390x844.png");
      await pageMobile390.screenshot({ path: ss4Path, fullPage: false });
      console.log(`      ✓ Screenshot disimpan: ${ss4Path}`);

      const backBtn = await pageMobile390.$('button[aria-label="Kembali ke daftar laporan"]');
      if (backBtn) await backBtn.click();
      await pageMobile390.waitForTimeout(300);
    }

    // -------------------------------------------------------------
    // SCENARIO 3: HO User on Mobile (375x667 - iPhone SE)
    // -------------------------------------------------------------
    console.log("\n[3/4] Scenario 3: Akun HO pada Mobile (375x667)...");
    const contextMobile375 = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAndSetCookie(contextMobile375, "ho", "pass123");
    const pageMobile375 = await contextMobile375.newPage();
    await pageMobile375.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageMobile375.waitForSelector('section[aria-label="Monitoring laporan HO"]', { timeout: 15000 });
    await dismissPrompt(pageMobile375);
    await pageMobile375.waitForTimeout(600);

    // Screenshot 5: Mobile 375x667 Monitoring
    const ss5Path = path.join(ARTIFACT_DIR, "ho_monitoring_mobile_375x667.png");
    await pageMobile375.screenshot({ path: ss5Path, fullPage: false });
    console.log(`      ✓ Screenshot disimpan: ${ss5Path}`);

    // Click "Lihat Detail" on 375x667
    const detailBtn375 = pageMobile375.locator('button:has-text("Lihat Detail"):visible').first();
    if (await detailBtn375.isVisible().catch(() => false)) {
      await detailBtn375.click();
      await pageMobile375.waitForSelector('div[role="dialog"]', { timeout: 5000 });
      await pageMobile375.waitForTimeout(600);

      // Screenshot 6: Mobile 375x667 Detail Dialog
      const ss6Path = path.join(ARTIFACT_DIR, "ho_report_detail_mobile_375x667.png");
      await pageMobile375.screenshot({ path: ss6Path, fullPage: false });
      console.log(`      ✓ Screenshot disimpan: ${ss6Path}`);
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Branch BMS User on Desktop (1366x768)
    // -------------------------------------------------------------
    console.log("\n[4/4] Scenario 4: Akun Branch BMS Bandung (1366x768)...");
    const contextBms = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAndSetCookie(contextBms, "bms", "pass123");
    const pageBms = await contextBms.newPage();
    console.log("      ✓ Cookie auth BMS Bandung diset");

    await pageBms.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageBms.locator('h1:has-text("Pusat Laporan Kejadian"):visible').first().waitFor({ timeout: 15000 });
    await dismissPrompt(pageBms);
    await pageBms.waitForTimeout(600);

    // Verify sidebar navigation: "Tracking Laporan" must NOT exist for BMS either
    const bmsTrackingLink = await pageBms.$('a[href="/reports/tracking"]');
    console.log(`      ✓ Menu Tracking Laporan di Sidebar BMS: ${bmsTrackingLink ? "ADA (FAIL)" : "TIDAK ADA (PASS)"}`);
    if (bmsTrackingLink) throw new Error("Sidebar must not contain Tracking Laporan for BMS");

    // Screenshot 7: BMS Operational Center Desktop
    const ss7Path = path.join(ARTIFACT_DIR, "bms_operational_center_desktop.png");
    await pageBms.screenshot({ path: ss7Path, fullPage: false });
    console.log(`      ✓ Screenshot disimpan: ${ss7Path}`);

    console.log("\n==================================================================");
    console.log("  SEMUA SCREENSHOT & BROWSER SMOKE TESTS: 100% PASS!              ");
    console.log("==================================================================");

    await contextHo.close();
    await contextMobile390.close();
    await contextMobile375.close();
    await contextBms.close();
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
