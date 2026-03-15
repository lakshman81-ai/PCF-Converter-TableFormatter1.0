import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 }
  });

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  try {
      await page.click('text="Config"');
  } catch (e) {
      console.log('could not find Config button');
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/app/config_snap_final.png', fullPage: true });

  await browser.close();
})();
