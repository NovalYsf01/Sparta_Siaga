import path from "node:path";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3004";
const ARTIFACT_DIR = "C:/Users/Noval/.gemini/antigravity-ide/brain/ca2dc085-c102-4fca-afc7-819463ff7701";
const SAMPLE_IMAGE_PATH = path.resolve(".agents/skills/shadcn/assets/shadcn-small.png");

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
  console.log("=== CAPTURING AREA 2 PHOTO FLOW SCREENSHOTS ===");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);

  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await loginAs(ctx, "BMS0001", "pass123");

    const page = await ctx.newPage();
    page.on("dialog", (d) => d.accept());

    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await dismissPrompt(page);

    console.log("Opening Buat Laporan modal...");
    const buatLaporanBtn = page.locator('button:has-text("Buat Laporan")').first();
    await buatLaporanBtn.waitFor({ state: "visible", timeout: 10000 });
    await buatLaporanBtn.click();
    console.log("Checking store selection...");
    const gantiBtn = page.locator('button:has-text("Ganti Toko")');
    if (!(await gantiBtn.isVisible())) {
      console.log("Searching and selecting store Cicaheum...");
      const storeInput = page.locator('input[placeholder*="Ketik kode"]');
      await storeInput.waitFor({ state: "visible", timeout: 5000 });
      await storeInput.fill("cicaheum");
      await page.waitForTimeout(1200);
      const storeItem = page.locator('li').filter({ hasText: "CICAHEUM" }).first();
      await storeItem.waitFor({ state: "visible", timeout: 5000 });
      await storeItem.click();
      await page.waitForTimeout(800);
    }

    console.log("Advancing to Step 2 (Photo Upload)...");
    const lanjutBtn = page.locator('button:has-text("Lanjut")');
    await lanjutBtn.click();
    await page.waitForTimeout(1200);

    // Verify Step 2 is active
    console.log("Capturing task2_upload_foto_unified_slots.png...");
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "task2_upload_foto_unified_slots.png"),
    });
    console.log("  ✓ task2_upload_foto_unified_slots.png saved");

    // Click first "Upload Foto" button
    console.log("Opening choice dialog...");
    const uploadSlotBtn = page.locator('button:has-text("Upload Foto")').first();
    await uploadSlotBtn.click();
    await page.waitForTimeout(600);

    // Capture Choice Dialog
    console.log("Capturing task2_upload_choice_dialog.png...");
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "task2_upload_choice_dialog.png"),
    });
    console.log("  ✓ task2_upload_choice_dialog.png saved");

    // Trigger file selection for Gallery Metadata Modal
    console.log("Triggering file selection for Gallery Metadata Modal...");
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
    await fileInput.setInputFiles(SAMPLE_IMAGE_PATH);
    await page.waitForTimeout(800);

    // Capture Gallery Metadata Modal (Diambil Sendiri)
    console.log("Capturing task2_gallery_metadata_modal.png (Diambil oleh Saya)...");
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "task2_gallery_metadata_modal.png"),
    });
    console.log("  ✓ task2_gallery_metadata_modal.png saved");

    // Select "Diterima Pihak Lain" to showcase all third-party fields
    console.log("Filling Gallery Metadata modal with third-party details...");
    const receivedRadio = page.locator('button:has-text("Diterima Pihak Lain")');
    if (await receivedRadio.isVisible()) {
      await receivedRadio.click();
      await page.waitForTimeout(400);

      const reasonInput = page.locator('textarea[placeholder*="Diambil sesaat"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill("Foto kerusakan dikirim oleh personil gerai via WhatsApp untuk percepatan eskalasi");
      }

      const providerInput = page.locator('input[placeholder*="Chief Store"]');
      if (await providerInput.isVisible()) {
        await providerInput.fill("Budi Santoso (Chief Store B081)");
      }

      const contextInput = page.locator('input[placeholder*="WhatsApp"]');
      if (await contextInput.isVisible()) {
        await contextInput.fill("Grup WhatsApp Tanggap Darurat B081 Cicaheum - 10:45 WIB");
      }
    }

    // Capture Gallery Metadata Modal (Pihak Lain)
    console.log("Capturing task2_gallery_metadata_modal_thirdparty.png...");
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "task2_gallery_metadata_modal_thirdparty.png"),
    });
    console.log("  ✓ task2_gallery_metadata_modal_thirdparty.png saved");

    await page.close();
    await ctx.close();
  } finally {
    await browser.close();
    console.log("Area 2 captures completed successfully!");
  }
}

run().catch((err) => {
  console.error("Area 2 capture failed:", err);
  process.exit(1);
});
