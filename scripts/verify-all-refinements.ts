import path from "node:path";
import fs from "node:fs";
import { chromium } from "@playwright/test";
import { closeDbPool } from "../lib/db";

const BASE_URL = "http://localhost:3004";
const ARTIFACT_DIR = "C:/Users/Noval/.gemini/antigravity-ide/brain/ca2dc085-c102-4fca-afc7-819463ff7701";

async function loginAs(context: any, identifier: string, password: string = "pass123") {
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

async function run() {
  console.log("==================================================================");
  console.log("  VERIFYING SPARTA SIAGA UI/UX REFINEMENTS & CAPTURING EVIDENCE   ");
  console.log("==================================================================\n");

  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) {
    launchOptions.executablePath = edgePath;
  }

  const browser = await chromium.launch(launchOptions);
  console.log("Playwright browser launched successfully.");

  try {
    // -------------------------------------------------------------
    // Area 1: Notification Center & Incident Detail Modal (Desktop)
    // -------------------------------------------------------------
    console.log("[1/6] Capturing Notification Center Sheet & Incident Detail Modal...");
    const ctxDesktop = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAs(ctxDesktop, "ADM0001", "admin123");

    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageDesktop.waitForTimeout(1500);
    await dismissPrompt(pageDesktop);

    // Open notification center button in top header
    const notifBtn = pageDesktop.locator('button[aria-label="Notifikasi"]');
    if (await notifBtn.first().isVisible().catch(() => false)) {
      await notifBtn.first().click();
      await pageDesktop.waitForTimeout(1000);
      // In the NotificationCenterSheet, switch to "RIWAYAT" tab because the incident log is >72h old
      const riwayatTab = pageDesktop.locator('button:has-text("RIWAYAT")');
      if (await riwayatTab.first().isVisible().catch(() => false)) {
        await riwayatTab.first().click();
        await pageDesktop.waitForTimeout(600);
      }

      await pageDesktop.screenshot({
        path: path.join(ARTIFACT_DIR, "task1_notification_center_sheet.png"),
      });
      console.log("  ✓ task1_notification_center_sheet.png saved");

      // Click "Lihat Detail" on the card
      const detailBtn = pageDesktop.locator('button:has-text("Lihat Detail")');
      if (await detailBtn.first().isVisible().catch(() => false)) {
        await detailBtn.first().click();
        await pageDesktop.waitForTimeout(1000);
        await pageDesktop.screenshot({
          path: path.join(ARTIFACT_DIR, "task1_notification_detail_modal.png"),
        });
        console.log("  ✓ task1_notification_detail_modal.png saved");

        // Verify "Lihat di Peta" action per store row
        const mapActionBtn = pageDesktop.locator('button:has-text("Lihat di Peta")').first();
        if (await mapActionBtn.isVisible().catch(() => false)) {
          console.log("  ✓ Found 'Lihat di Peta' action in structured table row.");
          await mapActionBtn.click();
          await pageDesktop.waitForTimeout(1500);
          await pageDesktop.screenshot({
            path: path.join(ARTIFACT_DIR, "task1_map_fly_to_location.png"),
          });
          console.log("  ✓ task1_map_fly_to_location.png saved");
        }
      }
    } else {
      console.log("  ⚠ notifBtn not found, taking page snapshot");
      await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, "debug_desktop_header.png") });
    }
    await pageDesktop.close();
    await ctxDesktop.close();

    // -------------------------------------------------------------
    // Area 2 & Area 4: BMS Store Search & Photo Upload Flow
    // -------------------------------------------------------------
    console.log("[2/6 & 4/6] Capturing BMS Store Search & Photo Upload Flow...");
    const ctxBms = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAs(ctxBms, "BMS0001", "pass123");

    const pageBms = await ctxBms.newPage();
    await pageBms.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageBms.waitForTimeout(1500);
    await dismissPrompt(pageBms);

    // Click "Buat Laporan"
    const createBtn = pageBms.locator('button:has-text("Buat Laporan")');
    if (await createBtn.first().isVisible().catch(() => false)) {
      await createBtn.first().click();
      await pageBms.waitForTimeout(800);

      // Search store "cicaheum"
      const tokoInput = pageBms.locator('input[placeholder*="Ketik kode"]');
      if (await tokoInput.first().isVisible().catch(() => false)) {
        await tokoInput.first().fill("cicaheum");
        await pageBms.waitForTimeout(1200);
        await pageBms.screenshot({
          path: path.join(ARTIFACT_DIR, "task4_bms_store_search_results.png"),
        });
        console.log("  ✓ task4_bms_store_search_results.png saved");

        const storeOpt = pageBms.locator('li').filter({ hasText: 'CICAHEUM' }).first();
        if (await storeOpt.isVisible().catch(() => false)) {
          await storeOpt.click();
          await pageBms.waitForTimeout(800);
        }
      }

      // Click "Lanjut" to go to Step 2 (Photo Upload)
      const lanjutBtn = pageBms.locator('button:has-text("Lanjut")');
      if (await lanjutBtn.first().isVisible().catch(() => false)) {
        await lanjutBtn.first().click();
        await pageBms.waitForTimeout(1000);
        await pageBms.screenshot({
          path: path.join(ARTIFACT_DIR, "task2_upload_foto_unified_slots.png"),
        });
        console.log("  ✓ task2_upload_foto_unified_slots.png saved");

        // Click first unified upload slot
        const uploadSlot = pageBms.locator('button:has-text("Upload Foto")').first();
        if (await uploadSlot.isVisible().catch(() => false)) {
          await uploadSlot.click();
          await pageBms.waitForTimeout(600);
          await pageBms.screenshot({
            path: path.join(ARTIFACT_DIR, "task2_upload_choice_dialog.png"),
          });
          console.log("  ✓ task2_upload_choice_dialog.png saved");

          // Click "Pilih dari Galeri"
          const galleryChoice = pageBms.locator('button:has-text("Pilih dari Galeri")').first();
          if (await galleryChoice.isVisible().catch(() => false)) {
            await galleryChoice.click();
            await pageBms.waitForTimeout(600);
            await pageBms.screenshot({
              path: path.join(ARTIFACT_DIR, "task2_gallery_metadata_modal.png"),
            });
            console.log("  ✓ task2_gallery_metadata_modal.png saved");
          }
        }
      }
    }
    await pageBms.close();
    await ctxBms.close();

    // -------------------------------------------------------------
    // Area 3: Operational Report Table (Desktop & Indonesian Formats)
    // -------------------------------------------------------------
    console.log("[3/6] Capturing Operational Report Center Table & Badges...");
    const ctxReport = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAs(ctxReport, "BMS0001", "pass123");

    const pageReport = await ctxReport.newPage();
    await pageReport.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageReport.waitForTimeout(1500);
    await dismissPrompt(pageReport);

    await pageReport.screenshot({
      path: path.join(ARTIFACT_DIR, "task3_operational_report_table_desktop.png"),
    });
    console.log("  ✓ task3_operational_report_table_desktop.png saved");
    await pageReport.close();
    await ctxReport.close();

    // -------------------------------------------------------------
    // Area 4: Store & DC Search (BES Facility Search)
    // -------------------------------------------------------------
    console.log("[4/6] Capturing Facility Search for BES...");
    const ctxBes = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAs(ctxBes, "BES0001", "pass123");

    const pageBes = await ctxBes.newPage();
    await pageBes.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageBes.waitForTimeout(1500);
    await dismissPrompt(pageBes);

    const createBtnBes = pageBes.locator('button:has-text("Buat Laporan")');
    if (await createBtnBes.first().isVisible().catch(() => false)) {
      await createBtnBes.first().click();
      await pageBes.waitForTimeout(800);

      // Select Fasilitas / DC
      const dcBtn = pageBes.locator('button:has-text("Fasilitas / DC")');
      if (await dcBtn.first().isVisible().catch(() => false)) {
        await dcBtn.first().click();
        await pageBes.waitForTimeout(600);
      }

      const dcInput = pageBes.locator('input[placeholder*="Ketik kode"]');
      if (await dcInput.first().isVisible().catch(() => false)) {
        await dcInput.first().fill("DC");
        await pageBes.waitForTimeout(1200);
        await pageBes.screenshot({
          path: path.join(ARTIFACT_DIR, "task4_bes_facility_search_results.png"),
        });
        console.log("  ✓ task4_bes_facility_search_results.png saved");
      }
    }
    await pageBes.close();
    await ctxBes.close();

    // -------------------------------------------------------------
    // Area 5: Map Monitoring Toko Mode Controls (Basemap Only)
    // -------------------------------------------------------------
    console.log("[5/6] Capturing Map Controls in Toko Mode (Basemap Only)...");
    const ctxMap = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    await loginAs(ctxMap, "ADM0001", "admin123");

    const pageMap = await ctxMap.newPage();
    await pageMap.goto(`${BASE_URL}/monitoring`, { waitUntil: "domcontentloaded" });
    await pageMap.waitForTimeout(2000);
    await dismissPrompt(pageMap);

    // Switch mode to "Toko"
    const tokoModeBtn = pageMap.locator('button:has-text("Toko")');
    if (await tokoModeBtn.first().isVisible().catch(() => false)) {
      await tokoModeBtn.first().click();
      await pageMap.waitForTimeout(1200);
      await pageMap.screenshot({
        path: path.join(ARTIFACT_DIR, "task5_map_controls_toko_mode.png"),
      });
      console.log("  ✓ task5_map_controls_toko_mode.png saved");
    }
    await pageMap.close();
    await ctxMap.close();

    // -------------------------------------------------------------
    // Area 6: Mobile 390px Viewport (iPhone 12/13/14)
    // -------------------------------------------------------------
    console.log("[6/6] Capturing Mobile Viewport (390x844)...");
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAs(ctxMobile, "BMS0001", "pass123");

    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageMobile.waitForTimeout(3000);
    await dismissPrompt(pageMobile);

    await pageMobile.screenshot({
      path: path.join(ARTIFACT_DIR, "task6_mobile_390px_reports.png"),
    });
    console.log("  ✓ task6_mobile_390px_reports.png saved");
    await pageMobile.close();
    await ctxMobile.close();

  } finally {
    await browser.close();
    await closeDbPool();
    console.log("\nAll visual verification captures finished!");
  }
}

run().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});

