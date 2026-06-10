import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3420'
const OUT = 'specs/artifacts/2026-06-10-reajustar-editor-notas-foco-mobile-recentes'
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
  const unique = `qa-notes-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA Notes Focus')
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

async function getRecentIds(page) {
  return page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('doit:preferences') || '{}')
    return Array.isArray(prefs.recentNoteIds) ? prefs.recentNoteIds : []
  })
}

async function editorSpacing(page) {
  return page.evaluate(() => {
    const toolbar = document.querySelector('#note-editor-toolbar > div')
    const firstBlock = document.querySelector('.doit-note-sheet-prose > :first-child')
    if (!toolbar || !firstBlock) return null
    const toolbarRect = toolbar.getBoundingClientRect()
    const firstRect = firstBlock.getBoundingClientRect()
    return {
      gap: Math.round((firstRect.top - toolbarRect.bottom) * 10) / 10,
      marginTop: getComputedStyle(firstBlock).marginTop,
      tag: firstBlock.tagName,
    }
  })
}

ensureDirs()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const folder = (await post(page, '/api/folders', { name: `Ajustes ${unique}` })).folder
  const partial = (
    await post(page, '/api/items', {
      title: `Nota parcial ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folder.id,
      contentMd: '# Primeiro H1\n\n- [x] feita\n- [ ] aberta\n- [ ] pendente',
    })
  ).item
  const complete = (
    await post(page, '/api/items', {
      title: `Nota completa ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folder.id,
      contentMd: '# [x] Concluida\n\n- [x] feita',
    })
  ).item
  const h2 = (
    await post(page, '/api/items', {
      title: `Primeiro H2 ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folder.id,
      contentMd: '## Primeiro H2\n\nTexto.',
    })
  ).item
  const h3 = (
    await post(page, '/api/items', {
      title: `Primeiro H3 ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folder.id,
      contentMd: '### Primeiro H3\n\nTexto.',
    })
  ).item
  const paragraph = (
    await post(page, '/api/items', {
      title: `Primeiro paragrafo ${unique}`,
      complexity: 'note',
      status: 'todo',
      folderId: folder.id,
      contentMd: 'Primeiro paragrafo normal.',
    })
  ).item

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/notas?folder=${folder.id}`)
  await page.waitForLoadState('networkidle')
  const partialRow = page.locator('button:visible').filter({ hasText: partial.title }).first()
  const completeRow = page.locator('button:visible').filter({ hasText: complete.title }).first()
  const partialProgress = partialRow
    .locator('span.font-extrabold:visible')
    .filter({ hasText: /^33%$/ })
  const completeProgress = completeRow
    .locator('span.font-extrabold:visible')
    .filter({ hasText: /^100%$/ })
  check('ID 137 - progresso parcial visivel no mobile', (await partialProgress.count()) === 1)
  check('ID 137 - progresso 100% visivel no mobile', (await completeProgress.count()) === 1)
  check(
    'ID 137 - nota 100% continua riscada',
    await completeRow.locator('span.line-through').isVisible(),
  )
  check(
    'ID 138 - ultima alteracao continua oculta no mobile',
    (await partialRow.locator('svg:visible circle[cx="12"][cy="12"]').count()) === 0,
  )
  await shot(page, 'doitmd-notas-progresso-mobile-2026-06-10.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  const spacingCases = [
    [partial.id, 'H1'],
    [h2.id, 'H2'],
    [h3.id, 'H3'],
    [paragraph.id, 'P'],
  ]
  const spacingResults = []
  for (const [noteId, expectedTag] of spacingCases) {
    await page.goto(
      `${BASE}/notas/${noteId}?from=${encodeURIComponent(`/notas?folder=${folder.id}`)}`,
    )
    await page.waitForLoadState('networkidle')
    const spacing = await editorSpacing(page)
    spacingResults.push({ expectedTag, ...spacing })
    check(
      `ID 139 - primeiro ${expectedTag} sem margem superior excessiva`,
      spacing?.tag === expectedTag && spacing.marginTop === '0px' && spacing.gap <= 24,
      JSON.stringify(spacing),
    )
  }
  await page.goto(
    `${BASE}/notas/${partial.id}?from=${encodeURIComponent(`/notas?folder=${folder.id}`)}`,
  )
  await page.waitForLoadState('networkidle')
  await shot(page, 'doitmd-editor-espacamento-h1-2026-06-10.png')

  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('doit:preferences') || '{}')
    localStorage.setItem('doit:preferences', JSON.stringify({ ...prefs, recentNoteIds: [] }))
    window.dispatchEvent(new Event('doit:preferences-changed'))
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  check('ID 140 - abrir nota nao registra recente', (await getRecentIds(page)).length === 0)

  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.insertText(`\nautosave-${Date.now()}`)
  await page.waitForTimeout(1200)
  check('ID 140 - autosave nao reordena recentes', (await getRecentIds(page)).length === 0)

  await page.locator(`aside a[href^="/notas/${h2.id}"]`).click()
  await page.waitForURL(`**/notas/${h2.id}**`)
  await page.waitForTimeout(50)
  check(
    'ID 140 - trocar nota registra apenas a nota fechada',
    (await getRecentIds(page))[0] === partial.id,
    JSON.stringify(await getRecentIds(page)),
  )
  await page.keyboard.press('Escape')
  await page.waitForURL(`**/notas?folder=${folder.id}`)
  await page.waitForTimeout(50)
  check(
    'ID 140 - Esc registra a nota fechada no topo',
    (await getRecentIds(page))[0] === h2.id,
    JSON.stringify(await getRecentIds(page)),
  )

  await page.goto(
    `${BASE}/notas/${partial.id}?from=${encodeURIComponent(`/notas?folder=${folder.id}`)}`,
  )
  await page.waitForLoadState('networkidle')
  const recentHrefs = await page.evaluate(() => {
    const rail = document.querySelector('aside')
    const heading = Array.from(rail?.querySelectorAll('div') ?? []).find(
      (node) => node.textContent?.trim() === 'ultimos itens',
    )
    return Array.from(heading?.nextElementSibling?.querySelectorAll('a') ?? []).map(
      (link) => link.getAttribute('href') || '',
    )
  })
  check(
    'ID 140 - Ultimos itens lista somente notas fechadas',
    recentHrefs[0]?.includes(h2.id) === true &&
      recentHrefs[1]?.includes(partial.id) === true &&
      !recentHrefs.some((href) => href.includes(complete.id)),
    JSON.stringify(recentHrefs),
  )
  await shot(page, 'doitmd-sidebar-ultimos-itens-fechados-2026-06-10.png')

  await page.locator('#note-editor-toolbar button[title="Modo foco"]').click()
  const focusMetrics = await page.evaluate(() => {
    const topbar = document.querySelector('.note-editor-main > div:first-child')
    const toolbar = document.querySelector('#note-editor-toolbar > div')
    const content = document.querySelector('.note-print-content')
    const editor = document.querySelector('.doit-note-sheet-prose')
    if (!topbar || !toolbar || !content || !editor) return null
    const contentRect = content.getBoundingClientRect()
    const editorRect = editor.getBoundingClientRect()
    return {
      topbarHeight: Math.round(topbar.getBoundingClientRect().height),
      toolbarHeight: Math.round(toolbar.getBoundingClientRect().height),
      contentLeft: Math.round(contentRect.left),
      editorGap: Math.round(editorRect.top - toolbar.getBoundingClientRect().bottom),
      focusExitVisible: Boolean(
        Array.from(toolbar.querySelectorAll('button')).find(
          (button) => button.textContent?.includes('Sair do foco'),
        ),
      ),
    }
  })
  check(
    'IDs 115/141 - foco usa topo e toolbar compactos',
    focusMetrics?.topbarHeight <= 40 && focusMetrics.toolbarHeight <= 40,
    JSON.stringify(focusMetrics),
  )
  check(
    'ID 141 - foco reduz margens e aproxima conteudo',
    focusMetrics?.contentLeft <= 50 && focusMetrics.editorGap <= 20,
    JSON.stringify(focusMetrics),
  )
  check('ID 141 - Sair do foco permanece visivel', focusMetrics?.focusExitVisible === true)

  await page.getByRole('button', { name: 'Mais acoes' }).click()
  const menuText = await page.getByRole('menu').innerText()
  check(
    'ID 141 - acoes secundarias acessiveis no menu',
    ['Historico', 'Imprimir', 'Baixar Markdown', 'Destacar nota', 'Arquivar nota'].every((label) =>
      menuText.includes(label),
    ),
    menuText.replace(/\s+/g, ' '),
  )
  await shot(page, 'doitmd-editor-foco-compacto-menu-2026-06-10.png')

  const scaleBefore = Number(
    await page
      .locator('.note-editor-page')
      .evaluate((node) => getComputedStyle(node).getPropertyValue('--note-focus-ui-scale') || '1'),
  )
  await page.evaluate(() => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 2.5 })
    window.dispatchEvent(new Event('resize'))
  })
  await page.waitForTimeout(350)
  const scaleAfter = Number(
    await page
      .locator('.note-editor-page')
      .evaluate((node) => getComputedStyle(node).getPropertyValue('--note-focus-ui-scale') || '1'),
  )
  check(
    'ID 115 - compensacao automatica limita controles no zoom',
    scaleBefore === 1 && scaleAfter === 0.4,
    `${scaleBefore} -> ${scaleAfter}`,
  )

  fs.writeFileSync(
    path.join(OUT, 'resultados-validacao.json'),
    JSON.stringify({ results, spacingResults, focusMetrics }, null, 2),
  )
  const failed = results.filter((result) => !result.ok)
  if (failed.length) throw new Error(`Failed: ${failed.map((result) => result.name).join('; ')}`)
} finally {
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 5000))])
}
