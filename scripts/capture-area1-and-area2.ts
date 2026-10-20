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
  console.log("=== CAPTURING REMAINING EVIDENCE (AREA 1, 2, 4, 6) ===");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);

  try {
    // -------------------------------------------------------------
    // AREA 1: Notification Detail Modal & Map Fly
    // -------------------------------------------------------------
    console.log("[1] Capturing Area 1 Detail Modal & Map Flight...");
    const ctx1 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await loginAs(ctx1, "ADM0001", "admin123");
    const page1 = await ctx1.newPage();
    await page1.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page1.waitForTimeout(2000);
    await dismissPrompt(page1);

    await page1.locator('button[aria-label="Notifikasi"]').click();
    await page1.waitForTimeout(800);
    await page1.locator('button:has-text("RIWAYAT")').click();
    await page1.waitForTimeout(800);

    // Click Lihat Detail button strictly inside the notification sheet
    const sheet1 = page1.locator('.fixed.z-\\[700\\]');
    const detailBtn = sheet1.locator('button:has-text("Lihat Detail")').first();
    console.log("detailBtn count in sheet:", await detailBtn.count());
    await detailBtn.click();
    await page1.waitForTimeout(1000);

    await page1.screenshot({
      path: path.join(ARTIFACT_DIR, "task1_notification_detail_modal.png"),
    });
    console.log("  ✓ task1_notification_detail_modal.png saved");

    // Click "Lihat di Peta" on the store row inside the modal
    const modal1 = page1.locator('.fixed.z-\\[850\\]');
    const mapAction = modal1.locator('button:has-text("Lihat di Peta")').first();
    if (await mapAction.isVisible()) {
      await mapAction.click();
      await page1.waitForTimeout(2000);
      await page1.screenshot({
        path: path.join(ARTIFACT_DIR, "task1_map_fly_to_location.png"),
      });
      console.log("  ✓ task1_map_fly_to_location.png saved");
    }
    await page1.close();
    await ctx1.close();

    // -------------------------------------------------------------
    // AREA 2: Unified Upload Slots, Choice Dialog, Gallery Modal
    // -------------------------------------------------------------
    console.log("[2] Capturing Area 2 Photo Upload Flow...");
    const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await loginAs(ctx2, "BMS0001", "pass123");
    const page2 = await ctx2.newPage();
    await page2.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page2.waitForTimeout(2500);
    await dismissPrompt(page2);

    await page2.locator('button:has-text("Buat Laporan")').first().click();
    await page2.waitForTimeout(1000);

    // Search and select Cicaheum store
    const storeInput = page2.locator('input[placeholder*="Ketik kode"]');
    await storeInput.fill("cicaheum");
    await page2.waitForTimeout(1200);

    // Click on the store in dropdown list
    const storeItem = page2.locator('li').filter({ hasText: "CICAHEUM" }).first();
    await storeItem.click();
    await page2.waitForTimeout(800);

    // Advance to Step 2
    await page2.locator('button:has-text("Lanjut")').click();
    await page2.waitForTimeout(1000);

    // Step 2 is active: capture unified slots
    await page2.screenshot({
      path: path.join(ARTIFACT_DIR, "task2_upload_foto_unified_slots.png"),
    });
    console.log("  ✓ task2_upload_foto_unified_slots.png saved");

    // Click first unified upload button
    const uploadBtn = page2.locator('button:has-text("Upload Foto")').first();
    await uploadBtn.click();
    await page2.waitForTimeout(600);

    await page2.screenshot({
      path: path.join(ARTIFACT_DIR, "task2_upload_choice_dialog.png"),
    });
    console.log("  ✓ task2_upload_choice_dialog.png saved");

    // Click "Pilih dari Galeri"
    await page2.locator('button:has-text("Pilih dari Galeri")').first().click();
    await page2.waitForTimeout(600);

    await page2.screenshot({
      path: path.join(ARTIFACT_DIR, "task2_gallery_metadata_modal.png"),
    });
    console.log("  ✓ task2_gallery_metadata_modal.png saved");
    await page2.close();
    await ctx2.close();

    // -------------------------------------------------------------
    // AREA 4: BES Facility Search with DC active
    // -------------------------------------------------------------
    console.log("[4] Capturing Area 4 BES Facility Search...");
    const ctx4 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await loginAs(ctx4, "BES0001", "pass123");
    const page4 = await ctx4.newPage();
    await page4.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page4.waitForTimeout(2500);
    await dismissPrompt(page4);

    await page4.locator('button:has-text("Buat Laporan")').first().click();
    await page4.waitForTimeout(1000);

    // Fill DC in search
    const dcInput = page4.locator('input[placeholder*="Ketik kode"]');
    await dcInput.fill("DC");
    await page4.waitForTimeout(1500);

    await page4.screenshot({
      path: path.join(ARTIFACT_DIR, "task4_bes_facility_search_results.png"),
    });
    console.log("  ✓ task4_bes_facility_search_results.png saved");
    await page4.close();
    await ctx4.close();

    // -------------------------------------------------------------
    // AREA 6: Mobile 390px Viewport Reports
    // -------------------------------------------------------------
    console.log("[6] Capturing Area 6 Mobile Reports View...");
    const ctx6 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await loginAs(ctx6, "BMS0001", "pass123");
    const page6 = await ctx6.newPage();
    await page6.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page6.waitForTimeout(3500);
    await dismissPrompt(page6);

    await page6.screenshot({
      path: path.join(ARTIFACT_DIR, "task6_mobile_390px_reports.png"),
    });
    console.log("  ✓ task6_mobile_390px_reports.png saved");
    await page6.close();
    await ctx6.close();

  } finally {
    await browser.close();
    await closeDbPool();
    console.log("All targeted captures finished successfully!");
  }
}

run().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
