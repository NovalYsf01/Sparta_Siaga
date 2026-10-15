import { expect, test } from "@playwright/test";

const demoUserPassword = process.env.DEMO_USER_PASSWORD || "pass123";

test.beforeAll(async () => {
  const { seedDemoPersonas } = await import("../../scripts/seed-demo-personas");
  const { getDbPool, closeDbPool } = await import("../../lib/db");
  await seedDemoPersonas();
  const pool = getDbPool();
  await pool.query(`UPDATE users SET token_version = 1, status = 'ACTIVE' WHERE id = 'USR-DEMO-BES'`);
  await closeDbPool();
});

test.describe("T11: Multi-Device Real Browser Authentication", () => {
  test("One account logs into 3 independent browser contexts simultaneously without kicking each other out", async ({ browser }) => {
    // 1. Device A: Laptop (Desktop 1366x768)
    const contextLaptop = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SpartaLaptop/1.0",
    });
    const pageLaptop = await contextLaptop.newPage();

    // 2. Device B: Smartphone (Mobile 390x844)
    const contextPhone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) SpartaMobile/1.0",
    });
    const pagePhone = await contextPhone.newPage();

    // 3. Device C: Tablet (Tablet 768x1024)
    const contextTablet = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) SpartaTablet/1.0",
    });
    const pageTablet = await contextTablet.newPage();

    // === STEP 1: Login on Device A (Laptop) ===
    await pageLaptop.goto("/login");
    await pageLaptop.locator("#login-identifier").fill("bes");
    await pageLaptop.locator("#login-password").fill(demoUserPassword);
    await Promise.all([
      pageLaptop.waitForResponse((res) => res.url().includes("/api/auth/login")),
      pageLaptop.getByRole("button", { name: "Masuk" }).click(),
    ]);
    await pageLaptop.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const laptopCookies = await contextLaptop.cookies();
    const laptopSession = laptopCookies.find((c) => c.name === "siaga_session");
    expect(laptopSession).toBeDefined();

    // === STEP 2: Login on Device B (Smartphone) with SAME account ===
    await pagePhone.goto("/login");
    await pagePhone.locator("#login-identifier").fill("bes");
    await pagePhone.locator("#login-password").fill(demoUserPassword);
    await Promise.all([
      pagePhone.waitForResponse((res) => res.url().includes("/api/auth/login")),
      pagePhone.getByRole("button", { name: "Masuk" }).click(),
    ]);
    await pagePhone.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const phoneCookies = await contextPhone.cookies();
    const phoneSession = phoneCookies.find((c) => c.name === "siaga_session");
    expect(phoneSession).toBeDefined();

    // === STEP 3: Login on Device C (Tablet) with SAME account ===
    await pageTablet.goto("/login");
    await pageTablet.locator("#login-identifier").fill("bes");
    await pageTablet.locator("#login-password").fill(demoUserPassword);
    await Promise.all([
      pageTablet.waitForResponse((res) => res.url().includes("/api/auth/login")),
      pageTablet.getByRole("button", { name: "Masuk" }).click(),
    ]);
    await pageTablet.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 15_000 });

    const tabletCookies = await contextTablet.cookies();
    const tabletSession = tabletCookies.find((c) => c.name === "siaga_session");
    expect(tabletSession).toBeDefined();

    // === STEP 4: Verify ALL 3 devices remain authenticated simultaneously ===
    const meLaptop = await pageLaptop.request.get("/api/auth/me");
    expect(meLaptop.status()).toBe(200);
    const jsonLaptop = await meLaptop.json();
    expect(jsonLaptop.businessRole).toBe("bes");

    const mePhone = await pagePhone.request.get("/api/auth/me");
    expect(mePhone.status()).toBe(200);
    const jsonPhone = await mePhone.json();
    expect(jsonPhone.businessRole).toBe("bes");

    const meTablet = await pageTablet.request.get("/api/auth/me");
    expect(meTablet.status()).toBe(200);
    const jsonTablet = await meTablet.json();
    expect(jsonTablet.businessRole).toBe("bes");

    // === STEP 5: Logout Device A (Laptop) only ===
    const logoutRes = await pageLaptop.request.post("/api/auth/logout");
    expect(logoutRes.status()).toBe(200);

    // Refresh Laptop page -> should be redirected or unauthorized on /api/auth/me
    const meLaptopAfterLogout = await pageLaptop.request.get("/api/auth/me");
    expect(meLaptopAfterLogout.status()).toBe(401);

    // === STEP 6: Verify Phone and Tablet REMAIN fully authenticated ===
    const mePhoneAfter = await pagePhone.request.get("/api/auth/me");
    expect(mePhoneAfter.status()).toBe(200);
    const jsonPhoneAfter = await mePhoneAfter.json();
    expect(jsonPhoneAfter.businessRole).toBe("bes");

    const meTabletAfter = await pageTablet.request.get("/api/auth/me");
    expect(meTabletAfter.status()).toBe(200);
    const jsonTabletAfter = await meTabletAfter.json();
    expect(jsonTabletAfter.businessRole).toBe("bes");

    // Clean up
    await contextLaptop.close();
    await contextPhone.close();
    await contextTablet.close();
  });
});
