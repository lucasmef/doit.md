import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3410'
const OUT = 'specs/artifacts/2026-06-07-corrigir-124-127-outline-checklist-headings'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const results = []

function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
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
  const unique = `qa-124-127-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 124 127')
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

async function waitForItem(page, itemId, predicate, timeout = 5000) {
  const started = Date.now()
  let item
  while (Date.now() - started < timeout) {
    item = await getItem(page, itemId)
    if (predicate(item)) return item
    await page.waitForTimeout(250)
  }
  return item
}

ensureDirs()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const originalMarkdown = [
    '# [ ] Vídeo 01.md',
    '',
    'Conteudo do primeiro titulo.',
    '',
    '## [x] Seção com acento & números 123',
    '',
    'Conteudo da segunda secao.',
    '',
    '### [ ] Repetido!',
    '',
    'Conteudo A.',
    '',
    '### [ ] Repetido!',
    '',
    'Conteudo B.',
    '',
    '# Sem checklist ###',
  ].join('\n')
  const note = (
    await post(page, '/api/items', {
      title: `Outline headings ${unique}`,
      complexity: 'note',
      status: 'todo',
      contentMd: originalMarkdown,
    })
  ).item

  await page.goto(`${BASE}/notas/${note.id}`)
  await page.waitForLoadState('networkidle')

  const outline = page.locator('aside').last().locator('nav')
  const outlineText = (await outline.innerText()).replace(/\s+/g, ' ').trim()
  check(
    'ID 124 - outline exibe texto limpo',
    outlineText.includes('Vídeo 01') &&
      outlineText.includes('Seção com acento & números 123') &&
      !outlineText.includes('#') &&
      !outlineText.includes('.md') &&
      !outlineText.includes('[ ]') &&
      !outlineText.includes('[x]'),
    outlineText,
  )
  const paddings = await outline
    .locator(':scope > div')
    .evaluateAll((nodes) => nodes.slice(0, 3).map((node) => getComputedStyle(node).paddingLeft))
  check(
    'ID 124 - hierarquia H1 H2 H3 preservada',
    JSON.stringify(paddings) === JSON.stringify(['8px', '20px', '32px']),
    JSON.stringify(paddings),
  )

  const editorChecks = page.locator('.doit-heading-checkbox')
  const outlineChecks = page.locator('.doit-outline-heading-checkbox')
  check(
    'IDs 125/127 - checkboxes aparecem em H1 H2 H3 e no outline',
    (await editorChecks.count()) === 4 && (await outlineChecks.count()) === 4,
    `editor=${await editorChecks.count()} outline=${await outlineChecks.count()}`,
  )
  check(
    'ID 127 - estado inicial do outline reflete a nota',
    (await outlineChecks.nth(0).getAttribute('aria-checked')) === 'false' &&
      (await outlineChecks.nth(1).getAttribute('aria-checked')) === 'true',
  )

  await outline.getByText('Seção com acento & números 123', { exact: true }).click()
  await page.waitForTimeout(500)
  check(
    'ID 126 - ancora com acento, numero e especial aponta ao heading',
    page.url().endsWith('#secao-com-acento-numeros-123') &&
      (await page.locator('#secao-com-acento-numeros-123').count()) === 1,
    page.url(),
  )
  const duplicateIds = await page
    .locator('.doit-note-sheet-prose h3')
    .evaluateAll((nodes) => nodes.map((node) => node.id))
  check(
    'ID 126 - headings duplicados recebem ancoras unicas',
    JSON.stringify(duplicateIds) === JSON.stringify(['repetido', 'repetido-2']),
    JSON.stringify(duplicateIds),
  )

  await outlineChecks.nth(0).click()
  await page.waitForTimeout(200)
  check(
    'ID 127 - toggle no outline atualiza editor',
    (await editorChecks.nth(0).getAttribute('aria-checked')) === 'true',
  )
  let persisted = await waitForItem(page, note.id, (item) =>
    item.contentMd.startsWith('# [x] Vídeo 01.md'),
  )
  check(
    'IDs 125/127 - toggle no outline persiste no Markdown',
    persisted.contentMd.startsWith('# [x] Vídeo 01.md'),
    persisted.contentMd.split('\n')[0],
  )

  await editorChecks.nth(1).click()
  await page.waitForTimeout(200)
  check(
    'ID 127 - toggle no editor atualiza outline',
    (await outlineChecks.nth(1).getAttribute('aria-checked')) === 'false',
  )
  persisted = await waitForItem(page, note.id, (item) =>
    item.contentMd.includes('## [ ] Seção com acento & números 123'),
  )
  check(
    'ID 125 - toggle no editor persiste no Markdown',
    persisted.contentMd.includes('## [ ] Seção com acento & números 123'),
  )

  const plainHeading = page.locator('#sem-checklist')
  await plainHeading.click()
  const checklistToolbarButton = page.locator(
    '#note-editor-toolbar button[aria-label="Lista de tarefas"]:visible',
  )
  check(
    'ID 125 - toolbar oferece checklist para heading selecionado',
    (await checklistToolbarButton.count()) === 1,
  )
  await checklistToolbarButton.click()
  check(
    'ID 125 - toolbar adiciona checklist sem converter o heading em lista',
    (await page.locator('#sem-checklist.doit-note-sheet-prose').count()) === 0 &&
      (await page.locator('h1#sem-checklist .doit-heading-checkbox').count()) === 1 &&
      (await page.locator('.doit-note-sheet-prose ul[data-type="taskList"]').count()) === 0,
  )
  await checklistToolbarButton.click()
  check(
    'ID 125 - toolbar remove checklist mantendo o heading',
    (await page.locator('h1#sem-checklist .doit-heading-checkbox').count()) === 0,
  )

  await page.locator('.doit-heading-collapse-toggle').first().click()
  check(
    'IDs 125/126 - checklist preserva retracao de heading',
    (await page.locator('.doit-heading-collapse-toggle').first().getAttribute('class'))?.includes(
      'is-collapsed',
    ),
  )

  await shot(page, 'doitmd-outline-headings-2026-06-07.png')
  await page.reload()
  await page.waitForLoadState('networkidle')
  check(
    'ID 125 - checked e unchecked persistem apos reabrir',
    (await page.locator('.doit-heading-checkbox').nth(0).getAttribute('aria-checked')) === 'true' &&
      (await page.locator('.doit-heading-checkbox').nth(1).getAttribute('aria-checked')) ===
        'false',
  )
  const afterReload = await getItem(page, note.id)
  check(
    'IDs 124/125 - conteudo real mantem headings e marcador Markdown',
    afterReload.contentMd.includes('# [x] Vídeo 01.md') &&
      afterReload.contentMd.includes('## [ ] Seção com acento & números 123') &&
      afterReload.contentMd.includes('# Sem checklist') &&
      !afterReload.contentMd.includes('](http://01.md)'),
  )

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.waitForLoadState('networkidle')
  const mobile = await page.evaluate(() => ({
    checks: document.querySelectorAll('.doit-heading-checkbox').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    firstHeading: document.querySelector('.doit-note-sheet-prose h1')?.textContent,
  }))
  check(
    'ID 125 - headings com checkbox funcionam no mobile sem overflow',
    mobile.checks === 4 && !mobile.overflow,
    JSON.stringify(mobile),
  )
  await shot(page, 'doitmd-heading-checklist-mobile-2026-06-07.png')

  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.ok)
  if (failed.length) throw new Error(`Failed: ${failed.map((result) => result.name).join('; ')}`)
} finally {
  await browser.close()
}
