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
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const launchOptions: any = { headless: true };
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await loginAs(context, "BMS0001", "pass123");
  const page = await context.newPage();

  console.log("Navigating to /monitoring...");
  await page.goto(`${BASE_URL}/monitoring`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await dismissPrompt(page);

  // -------------------------------------------------------------
  // PART 1: Capture Store Popup (Screenshot 03)
  // -------------------------------------------------------------
  console.log("[1/2] Opening CICAHEUM Store Popup...");
  const tokoTab = page.locator('button[role="tab"]:has-text("Toko")').first();
  await tokoTab.click();
  await page.waitForTimeout(1000);

  // Search Cicaheum and select from list
  const searchInput = page.locator('input[placeholder*="Cari nama atau kode"]').first();
  await searchInput.fill("Cicaheum");
  await page.waitForTimeout(500);

  const listBtn = page.locator('button:has-text("Daftar")').first();
  await listBtn.click();
  await page.waitForTimeout(800);

  const cicaheumRow = page.locator('text=CICAHEUM').first();
  await cicaheumRow.click();
  await page.waitForTimeout(1200);

  // Close the right side panel by clicking its close button (X)
  const closePanel = page.locator('button:has-text("✕"), button[aria-label="Tutup"]').first();
  if (await closePanel.isVisible().catch(() => false)) {
    await closePanel.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Now click on the selected store pin 'A' on map
  const storePin = page.locator('.custom-store-pin, .leaflet-marker-icon').first();
  await storePin.click({ force: true });
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "03_store_popup_lihat_detail.png"),
  });
  console.log("Saved: 03_store_popup_lihat_detail.png");

  // -------------------------------------------------------------
  // PART 2: Capture Flood Popup (Screenshot 02)
  // -------------------------------------------------------------
  console.log("[2/2] Opening Flood Popup...");
  const kejadianTab = page.locator('button[role="tab"]:has-text("Kejadian")').first();
  await kejadianTab.click();
  await page.waitForTimeout(1500);

  // Click on flood beacon icon
  const floodIcon = page.locator('.custom-div-icon:has-text("🌊")').first();
  if (await floodIcon.isVisible()) {
    // Click on marker
    const box = await floodIcon.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await floodIcon.click({ force: true });
    }
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "02_flood_popup_redesigned.png"),
    });
    console.log("Saved: 02_flood_popup_redesigned.png");

    // Click "Lihat Lokasi di Peta"
    const navBtn = page.locator('button:has-text("Lihat Lokasi di Peta"), button:has-text("Fokus ke Area Genangan")').first();
    if (await navBtn.isVisible()) {
      console.log("Nav button text:", await navBtn.innerText());
      await navBtn.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "02_flood_map_focused.png"),
      });
      console.log("Saved: 02_flood_map_focused.png");
    }
  }

  await browser.close();
  console.log("=== EXACT POPUPS COMPLETE ===");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
