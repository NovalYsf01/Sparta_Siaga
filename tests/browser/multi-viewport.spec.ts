import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const screenshotDir = path.resolve(process.cwd(), "artifacts/phase2/screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

let adminToken = "";
let bmsToken = "";

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
      id: "usr_mv_admin",
      nik: "MV_ADMIN",
      name: "Admin Viewport Test",
      systemRole: "ADMIN",
      businessRole: null,
      scope: null,
      branch: null,
      status: "ACTIVE",
    }),
    dbUpsertUser({
      id: "usr_mv_bms",
      nik: "MV_BMS",
      name: "BMS Viewport Test",
      systemRole: "USER",
      businessRole: "bms",
      scope: "BRANCH",
      branch: "BANDUNG",
      status: "ACTIVE",
    }),
  ]);
  [adminToken, bmsToken] = await Promise.all([
    signSession({ id: "usr_mv_admin", nik: "MV_ADMIN", systemRole: "ADMIN" }),
    signSession({ id: "usr_mv_bms", nik: "MV_BMS", systemRole: "USER" }),
  ]);
  await closeDbPool();
});

const VIEWPORTS = [
  { width: 360, height: 740, name: "360px", isMobile: true },
  { width: 390, height: 844, name: "390px", isMobile: true },
  { width: 768, height: 1024, name: "768px", isMobile: false },
  { width: 1366, height: 768, name: "1366px", isMobile: false },
];

for (const vp of VIEWPORTS) {
  test(`multi-viewport capture at ${vp.name} (${vp.width}x${vp.height})`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    await session(context, bmsToken);
    const page = await context.newPage();

    // 1. Dashboard
    await page.goto("/");
    await dismissPermissionPrompt(page);
    await page.waitForLoadState("networkidle");
    await noHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotDir, `dashboard-${vp.name}.png`),
      fullPage: true,
    });

    // 2. Shared Queue
    await page.goto("/reports/shared-queue");
    await page.waitForLoadState("networkidle");
    await noHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotDir, `shared-queue-${vp.name}.png`),
      fullPage: true,
    });

    // 3. Peta Mode Kejadian
    await page.goto("/monitoring");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000); // Wait for Leaflet tiles/canvas render
    await noHorizontalOverflow(page);
    await page.screenshot({
      path: path.join(screenshotDir, `peta-mode-kejadian-${vp.name}.png`),
    });

    // 4. Peta Mode Lokasi
    const modeLokasiBtn = page.getByRole("button", { name: "Mode Lokasi" });
    if (await modeLokasiBtn.isVisible().catch(() => false)) {
      await modeLokasiBtn.click();
      await page.waitForTimeout(600);
      await noHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(screenshotDir, `peta-mode-lokasi-${vp.name}.png`),
      });
    }

    // 5. Master Fasilitas (Admin Context)
    const adminCtx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    await session(adminCtx, adminToken);
    const adminPage = await adminCtx.newPage();
    await adminPage.goto("/admin/facilities");
    await dismissPermissionPrompt(adminPage);
    await adminPage.waitForLoadState("networkidle");

    const auditBtn = adminPage.getByRole("button", { name: /Riwayat perubahan/i }).first();
    if (await auditBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await auditBtn.click();
      await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await adminPage.screenshot({
        path: path.join(screenshotDir, `master-fasilitas-audit-${vp.name}.png`),
      });
    } else {
      await adminPage.screenshot({
        path: path.join(screenshotDir, `master-fasilitas-${vp.name}.png`),
      });
    }

    await adminCtx.close();
    await context.close();
  });
}
