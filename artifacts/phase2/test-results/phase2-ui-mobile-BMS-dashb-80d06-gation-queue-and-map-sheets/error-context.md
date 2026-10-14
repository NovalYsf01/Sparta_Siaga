# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2-ui.spec.ts >> mobile BMS dashboard, bottom navigation, queue, and map sheets
- Location: tests\browser\phase2-ui.spec.ts:66:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Fixture "trace recording" timeout of 90000ms exceeded during teardown.
```

```
Error: page.screenshot: Test ended.
Browser logs:

<launching> C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-edgeupdater --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,BlockOriginHeaderModificationOnRedirect,Translate,AutoDeElevate,OptimizationHints,NetworkTimeServiceQuerying,AimEnabled,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --disable-updater-scheduler --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=C:\Users\Noval\AppData\Local\Temp\playwright_chromiumdev_profile-xB97zO --remote-debugging-pipe --no-startup-window
<launched> pid=29008
[pid=29008] <gracefully close start>
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  1  | import fs from "node:fs";
  2  | import path from "node:path";
  3  | import { expect, test, type BrowserContext, type Page } from "@playwright/test";
  4  | 
  5  | const screenshotDir = path.resolve(process.cwd(), "artifacts/phase2/screenshots");
  6  | fs.mkdirSync(screenshotDir, { recursive: true });
  7  | 
  8  | let adminToken = "";
  9  | let bmsToken = "";
  10 | let hoToken = "";
  11 | 
  12 | async function session(context: BrowserContext, token: string) {
  13 |   await context.addCookies([{ name: "siaga_session", value: token, url: "http://127.0.0.1:3014", httpOnly: true, sameSite: "Lax" }]);
  14 |   await context.addInitScript(() => localStorage.setItem("sparta_notif_permission_prompted", "true"));
  15 | }
  16 | 
  17 | async function noHorizontalOverflow(page: Page) {
  18 |   const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  19 |   expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
  20 | }
  21 | 
  22 | async function dismissPermissionPrompt(page: Page) {
  23 |   const later = page.getByRole("button", { name: "Nanti Saja" });
  24 |   if (await later.isVisible().catch(() => false)) await later.click();
  25 | }
  26 | 
  27 | test.beforeAll(async () => {
  28 |   const [{ dbUpsertUser }, { signSession }, { assertIsolatedDatabase }, { getDbPool, closeDbPool }] = await Promise.all([
  29 |     import("../../lib/user-db"), import("../../lib/jwt"), import("../../lib/database-safety"), import("../../lib/db"),
  30 |   ]);
  31 |   await assertIsolatedDatabase(getDbPool());
  32 |   await Promise.all([
  33 |     dbUpsertUser({ id: "usr_pw_admin", nik: "PW_ADMIN", name: "Admin UI Test", systemRole: "ADMIN", businessRole: null, scope: null, branch: null, status: "ACTIVE" }),
  34 |     dbUpsertUser({ id: "usr_pw_bms", nik: "PW_BMS", name: "BMS UI Test", systemRole: "USER", businessRole: "bms", scope: "BRANCH", branch: "BANDUNG", status: "ACTIVE" }),
  35 |     dbUpsertUser({ id: "usr_pw_ho", nik: "PW_HO", name: "HO UI Test", systemRole: "USER", businessRole: "ho_admin", scope: "HO", branch: null, status: "ACTIVE" }),
  36 |   ]);
  37 |   [adminToken, bmsToken, hoToken] = await Promise.all([
  38 |     signSession({ id: "usr_pw_admin", nik: "PW_ADMIN", systemRole: "ADMIN" }),
  39 |     signSession({ id: "usr_pw_bms", nik: "PW_BMS", systemRole: "USER" }),
  40 |     signSession({ id: "usr_pw_ho", nik: "PW_HO", systemRole: "USER" }),
  41 |   ]);
  42 |   await closeDbPool();
  43 | });
  44 | 
  45 | test("desktop admin navigation, facility filters, audit, and reconciliation", async ({ browser }) => {
  46 |   const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  47 |   await session(context, adminToken);
  48 |   const page = await context.newPage();
  49 |   await page.goto("/admin/facilities");
  50 |   await dismissPermissionPrompt(page);
  51 |   await expect(page.getByRole("heading", { name: "Master Fasilitas" })).toBeVisible();
  52 |   await expect(page.getByRole("button", { name: /Riwayat perubahan/i }).first()).toBeVisible({ timeout: 20_000 });
  53 |   await page.getByPlaceholder("Cari kode atau nama").fill("KY10");
  54 |   await expect(page.getByText("KY10", { exact: true })).toBeVisible({ timeout: 20_000 });
  55 |   await page.getByRole("button", { name: /Riwayat perubahan/i }).first().click();
  56 |   await expect(page.getByRole("dialog")).toBeVisible();
  57 |   await page.screenshot({ path: path.join(screenshotDir, "desktop-master-fasilitas-audit.png"), fullPage: true });
  58 |   await page.getByRole("button", { name: "Tutup", exact: true }).click();
  59 |   await page.goto("/admin/reconciliation");
  60 |   await expect(page.getByRole("heading", { name: "Rekonsiliasi Gempa" })).toBeVisible();
  61 |   await noHorizontalOverflow(page);
  62 |   await page.screenshot({ path: path.join(screenshotDir, "desktop-rekonsiliasi.png"), fullPage: true });
  63 |   await context.close();
  64 | });
  65 | 
  66 | test("mobile BMS dashboard, bottom navigation, queue, and map sheets", async ({ browser }) => {
  67 |   const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  68 |   await session(context, bmsToken);
  69 |   const page = await context.newPage();
  70 |   await page.goto("/");
  71 |   await dismissPermissionPrompt(page);
  72 |   await expect(page.getByRole("region", { name: "Ringkasan operasional mobile" }).getByText("Shared Queue")).toBeVisible();
  73 |   await expect(page.locator("nav").getByText("Beranda")).toBeVisible();
  74 |   await noHorizontalOverflow(page);
  75 |   await page.screenshot({ path: path.join(screenshotDir, "mobile-dashboard.png"), fullPage: true });
  76 |   await page.goto("/reports/shared-queue");
  77 |   await expect(page.getByRole("main").getByRole("heading", { name: "Shared Queue" })).toBeVisible();
  78 |   await noHorizontalOverflow(page);
  79 |   await page.screenshot({ path: path.join(screenshotDir, "mobile-shared-queue.png"), fullPage: true });
  80 |   await page.goto("/monitoring");
  81 |   await page.getByRole("button", { name: "Mode Lokasi" }).click();
  82 |   await page.getByRole("button", { name: "Filter fasilitas" }).click();
  83 |   await expect(page.getByRole("dialog", { name: "Filter fasilitas" })).toBeVisible();
  84 |   await noHorizontalOverflow(page);
> 85 |   await page.screenshot({ path: path.join(screenshotDir, "mobile-map-filter.png"), fullPage: true });
     |              ^ Error: page.screenshot: Test ended.
  86 |   await context.close();
  87 | });
  88 | 
  89 | test("HO remains read-only for operational mutations", async ({ browser }) => {
  90 |   const context = await browser.newContext();
  91 |   await session(context, hoToken);
  92 |   const request = context.request;
  93 |   const response = await request.post("/api/incidents/nonexistent/pic");
  94 |   expect(response.status()).toBe(403);
  95 |   await context.close();
  96 | });
  97 | 
```