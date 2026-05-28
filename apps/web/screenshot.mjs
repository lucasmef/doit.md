import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'specs/artifacts/2026-05-28-ajustar-bento-calendar';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    {
      name: 'bypass-auth',
      value: 'true',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false
    }
  ]);
  const page = await context.newPage();
  
  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 5000));

  console.log('Navigating to calendar...');
  await page.goto('http://localhost:3002/calendar', { waitUntil: 'networkidle' });
  
  // Wait for render
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Taking normal calendar screenshot...');
  await page.screenshot({ path: path.join(outDir, '01-bento-calendar.png') });
  
  // Click maximize
  console.log('Clicking maximize...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Maximizar calendário"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Taking fullscreen calendar screenshot...');
  await page.screenshot({ path: path.join(outDir, '02-fullscreen-calendar.png') });

  // Close maximize
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Minimizar calendário"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Click a day
  console.log('Clicking day...');
  await page.evaluate(() => {
    const cells = document.querySelectorAll('.grid > div');
    // find a day cell
    for (const cell of cells) {
      if (cell.textContent && cell.textContent.length < 5) {
        cell.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '03-day-selected.png') });

  await browser.close();
  console.log('Done!');
})();
