import { test, expect, chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/');

  await page.waitForTimeout(1000);

  try {
      await page.click('text="Config"');
  } catch (e) {
      console.log('could not find Config button');
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/config_snap2.png' });

  await browser.close();
})();
