import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const SLUG = '2026-05-28-navegador-pastas-notas-v2'
const artifactDir = path.resolve(__dirname, `../../../specs/artifacts/${SLUG}`)

async function shot(page: Page, projectName: string, name: string) {
  await fs.mkdir(artifactDir, { recursive: true })
  await page.screenshot({ path: path.join(artifactDir, `${projectName}-${name}.png`), fullPage: false })
}

async function signUp(page: Page, projectName: string) {
  const unique = `${projectName}-${Date.now()}-${Math.round(Math.random() * 1000)}`
  await page.goto('/sign-up')
  await page.getByLabel('Nome').fill('Playwright Browser')
  await page.getByLabel('Email').fill(`notas-${unique}@example.invalid`)
  await page.getByLabel('Senha').fill('Password123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 45_000 })
}

async function createFolder(page: Page, name: string, parentId?: string): Promise<string> {
  const res = await page.request.post('/api/folders', { data: parentId ? { name, parentId } : { name } })
  expect(res.ok(), `create folder ${name}`).toBeTruthy()
  const body = (await res.json()) as { folder: { id: string } }
  return body.folder.id
}

async function createNote(page: Page, folderId: string, contentMd: string, tags: string[] = []) {
  const res = await page.request.post('/api/items', { data: { complexity: 'note', contentMd, folderId, tags } })
  expect(res.ok(), 'create note').toBeTruthy()
}

async function createTask(page: Page, folderId: string, title: string, tags: string[] = []) {
  const res = await page.request.post('/api/items', { data: { complexity: 'task', title, folderId, tags } })
  expect(res.ok(), 'create task').toBeTruthy()
}

test('folder browser kanban/list renders', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name
  const desktop = !projectName.includes('mobile')
  await signUp(page, projectName)

  const conteudo = await createFolder(page, 'Conteúdo')
  const roteiros = await createFolder(page, 'Roteiros', conteudo)
  const reels = await createFolder(page, 'Reels', roteiros)
  await createFolder(page, 'Carrosséis', roteiros)
  await createFolder(page, 'Estudos')

  await createNote(
    page,
    roteiros,
    'Ideias soltas para vídeo de cores\n\nCapturas longas que ainda precisam virar roteiro. Esta nota tem vários parágrafos, referências, links e observações que normalmente quebrariam a coluna do kanban se renderizadas por inteiro. O objetivo é mostrar apenas um trecho com clamp visual e um botão para abrir a nota completa quando o usuário clicar.',
    ['cores'],
  )
  await createNote(page, roteiros, 'Azul-marinho com vermelho\n\nTestar frase curta para vídeo.', ['cor'])
  await createTask(page, roteiros, 'Gravar roteiro de tons neutros', ['gravação'])
  await createNote(page, reels, 'Reel rápido sobre acessórios\n\nGancho + 3 exemplos.', ['reels'])

  await page.goto(`/notas?folder=${roteiros}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Roteiros' })).toBeVisible({ timeout: 30_000 })

  if (desktop) {
    // List view (default)
    await page.getByRole('button', { name: 'Lista' }).click()
    await page.waitForTimeout(400)
    await shot(page, projectName, '01-list-view')

    // Kanban view with large-note truncation
    await page.getByRole('button', { name: 'Kanban' }).click()
    const check = await page.request.get(`/api/folders/${roteiros}`)
    const folderJson = (await check.json()) as { folder?: { viewMode?: string } }
    console.log('ROTEIROS viewMode after toggle =', folderJson.folder?.viewMode)
    await expect(page.getByText('Sem pasta', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('abrir nota →').first()).toBeVisible({ timeout: 15_000 })
    await shot(page, projectName, '02-kanban-large-note-truncated')

    // Real sort menu
    await page.getByRole('button', { name: /Ordenar:/ }).click()
    await expect(page.getByRole('menuitemradio', { name: /Atualização/ })).toBeVisible()
    await shot(page, projectName, '03-sort-menu')
    await page.getByRole('menuitemradio', { name: /Alfabética/ }).click()
    await page.waitForTimeout(300)
    await shot(page, projectName, '04-sorted-alpha')
  } else {
    await page.waitForTimeout(500)
    await shot(page, projectName, '01-mobile-content')
  }
})
