import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });

  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  // click load mock json to verify it works
  await page.evaluate(() => {
     window.prompt = () => "1"; // Auto-select BM 1
  });
  await page.click('text="Load Mock JSON (from BM)"');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/app/datatable_snap_final.png', fullPage: true });

  await browser.close();
})();
