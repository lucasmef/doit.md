import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const slug = process.env['PLAYWRIGHT_ARTIFACT_SLUG'] ?? '2026-05-30-lote-ui-009-022-025-051-052-054'
const artifactDir = path.resolve(__dirname, `../../../specs/artifacts/${slug}`)

async function shot(page: import('@playwright/test').Page, projectName: string, name: string) {
  await fs.mkdir(artifactDir, { recursive: true })
  await page.screenshot({ path: path.join(artifactDir, `${projectName}-${name}.png`) })
}

async function signUp(page: import('@playwright/test').Page, projectName: string) {
  const unique = `${projectName}-${Date.now()}-${Math.round(Math.random() * 1000)}`
  await page.goto('/sign-up')
  await page.getByLabel('Nome').fill('Playwright Lote')
  await page.getByLabel('Email').fill(`pw-${unique}@example.invalid`)
  await page.getByLabel('Senha').fill('Password123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 45_000 })
}

async function createNote(
  page: import('@playwright/test').Page,
  title: string,
  contentMd: string,
) {
  const res = await page.request.post('/api/items', {
    data: { title, complexity: 'note', contentMd },
  })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { item?: { id: string }; id?: string }
  return body.item?.id ?? body.id ?? ''
}

test('lote UI: snippet, expansao, calendario, modais', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name
  const isMobile = projectName.includes('mobile')

  await signUp(page, projectName)

  // Seed: nota com termo so no conteudo (ID 051) e nota com titulos (ID 052)
  await createNote(
    page,
    'Reuniao de equipe',
    'Pauta da semana.\n\nDiscutir o orcamentotrimestral com o time financeiro antes da virada.',
  )
  const headingNoteId = await createNote(
    page,
    'Estrutura do projeto',
    '# Secao Alpha\n\nConteudo da secao alpha aqui.\n\n# Secao Beta\n\nConteudo da secao beta aqui.',
  )

  // Seed: tarefa com data de hoje (para aparecer em /today e abrir o menu de contexto)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  await page.request.post('/api/items', {
    data: { title: 'Tarefa de foco hoje', complexity: 'task', dueDate: todayKey },
  })

  // ===== ID 051: busca mostra trecho do conteudo com destaque =====
  if (isMobile) {
    await page.goto('/today')
    await page.getByLabel('Buscar').click()
    const input = page.getByPlaceholder('Buscar ou ir para...')
    await input.fill('orcamentotrimestral')
    await expect(page.locator('mark', { hasText: 'orcamentotrimestral' }).first()).toBeVisible({
      timeout: 15_000,
    })
    await shot(page, projectName, '01-busca-snippet')
  } else {
    await page.goto('/today')
    const input = page.getByPlaceholder('Buscar itens, notas...')
    await input.fill('orcamentotrimestral')
    await expect(page.locator('mark', { hasText: 'orcamentotrimestral' }).first()).toBeVisible({
      timeout: 15_000,
    })
    await shot(page, projectName, '01-busca-snippet')
  }

  // ===== ID 052: estado de expansao/retracao persiste =====
  await page.goto(`/notas/${headingNoteId}`, { waitUntil: 'domcontentloaded' })
  const firstToggle = page.locator('.doit-heading-collapse-toggle').first()
  await expect(firstToggle).toBeVisible({ timeout: 20_000 })
  await firstToggle.click()
  await expect(page.locator('.doit-heading-collapse-toggle.is-collapsed').first()).toBeVisible()
  await shot(page, projectName, '02-nota-recolhida')
  // recarrega e confirma persistencia
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.doit-heading-collapse-toggle.is-collapsed').first()).toBeVisible({
    timeout: 20_000,
  })
  await shot(page, projectName, '03-nota-recolhida-apos-reload')

  // ===== ID 022: calendario (fullscreen no desktop) renderiza =====
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await shot(page, projectName, '04-calendario')

  // ===== ID 054: modal de atalhos (utilitario) =====
  if (!isMobile) {
    await page.goto('/today')
    await page.keyboard.press('Shift+?')
    await expect(page.getByRole('dialog', { name: 'Atalhos' })).toBeVisible()
    await shot(page, projectName, '05-modal-atalhos')
    await page.keyboard.press('Escape')

    // ID 054: modal de captura de tarefa (ja alinhado ao padrao)
    await page.keyboard.press('q')
    await expect(page.getByPlaceholder(/Revisar layout/)).toBeVisible({ timeout: 15_000 })
    await shot(page, projectName, '06-modal-quick-capture')
    await page.keyboard.press('Escape')
  }

  // ===== ID 009: menu de contexto do item mostra o item (desktop right-click) =====
  if (!isMobile) {
    await page.goto('/today', { waitUntil: 'domcontentloaded' })
    const taskRow = page.getByText('Tarefa de foco hoje').first()
    await expect(taskRow).toBeVisible({ timeout: 15_000 })
    await taskRow.click({ button: 'right' })
    await page.waitForTimeout(300)
    await shot(page, projectName, '07-menu-item')
  }
})
