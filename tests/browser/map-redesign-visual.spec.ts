import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const screenshotDir = path.resolve(process.cwd(), "artifacts/phase2/screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

let bmsToken = "";
let besToken = "";
let adminToken = "";

async function session(context: BrowserContext, token: string) {
  await context.addCookies([
    { name: "siaga_session", value: token, url: "http://127.0.0.1:3014", httpOnly: true, sameSite: "Lax" },
  ]);
  await context.addInitScript(() => localStorage.setItem("sparta_notif_permission_prompted", "true"));
}

async function dismissPermissionPrompt(page: Page) {
  const later = page.getByRole("button", { name: "Nanti Saja" });
  if (await later.isVisible().catch(() => false)) await later.click();
}

async function noHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
}

test.beforeAll(async () => {
  const [{ dbUpsertUser }, { signSession }, { assertIsolatedDatabase }, { getDbPool, closeDbPool }] = await Promise.all([
    import("../../lib/user-db"),
    import("../../lib/jwt"),
    import("../../lib/database-safety"),
    import("../../lib/db"),
  ]);
  await assertIsolatedDatabase(getDbPool());
  await Promise.all([
    dbUpsertUser({
      id: "usr_vis_admin",
      nik: "VIS_ADMIN",
      name: "Admin Visual Test",
      systemRole: "ADMIN",
      businessRole: null,
      scope: null,
      branch: null,
      status: "ACTIVE",
    }),
    dbUpsertUser({
      id: "usr_vis_bms",
      nik: "VIS_BMS",
      name: "BMS Visual Test",
      systemRole: "USER",
      businessRole: "bms",
      scope: "BRANCH",
      branch: "BANDUNG",
      status: "ACTIVE",
    }),
    dbUpsertUser({
      id: "usr_vis_bes",
      nik: "VIS_BES",
      name: "BES Visual Test",
      systemRole: "USER",
      businessRole: "bes",
      scope: "BRANCH",
      branch: "BANDUNG",
      status: "ACTIVE",
    }),
  ]);
  [adminToken, bmsToken, besToken] = await Promise.all([
    signSession({ id: "usr_vis_admin", nik: "VIS_ADMIN", systemRole: "ADMIN" }),
    signSession({ id: "usr_vis_bms", nik: "VIS_BMS", systemRole: "USER" }),
    signSession({ id: "usr_vis_bes", nik: "VIS_BES", systemRole: "USER" }),
  ]);
  await closeDbPool();
});

test("desktop 1366px map overhaul: Mode Kejadian, Mode Lokasi, Filter, and Detail Panel", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await session(context, bmsToken);
  const page = await context.newPage();

  // 1. Mode Kejadian Default
  await page.goto("/monitoring");
  await dismissPermissionPrompt(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "desktop-1366-mode-kejadian.png") });

  // 2. Open Filter in Mode Kejadian
  const filterBtn = page.getByRole("button", { name: "Filter fasilitas" });
  if (await filterBtn.isVisible().catch(() => false)) {
    await filterBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, "desktop-1366-filter.png") });
    // Close filter
    const closeBtn = page.getByRole("button", { name: "Tutup filter" });
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
  }

  // 3. Switch to Mode Lokasi
  await page.getByRole("button", { name: "Mode Lokasi" }).click();
  await page.waitForTimeout(800);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "desktop-1366-mode-lokasi.png") });

  // 4. Open Location List (Daftar Lokasi)
  const listBtn = page.getByRole("button", { name: /Daftar Lokasi/i });
  if (await listBtn.isVisible().catch(() => false)) {
    await listBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, "desktop-1366-location-list.png") });
  }

  await context.close();
});

test("mobile 390px map overhaul: Mode Kejadian, Mode Lokasi, Bottom Sheets", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await session(context, bmsToken);
  const page = await context.newPage();

  // 1. Mobile Mode Kejadian Default
  await page.goto("/monitoring");
  await dismissPermissionPrompt(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-390-mode-kejadian.png") });

  // 2. Switch to Mobile Mode Lokasi
  await page.getByRole("button", { name: "Mode Lokasi" }).click();
  await page.waitForTimeout(800);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-390-mode-lokasi.png") });

  // 3. Mobile Floating Filter Pill
  const filterPill = page.getByRole("button", { name: "Filter fasilitas" });
  await expect(filterPill).toBeVisible();
  await filterPill.click();
  await page.waitForTimeout(400);
  await expect(page.getByRole("dialog", { name: "Filter fasilitas" })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-390-filter-sheet.png") });

  // Close filter sheet
  await page.getByRole("button", { name: "Tutup filter" }).click();
  await page.waitForTimeout(300);

  // 4. Mobile Location List Pill [ Daftar ]
  const listPill = page.getByRole("button", { name: "Daftar lokasi operasional" });
  await expect(listPill).toBeVisible();
  await listPill.click();
  await page.waitForTimeout(400);
  await expect(page.getByRole("dialog", { name: "Daftar Lokasi Operasional" })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-390-location-list-sheet.png") });

  await context.close();
});

test("mobile 360px map overhaul: compact viewport verification", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  await session(context, bmsToken);
  const page = await context.newPage();

  await page.goto("/monitoring");
  await dismissPermissionPrompt(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-360-mode-kejadian.png") });

  await page.getByRole("button", { name: "Mode Lokasi" }).click();
  await page.waitForTimeout(800);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-360-mode-lokasi.png") });

  await context.close();
});

test("tablet 768px map overhaul: intermediate viewport verification", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    isMobile: false,
  });
  await session(context, bmsToken);
  const page = await context.newPage();

  await page.goto("/monitoring");
  await dismissPermissionPrompt(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "tablet-768-mode-kejadian.png") });

  await page.getByRole("button", { name: "Mode Lokasi" }).click();
  await page.waitForTimeout(800);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "tablet-768-mode-lokasi.png") });

  await context.close();
});
