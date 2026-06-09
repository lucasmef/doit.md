import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3415'
const OUT = 'specs/artifacts/2026-06-09-corrigir-115-128-136-editor-notas'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const results = []

function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
}

function noteFileName(item) {
  return `${(item.title || 'nota').toLowerCase().replace(/\s+/g, '-')}.md`
}

function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true })
  try {
    fs.mkdirSync(GLOBAL_DIR, { recursive: true })
  } catch (error) {
    console.log(`Global folder unavailable: ${error.message}`)
  }
}

async function shot(page, name) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: false })
  try {
    fs.copyFileSync(file, path.join(GLOBAL_DIR, name))
  } catch (error) {
    console.log(`Global copy unavailable: ${error.message}`)
  }
}

async function signUp(page) {
  const unique = `qa-115-136-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA Notes Batch')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 30_000 })
  return unique
}

async function post(page, url, body) {
  const response = await page.request.post(`${BASE}${url}`, { data: body, timeout: 90_000 })
  if (!response.ok()) throw new Error(`${url}: ${response.status()} ${await response.text()}`)
  return response.json()
}

async function getItem(page, itemId) {
  const response = await page.request.get(`${BASE}/api/items/${itemId}`, { timeout: 90_000 })
  if (!response.ok()) throw new Error(`/api/items/${itemId}: ${response.status()}`)
  return (await response.json()).item
}

async function waitForItem(page, itemId, predicate, timeout = 7000) {
  const started = Date.now()
  let item
  while (Date.now() - started < timeout) {
    item = await getItem(page, itemId)
    if (predicate(item)) return item
    await page.waitForTimeout(200)
  }
  return item
}

ensureDirs()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const folderA = (await post(page, '/api/folders', { name: `Pasta A ${unique}` })).folder
  const folderB = (await post(page, '/api/folders', { name: `Pasta B ${unique}` })).folder
  const partial = (
    await post(page, '/api/items', {
      title: `Nota parcial ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folderA.id,
      tags: ['qa'],
      contentMd: [
        '# [ ] H1 aberto',
        '',
        '- [x] tarefa feita',
        '',
        '## [x] H2 feito',
        '',
        '- [ ] tarefa comum aberta',
        '',
        '### Heading simples',
      ].join('\n'),
    })
  ).item
  const complete = (
    await post(page, '/api/items', {
      title: `Nota completa ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folderA.id,
      contentMd: '# [x] H1 feito\n\n- [x] tarefa feita',
    })
  ).item
  const foreign = (
    await post(page, '/api/items', {
      title: `Nota estrangeira ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folderB.id,
      contentMd: '- [ ] fora da pasta',
    })
  ).item

  await page.goto(`${BASE}/notas?folder=${folderA.id}`)
  await page.waitForLoadState('networkidle')
  await page.getByText(partial.title, { exact: true }).waitFor({ timeout: 30_000 })
  await page.getByText(complete.title, { exact: true }).waitFor({ timeout: 30_000 })
  const folderText = await page.locator('body').innerText()
  check(
    'ID 131 - lista mostra progresso parcial',
    folderText.includes('50% concluido'),
    folderText.replace(/\s+/g, ' ').slice(0, 320),
  )
  check(
    'ID 131 - nota 100% tem visual concluido',
    folderText.includes('Nota concluida'),
    folderText.replace(/\s+/g, ' ').slice(0, 320),
  )
  check(
    'ID 131 - nota concluida nao altera status de tarefa',
    (await getItem(page, complete.id)).status === 'todo',
  )
  await shot(page, 'doitmd-notas-progresso-lista-2026-06-09.png')

  await page.getByText(partial.title, { exact: true }).click()
  await page.waitForURL(`**/notas/${partial.id}**`)
  await page.waitForLoadState('networkidle')

  const leftRail = page.locator('aside').first()
  const filesText = await leftRail.innerText()
  check(
    'ID 132 - Files mostra somente a pasta atual',
    filesText.includes(noteFileName(partial)) &&
      filesText.includes(noteFileName(complete)) &&
      !filesText.includes(noteFileName(foreign)),
    filesText.replace(/\s+/g, ' ').slice(0, 240),
  )

  const progressRail = page.locator('aside').last()
  check(
    'ID 128 - progresso do editor conta checklist comum e heading',
    (await progressRail.innerText()).includes('2 / 4 feito') &&
      (await progressRail.getByText('50%', { exact: true }).count()) === 1,
  )
  check(
    'ID 129 - outline remove marcadores e usa checkbox visual',
    (await page.locator('.doit-outline-heading-checkbox').count()) === 2 &&
      !(await progressRail.locator('nav').innerText()).includes('[ ]'),
  )
  check(
    'ID 130 - heading concluido usa checkbox azul e texto riscado',
    await page
      .locator('.doit-heading-checkbox.is-checked')
      .first()
      .evaluate((node) => {
        const box = getComputedStyle(node)
        const label = getComputedStyle(
          document.querySelector('.doit-heading-checkbox-label.is-checked'),
        )
        return (
          box.backgroundColor === 'rgb(47, 107, 255)' &&
          label.textDecorationLine.includes('line-through')
        )
      }),
  )

  const railLabels = await progressRail.locator('h4').allTextContents()
  check(
    'ID 134 - Tags fica abaixo das propriedades e secoes principais',
    railLabels.indexOf('tags') > railLabels.indexOf('outline') &&
      railLabels.indexOf('tags') > railLabels.indexOf('progresso'),
    JSON.stringify(railLabels),
  )
  const tagsInput = progressRail.locator('input[placeholder="docs, baixo-risco"]')
  await tagsInput.fill('qa, revisado')
  await tagsInput.press('Enter')
  const tagged = await waitForItem(page, partial.id, (item) => item.tags.includes('revisado'))
  check('ID 134 - edicao de Tags continua funcional', tagged.tags.includes('revisado'))

  const checklistButton = page.locator(
    '#note-editor-toolbar button[aria-label="Lista de tarefas"]:visible',
  )
  check(
    'ID 136 - toolbar usa icone SVG claro e acessivel',
    (await checklistButton.count()) === 1 &&
      (await checklistButton.locator('svg rect').count()) === 3 &&
      !(await checklistButton.innerText()).includes('[ ]'),
  )

  const firstHeadingCheckbox = page.locator('.doit-heading-checkbox').first()
  await firstHeadingCheckbox.click()
  await page.waitForTimeout(200)
  check(
    'ID 128 - progresso atualiza sem reload ao marcar heading',
    (await progressRail.innerText()).includes('3 / 4 feito'),
  )

  await page.locator('.ProseMirror ul[data-type="taskList"] input[type="checkbox"]').first().click()
  await page.waitForTimeout(200)
  check(
    'ID 128 - progresso atualiza sem reload ao desmarcar checklist comum',
    (await progressRail.innerText()).includes('2 / 4 feito'),
  )

  const editor = page.locator('.ProseMirror')
  const escapeMarker = `escape-save-${Date.now()}`
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.insertText(`\n${escapeMarker}`)
  await page.keyboard.press('Escape')
  await page.waitForURL(`**/notas?folder=${folderA.id}`)
  const escapedItem = await waitForItem(page, partial.id, (item) =>
    item.contentMd.includes(escapeMarker),
  )
  check(
    'ID 135 - Esc volta para a pasta de origem',
    new URL(page.url()).searchParams.get('folder') === folderA.id,
    page.url(),
  )
  check('ID 135 - Esc nao perde autosave pendente', escapedItem.contentMd.includes(escapeMarker))

  await page.goto(
    `${BASE}/notas/${foreign.id}?from=${encodeURIComponent(`/notas?folder=${folderB.id}`)}`,
  )
  await page.waitForLoadState('networkidle')
  await page.goto(
    `${BASE}/notas/${partial.id}?from=${encodeURIComponent(`/notas?folder=${folderA.id}`)}`,
  )
  await page.waitForLoadState('networkidle')
  const recentLabels = await page.evaluate(() => {
    const rail = document.querySelector('aside')
    const heading = Array.from(rail?.querySelectorAll('div') ?? []).find(
      (node) => node.textContent?.trim() === 'ultimos itens',
    )
    return Array.from(heading?.nextElementSibling?.querySelectorAll('a span:last-child') ?? []).map(
      (node) => node.textContent?.trim() ?? '',
    )
  })
  check(
    'ID 133 - Ultimos itens contem apenas notas em ordem recente',
    recentLabels[0] === noteFileName(partial) && recentLabels[1] === noteFileName(foreign),
    JSON.stringify(recentLabels),
  )

  await page.locator('#note-editor-toolbar button[title="Modo foco"]').click()
  const beforeScale = Number(
    await page
      .locator('.note-editor-page')
      .evaluate((node) => getComputedStyle(node).getPropertyValue('--note-focus-ui-scale') || '1'),
  )
  await page.evaluate(() => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 2.5 })
    window.dispatchEvent(new Event('resize'))
  })
  await page.waitForTimeout(350)
  const afterScale = Number(
    await page
      .locator('.note-editor-page')
      .evaluate((node) => getComputedStyle(node).getPropertyValue('--note-focus-ui-scale') || '1'),
  )
  check(
    'ID 115 - modo foco compensa zoom alto nos controles',
    beforeScale === 1 && afterScale === 0.4,
    `${beforeScale} -> ${afterScale}`,
  )
  await shot(page, 'doitmd-editor-foco-sidebar-toolbar-2026-06-09.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.waitForLoadState('networkidle')
  const mobileState = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    checklistButtons: Array.from(
      document.querySelectorAll('#note-editor-toolbar button[aria-label="Lista de tarefas"] svg'),
    ).filter((node) => node.getBoundingClientRect().width > 0).length,
    headingChecks: document.querySelectorAll('.doit-heading-checkbox').length,
  }))
  check(
    'IDs 128-136 - mobile sem overflow e com checklist funcional',
    !mobileState.overflow && mobileState.checklistButtons === 1 && mobileState.headingChecks === 2,
    JSON.stringify(mobileState),
  )
  await shot(page, 'doitmd-editor-checklist-mobile-2026-06-09.png')

  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.ok)
  if (failed.length) throw new Error(`Failed: ${failed.map((result) => result.name).join('; ')}`)
} finally {
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 5000))])
}
