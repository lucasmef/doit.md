import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const artifactDir = path.resolve(
  __dirname,
  `../../../specs/artifacts/${process.env['PLAYWRIGHT_ARTIFACT_SLUG'] ?? '2026-05-23-captura-unificada-mobile'}`,
)

async function artifactPath(projectName: string, name: string) {
  await fs.mkdir(artifactDir, { recursive: true })
  return path.join(artifactDir, `${projectName}-${name}.png`)
}

async function signUp(page: import('@playwright/test').Page, projectName: string) {
  const unique = `${projectName}-${Date.now()}-${Math.round(Math.random() * 1000)}`
  await page.goto('/sign-up')
  await page.getByLabel('Nome').fill('Playwright Visual')
  await page.getByLabel('Email').fill(`playwright-${unique}@example.invalid`)
  await page.getByLabel('Senha').fill('Password123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 45_000 })
}

test('quick capture and calendar event surfaces render', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name

  await signUp(page, projectName)

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Abrir configuracoes do calendario')).toBeVisible()
  await expect(page.getByLabel('Voltar para o mes atual')).toBeVisible()
  await page.screenshot({
    path: await artifactPath(projectName, '01-calendar'),
  })

  await page.keyboard.press('e')
  const isMobile = testInfo.project.name.includes('mobile')

  const titleInput = isMobile
    ? page.getByPlaceholder('Evento hoje as 14h').first()
    : page.getByLabel('Titulo')
  await expect(titleInput).toBeVisible()
  if (isMobile) {
    await expect(page.getByRole('button', { name: 'Criar' })).toBeDisabled()
  }
  await page.screenshot({
    path: await artifactPath(projectName, '02-event-modal'),
  })
  await titleInput.click()
  await titleInput.pressSequentially('Reuniao hoje as 14h')
  await expect(titleInput).toHaveValue('Reuniao hoje as 14h')
  if (isMobile) {
    await page.getByRole('button', { name: 'Expandir' }).click()
    await expect(page.getByLabel('Titulo')).toBeVisible()
  }
  await expect(page.locator('input[type="time"]').first()).toHaveValue('14:00')
  await expect(page.locator('input[type="time"]').nth(1)).toHaveValue('14:30')

  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByLabel('Titulo')).toBeHidden()

  await page.keyboard.press('q')
  const taskInput = isMobile
    ? page.getByPlaceholder('Nome da tarefa').first()
    : page.getByRole('textbox', { name: 'Nome da tarefa' })
  await expect(taskInput).toBeVisible()
  if (isMobile) {
    await expect(page.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
  }
  await expect(page.getByLabel('Capturar evento')).toBeVisible()
  await page.screenshot({
    path: await artifactPath(projectName, '03-quick-capture'),
  })
})
