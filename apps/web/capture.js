const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Set bypass cookie
  await context.addCookies([{
    name: 'bypass-auth',
    value: '1',
    domain: 'localhost',
    path: '/'
  }]);

  const page = await context.newPage();
  const artifactsDir = path.resolve(__dirname, '../../specs/artifacts/2026-05-28-nova-ui-modais-quickadd-menu');
  
  console.log('Navigating to app with auth bypass...');
  await page.goto('http://localhost:3033/inbox');
  
  // Wait for app to load
  await page.waitForTimeout(4000);
  
  // Initial state screen
  await page.screenshot({ path: path.join(artifactsDir, '01-inbox.png') });
  
  // Trigger Quick Capture (assuming 'c' key triggers it)
  await page.keyboard.press('c');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactsDir, '02-quickadd-compact.png') });

  // Try to type something
  await page.keyboard.type('Test task tomorrow 8am');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactsDir, '03-quickadd-with-date.png') });
  
  // Click expand
  // We can press tab multiple times or just evaluate a click on the expand button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const expandBtn = buttons.find(b => b.getAttribute('aria-label') === 'Expandir');
    if (expandBtn) expandBtn.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactsDir, '04-quickadd-expanded.png') });

  // Close the browser
  await browser.close();
  console.log('Screenshots saved successfully!');
})();
