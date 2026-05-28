import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const artifactsDir = path.resolve(__dirname, '../../specs/artifacts/2026-05-28-validacao-manual-ui');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

test.describe('Usability Validation Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('main flows desktop', async ({ page }) => {
    const unique = `qa-${Date.now()}`;
    
    // 1. Sign up
    await page.goto('/sign-up');
    await page.fill('input[name="name"]', 'QA Tester');
    await page.fill('input[name="email"]', `${unique}@example.invalid`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/today**');
    await page.screenshot({ path: path.join(artifactsDir, '01-desktop-today.png') });

    // Try creating a task
    const addTaskBtn = await page.getByRole('button', { name: 'add task' }).first();
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artifactsDir, '02-desktop-quick-capture.png') });
    }

    // Go to Dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, '03-desktop-dashboard.png') });

    // Go to Upcoming
    await page.goto('/upcoming');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, '04-desktop-upcoming.png') });

    // Go to Notas
    await page.goto('/notas');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, '05-desktop-notas.png') });

    // Create a note to test immersive editor
    const createNoteBtn = await page.$('a[href="/notas/nova"]');
    if (createNoteBtn) {
      await createNoteBtn.click();
      await page.waitForSelector('textarea[placeholder="Sem titulo"]', { timeout: 10000 });
      await page.fill('textarea[placeholder="Sem titulo"]', 'Usability Test Note');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(artifactsDir, '06-desktop-editor.png') });
    }
  });
});

test.describe('Usability Validation Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('main flows mobile', async ({ page }) => {
    const unique = `qa-mob-${Date.now()}`;
    
    // 1. Sign up
    await page.goto('/sign-up');
    await page.fill('input[name="name"]', 'QA Tester Mobile');
    await page.fill('input[name="email"]', `${unique}@example.invalid`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/today**');
    await page.screenshot({ path: path.join(artifactsDir, '07-mobile-today.png') });

    // Go to Dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, '08-mobile-dashboard.png') });

    // Go to Notas
    await page.goto('/notas');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, '09-mobile-notas.png') });
  });
});
