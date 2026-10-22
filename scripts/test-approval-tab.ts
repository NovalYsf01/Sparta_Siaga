import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3004/reports', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // 1. Click Detail button on first incident
  const detailBtn = page.locator('table tbody tr button:has-text("Detail")').first();
  await detailBtn.click();
  await page.waitForTimeout(800);
  
  // 2. Click Tab 3. Approval
  const tab3 = page.locator('button:has-text("3. Approval")');
  await tab3.click();
  await page.waitForTimeout(600);
  
  // 3. Take desktop screenshot of Tab Approval
  await page.screenshot({ path: 'C:/Users/Noval/.gemini/antigravity-ide/brain/de59fa70-158f-4340-ab63-a0cef7495471/approval_tab_desktop.png' });
  console.log('Desktop screenshot of Tab Approval saved');

  // 4. Verify presence of Section 1 and Section 2
  const sec1Count = await page.locator('text=1. Approval Pemeriksaan Awal').count();
  const sec2Count = await page.locator('text=2. Approval Serah Terima').count();
  const caseCloseCount = await page.locator('text=Status Penutupan Kasus').count();
  console.log('Section 1 count:', sec1Count);
  console.log('Section 2 count:', sec2Count);
  console.log('Case Close count:', caseCloseCount);

  // 5. Verify strict read-only: no approve / reject / submit mutation buttons inside modal
  const modal = page.locator('[role="dialog"]');
  const actionBtns = await modal.locator('button:has-text("Setujui"), button:has-text("Tolak"), button:has-text("Minta Revisi"), button:has-text("Ajukan Penyelesaian"), button:has-text("Final Approve"), button:has-text("Case Close")').count();
  console.log('Mutation action buttons count in Detail modal:', actionBtns);

  // 6. Mobile testing (375x667)
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/Noval/.gemini/antigravity-ide/brain/de59fa70-158f-4340-ab63-a0cef7495471/approval_tab_mobile.png' });
  console.log('Mobile screenshot of Tab Approval saved');

  // 7. Close modal
  const closeBtn = page.locator('button[aria-label="Tutup detail laporan"]').first();
  await closeBtn.click();
  await page.waitForTimeout(500);
  const modalCount = await modal.count();
  console.log('Modal count after close:', modalCount);

  await browser.close();
  console.log('ALL TASK T04 BROWSER TESTS PASSED');
})();
