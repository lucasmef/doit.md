import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const artifactDir = path.resolve(
  __dirname,
  `../../../specs/artifacts/2026-05-30-ui-fixes-batch`,
)
const globalDir = 'G:\\Meu Drive\\.agentes'

async function artifactPath(name: string) {
  await fs.mkdir(artifactDir, { recursive: true }).catch(() => {})
  return path.join(artifactDir, `doitmd-${name}.png`)
}

async function globalPath(name: string) {
  await fs.mkdir(globalDir, { recursive: true }).catch(() => {})
  return path.join(globalDir, `doitmd-${name}.png`)
}

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  const local = await artifactPath(name)
  await page.screenshot({ path: local, fullPage: true })
  try {
    const global = await globalPath(name)
    await fs.copyFile(local, global)
  } catch (err) {
    // ignore missing global drive
  }
}

test('capture fixes', async ({ page }) => {
  // Go to sign up
  await page.goto('/sign-up')
  
  // Try to sign up or log in
  try {
    const unique = `test-${Date.now()}`
    await page.getByLabel('Nome').fill('Playwright Visual')
    await page.getByLabel('Email').fill(`playwright-${unique}@example.invalid`)
    await page.getByLabel('Senha').fill('Password123!')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await page.waitForURL(/\/today$/, { timeout: 10000 })
  } catch (e) {
    console.log('Already logged in or signup failed, proceeding...')
  }

  await page.goto('/today')
  await page.waitForTimeout(2000)
  await saveScreenshot(page, 'today-layout-2026-05-30')

  await page.goto('/notas')
  await page.waitForTimeout(2000)
  await saveScreenshot(page, 'notas-layout-2026-05-30')
})
