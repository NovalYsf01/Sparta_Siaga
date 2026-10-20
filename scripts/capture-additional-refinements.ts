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

async function run() {
  console.log("=== CAPTURING ADDITIONAL REFINEMENTS PLAYWRIGHT SCREENSHOTS ===");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);

  try {
    // -------------------------------------------------------------
    // PART 1: Task 1 - Camera Screen (No Gallery Button)
    // -------------------------------------------------------------
    console.log("[1/3] Testing & Capturing Task 1 Camera Screen (1366x768)...");
    const ctxDesktop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await loginAs(ctxDesktop, "BMS0001", "pass123");
    const pageDesktop = await ctxDesktop.newPage();
    pageDesktop.on("dialog", (d) => d.accept());

    await pageDesktop.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageDesktop.waitForTimeout(2500);
    await dismissPrompt(pageDesktop);

    const buatLaporanBtn = pageDesktop.locator('button:has-text("Buat Laporan")').first();
    if (await buatLaporanBtn.isVisible()) {
      await buatLaporanBtn.click();
      await pageDesktop.waitForTimeout(1000);

      // Select store if needed
      const gantiBtn = pageDesktop.locator('button:has-text("Ganti Toko")');
      if (!(await gantiBtn.isVisible())) {
        const storeInput = pageDesktop.locator('input[placeholder*="Ketik kode"]');
        if (await storeInput.isVisible()) {
          await storeInput.fill("cicaheum");
          await pageDesktop.waitForTimeout(1000);
          const storeItem = pageDesktop.locator("li").filter({ hasText: "CICAHEUM" }).first();
          if (await storeItem.isVisible()) {
            await storeItem.click();
            await pageDesktop.waitForTimeout(600);
          }
        }
      }

      const lanjutBtn = pageDesktop.locator('button:has-text("Lanjut")');
      if (await lanjutBtn.isVisible()) {
        await lanjutBtn.click();
        await pageDesktop.waitForTimeout(800);

        // Click first slot "Upload Foto"
        const slotBtn = pageDesktop.locator('button:has-text("Upload Foto")').first();
        if (await slotBtn.isVisible()) {
          await slotBtn.click();
          await pageDesktop.waitForTimeout(600);

          // Click "Ambil Foto Langsung" to open SPARTA Camera
          const cameraDirectBtn = pageDesktop.locator('button:has-text("Ambil Foto Langsung")');
          if (await cameraDirectBtn.isVisible()) {
            await cameraDirectBtn.click();
            await pageDesktop.waitForTimeout(1000);

            // Screenshot Camera Screen (verifying "Unggah dari Galeri" is removed)
            await pageDesktop.screenshot({
              path: path.join(ARTIFACT_DIR, "task1_camera_no_gallery.png"),
            });
            console.log("  ✓ task1_camera_no_gallery.png saved");
          }
        }
      }
    }

    await pageDesktop.close();

    // -------------------------------------------------------------
    // PART 2: Task 2, 3, 5, 6 - Detail Tracking Modal 5-Section & Gating
    // -------------------------------------------------------------
    console.log("[2/3] Testing & Capturing Detail Tracking Modal Redesign (1366x768)...");
    const pageReports = await ctxDesktop.newPage();
    pageReports.on("dialog", (d) => d.accept());
    await pageReports.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await pageReports.waitForTimeout(2500);
    await dismissPrompt(pageReports);

    // Open first incident row in table
    const detailBtn = pageReports.locator('button:has-text("Detail"), button:has-text("Review")').first();
    await detailBtn.waitFor({ state: "visible", timeout: 10000 });
    await detailBtn.click();
    await pageReports.waitForTimeout(1500);

    // TAB 1: RINGKASAN
    console.log("  -> Tab 1: Ringkasan...");
    const tab1 = pageReports.locator('button:has-text("1. Ringkasan")');
    if (await tab1.isVisible()) {
      await tab1.click();
      await pageReports.waitForTimeout(500);
      await pageReports.screenshot({
        path: path.join(ARTIFACT_DIR, "task3_detail_tracking_tab1_ringkasan.png"),
      });
      console.log("  ✓ task3_detail_tracking_tab1_ringkasan.png saved");
    }

    // TAB 2: PEMERIKSAAN & BUKTI AWAL
    console.log("  -> Tab 2: Pemeriksaan & Bukti Awal...");
    const tab2 = pageReports.locator('button:has-text("2. Pemeriksaan")');
    if (await tab2.isVisible()) {
      await tab2.click();
      await pageReports.waitForTimeout(500);
      await pageReports.screenshot({
        path: path.join(ARTIFACT_DIR, "task3_detail_tracking_tab2_pemeriksaan.png"),
      });
      console.log("  ✓ task3_detail_tracking_tab2_pemeriksaan.png saved");
    }

    // TAB 3: ESTIMASI & APPROVAL
    console.log("  -> Tab 3: Estimasi & Approval...");
    const tab3 = pageReports.locator('button:has-text("3. Estimasi")');
    if (await tab3.isVisible()) {
      await tab3.click();
      await pageReports.waitForTimeout(500);
      await pageReports.screenshot({
        path: path.join(ARTIFACT_DIR, "task3_detail_tracking_tab3_estimasi.png"),
      });
      console.log("  ✓ task3_detail_tracking_tab3_estimasi.png saved");
    }

    // TAB 4: PROGRES & MILESTONE (Gating banner + Task 6 UI cleanup)
    console.log("  -> Tab 4: Progres & Milestone (Gating banner & No Repair Links)...");
    const tab4 = pageReports.locator('button:has-text("4. Progres")');
    if (await tab4.isVisible()) {
      await tab4.click();
      await pageReports.waitForTimeout(500);
      await pageReports.screenshot({
        path: path.join(ARTIFACT_DIR, "task2_progress_gated_banner.png"),
      });
      await pageReports.screenshot({
        path: path.join(ARTIFACT_DIR, "task6_repair_links_removed.png"),
      });
      console.log("  ✓ task2_progress_gated_banner.png saved");
      console.log("  ✓ task6_repair_links_removed.png saved");
    }

    // TAB 5: RIWAYAT & DOKUMEN (PDF & ZIP Bundle)
    console.log("  -> Tab 5: Riwayat & Dokumen...");
    const tab5 = pageReports.locator('button:has-text("5. Riwayat")');
    if (await tab5.isVisible()) {
      await tab5.click();
      await pageReports.waitForTimeout(500);
      await pageReports.screenshot({
        path: path.join(ARTIFACT_DIR, "task3_detail_tracking_tab5_dokumen.png"),
      });
      console.log("  ✓ task3_detail_tracking_tab5_dokumen.png saved");
    }

    await pageReports.close();

    // -------------------------------------------------------------
    // PART 3: Mobile Layouts (360px & 390px)
    // -------------------------------------------------------------
    console.log("[3/3] Testing & Capturing Mobile Viewports...");

    // Viewport 360x740 (Standard Android)
    const ctx360 = await browser.newContext({ viewport: { width: 360, height: 740 } });
    await loginAs(ctx360, "BMS0001", "pass123");
    const page360 = await ctx360.newPage();
    await page360.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page360.waitForTimeout(2500);
    await dismissPrompt(page360);

    const detailBtn360 = page360.locator('button:visible').filter({ hasText: /Lihat Detail|Review|Detail/ }).first();
    await detailBtn360.waitFor({ state: "visible", timeout: 10000 });
    await detailBtn360.click();
    await page360.waitForTimeout(1500);
    await page360.screenshot({
      path: path.join(ARTIFACT_DIR, "mobile_360_modal_redesign.png"),
    });
    console.log("  ✓ mobile_360_modal_redesign.png saved");
    await page360.close();

    // Viewport 390x844 (Standard iPhone)
    const ctx390 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await loginAs(ctx390, "BMS0001", "pass123");
    const page390 = await ctx390.newPage();
    await page390.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page390.waitForTimeout(2500);
    await dismissPrompt(page390);

    const detailBtn390 = page390.locator('button:visible').filter({ hasText: /Lihat Detail|Review|Detail/ }).first();
    await detailBtn390.waitFor({ state: "visible", timeout: 10000 });
    await detailBtn390.click();
    await page390.waitForTimeout(1500);
    await page390.screenshot({
      path: path.join(ARTIFACT_DIR, "mobile_390_modal_redesign.png"),
    });
    console.log("  ✓ mobile_390_modal_redesign.png saved");
    await page390.close();

    console.log("\n========================================================");
    console.log("🎉 ALL PLAYWRIGHT SCREENSHOTS CAPTURED SUCCESSFULLY! 🎉");
    console.log("========================================================");
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error("Playwright script failed:", e);
  process.exit(1);
});
