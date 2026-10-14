import { expect, test } from "@playwright/test";

const devAdminPassword = process.env.DEV_ADMIN_PASSWORD || "admin123";
const demoUserPassword = process.env.DEMO_USER_PASSWORD || "pass123";

test.beforeAll(async () => {
  const { seedDemoPersonas } = await import("../../scripts/seed-demo-personas");
  const { closeDbPool } = await import("../../lib/db");
  await seedDemoPersonas();
  await closeDbPool();
});

test.describe("Real Browser & HTTP Authentication Tests", () => {
  test("BMS login via User ID ('USR-BMS-001') successfully authenticates and redirects", async ({ page, context }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Masuk ke Sistem" })).toBeVisible();

    await page.locator("#login-identifier").fill("USR-BMS-001");
    await page.locator("#login-password").fill(demoUserPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login") && res.request().method() === "POST"),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);

    // Wait for redirect to home
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    // Verify session cookie exists in browser context
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "siaga_session");
    expect(sessionCookie).toBeDefined();

    // Verify /api/auth/me returns BMS role and branch
    const meResponse = await page.request.get("/api/auth/me");
    expect(meResponse.status()).toBe(200);
    const meJson = await meResponse.json();
    expect(meJson.businessRole).toBe("bms");
    expect(meJson.branch).toBe("BANDUNG");
  });

  test("BMS login via username alias ('bms') successfully authenticates", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("bms");
    await page.locator("#login-password").fill(demoUserPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const meResponse = await page.request.get("/api/auth/me");
    expect(meResponse.status()).toBe(200);
    const meJson = await meResponse.json();
    expect(meJson.businessRole).toBe("bms");
  });

  test("BES login via username alias ('bes') successfully authenticates and returns BES role", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("bes");
    await page.locator("#login-password").fill(demoUserPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const meResponse = await page.request.get("/api/auth/me");
    expect(meResponse.status()).toBe(200);
    const meJson = await meResponse.json();
    expect(meJson.businessRole).toBe("bes");
    expect(meJson.branch).toBe("BANDUNG");
  });

  test("BMM login via username alias ('bmm') successfully authenticates and returns BM role", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("bmm");
    await page.locator("#login-password").fill(demoUserPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const meResponse = await page.request.get("/api/auth/me");
    expect(meResponse.status()).toBe(200);
    const meJson = await meResponse.json();
    expect(meJson.businessRole).toBe("bm");
  });

  test("HO login via username alias ('ho') successfully authenticates and returns HO role", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("ho");
    await page.locator("#login-password").fill(demoUserPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const meResponse = await page.request.get("/api/auth/me");
    expect(meResponse.status()).toBe(200);
    const meJson = await meResponse.json();
    expect(meJson.businessRole).toBe("ho_admin");
    expect(meJson.scope).toBe("HO");
  });

  test("Admin login via username alias ('admin') successfully authenticates and returns ADMIN system role", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("admin");
    await page.locator("#login-password").fill(devAdminPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(200);
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const meResponse = await page.request.get("/api/auth/me");
    expect(meResponse.status()).toBe(200);
    const meJson = await meResponse.json();
    expect(meJson.systemRole).toBe("ADMIN");
  });

  test("Invalid password fails with 401 and displays accessible error alert", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("USR-BMS-001");
    await page.locator("#login-password").fill("wrong-password-999");

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(401);

    // Verify still on login page
    expect(page.url()).toContain("/login");

    // Verify error alert is rendered
    const alert = page.getByTestId("login-error-alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Kredensial tidak valid");
  });

  test("Inactive account fails with 403 and displays blocked account message", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("1001");
    await page.locator("#login-password").fill(demoUserPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    expect(loginResponse.status()).toBe(403);

    // Verify still on login page
    expect(page.url()).toContain("/login");

    // Verify error alert is rendered
    const alert = page.getByTestId("login-error-alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Akun tidak aktif");
  });

  test("Session persists across page refresh", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-identifier").fill("bms");
    await page.locator("#login-password").fill(demoUserPassword);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.getByRole("button", { name: "Masuk" }).click(),
    ]);

    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Ensure user remains authenticated and not redirected back to /login
    expect(page.url()).not.toContain("/login");
    const meResponse = await page.request.get("/api/auth/me");
    expect(meResponse.status()).toBe(200);
    const meJson = await meResponse.json();
    expect(meJson.businessRole).toBe("bms");
  });
});
