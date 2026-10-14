import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const screenshotDir = path.resolve(process.cwd(), "artifacts/phase2/screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

let adminToken = "";
let bmsToken = "";
let hoToken = "";

async function session(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "siaga_session", value: token, url: "http://127.0.0.1:3014", httpOnly: true, sameSite: "Lax" }]);
  await context.addInitScript(() => localStorage.setItem("sparta_notif_permission_prompted", "true"));
}

async function noHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
}

async function dismissPermissionPrompt(page: Page) {
  const later = page.getByRole("button", { name: "Nanti Saja" });
  if (await later.isVisible().catch(() => false)) await later.click();
}

test.beforeAll(async () => {
  const [{ dbUpsertUser }, { signSession }, { assertIsolatedDatabase }, { getDbPool, closeDbPool }] = await Promise.all([
    import("../../lib/user-db"), import("../../lib/jwt"), import("../../lib/database-safety"), import("../../lib/db"),
  ]);
  await assertIsolatedDatabase(getDbPool());
  await Promise.all([
    dbUpsertUser({ id: "usr_pw_admin", nik: "PW_ADMIN", name: "Admin UI Test", systemRole: "ADMIN", businessRole: null, scope: null, branch: null, status: "ACTIVE" }),
    dbUpsertUser({ id: "usr_pw_bms", nik: "PW_BMS", name: "BMS UI Test", systemRole: "USER", businessRole: "bms", scope: "BRANCH", branch: "BANDUNG", status: "ACTIVE" }),
    dbUpsertUser({ id: "usr_pw_ho", nik: "PW_HO", name: "HO UI Test", systemRole: "USER", businessRole: "ho_admin", scope: "HO", branch: null, status: "ACTIVE" }),
  ]);
  [adminToken, bmsToken, hoToken] = await Promise.all([
    signSession({ id: "usr_pw_admin", nik: "PW_ADMIN", systemRole: "ADMIN" }),
    signSession({ id: "usr_pw_bms", nik: "PW_BMS", systemRole: "USER" }),
    signSession({ id: "usr_pw_ho", nik: "PW_HO", systemRole: "USER" }),
  ]);
  await closeDbPool();
});

test("desktop admin navigation, facility filters, audit, and reconciliation", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await session(context, adminToken);
  const page = await context.newPage();
  await page.goto("/admin/facilities");
  await dismissPermissionPrompt(page);
  await expect(page.getByRole("heading", { name: "Master Fasilitas" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Riwayat perubahan/i }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder("Cari kode atau nama").fill("KY10");
  await expect(page.getByText("KY10", { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Riwayat perubahan/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, "desktop-master-fasilitas-audit.png"), fullPage: true });
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.goto("/admin/reconciliation");
  await expect(page.getByRole("heading", { name: "Rekonsiliasi Gempa" })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "desktop-rekonsiliasi.png"), fullPage: true });
  await context.close();
});

test("mobile BMS dashboard, bottom navigation, queue, and map sheets", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await session(context, bmsToken);
  const page = await context.newPage();
  await page.goto("/");
  await dismissPermissionPrompt(page);
  await expect(page.getByRole("region", { name: "Ringkasan operasional mobile" }).getByText("Shared Queue")).toBeVisible();
  await expect(page.locator("nav").getByText("Beranda")).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-dashboard.png"), fullPage: true });
  await page.goto("/reports/shared-queue");
  await expect(page.getByRole("main").getByRole("heading", { name: "Shared Queue" })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-shared-queue.png"), fullPage: true });
  await page.goto("/monitoring");
  await page.getByRole("button", { name: "Mode Lokasi" }).click();
  await page.getByRole("button", { name: "Filter fasilitas" }).click();
  await expect(page.getByRole("dialog", { name: "Filter fasilitas" })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(screenshotDir, "mobile-map-filter.png") });
  await context.close();
});

test("HO remains read-only for operational mutations", async ({ browser }) => {
  const context = await browser.newContext();
  await session(context, hoToken);
  const request = context.request;
  const response = await request.post("/api/incidents/nonexistent/pic");
  expect(response.status()).toBe(403);
  await context.close();
});
