import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Log in
    await page.goto('http://127.0.0.1:3000/sign-up');
    const unique = `qa-${Date.now()}`;
    await page.fill('input[name="name"]', 'QA Notes');
    await page.fill('input[name="email"]', `${unique}@example.invalid`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // wait for /today
    await page.waitForURL('**/today**');
    
    // 2. Go to /notas
    await page.goto('http://127.0.0.1:3000/notas');
    await page.waitForTimeout(1000);

    // 3. Create a note or click first
    const createBtn = await page.$('a[href="/notas/nova"]');
    if (createBtn) {
      await createBtn.click();
      await page.waitForTimeout(2000);
      
      // We are at /notas/[id], wait for editor to mount
      await page.waitForSelector('textarea[placeholder="Sem titulo"]', { timeout: 10000 });
      await page.fill('textarea[placeholder="Sem titulo"]', 'Teste de layout do painel direito');
      await page.waitForTimeout(1000);
      
      // take screenshot
      await page.screenshot({ path: 'specs/artifacts/current-editor-layout.png', fullPage: true });
      console.log('Screenshot saved to specs/artifacts/current-editor-layout.png');
    } else {
      console.log('Create button not found in /notas');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
