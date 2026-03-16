import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });

  await page.goto('http://localhost:5175/');
  await page.waitForTimeout(1000);

  // Automatically handle prompts/alerts
  page.on('dialog', async dialog => {
      console.log(dialog.message());
      await dialog.accept("15");
  });

  await page.click('text="Load Mock JSON (from BM)"');
  await page.waitForTimeout(1000);

  await page.click('text="Check data table syntax"');
  await page.waitForTimeout(1000);

  await page.click('text="Syntax Fix"');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/app/ui_snap_syntax_fix.png', fullPage: true });

  await browser.close();
})();
