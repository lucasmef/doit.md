import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3412'
const OUT = 'specs/artifacts/2026-06-07-corrigir-115-128-130-editor-notas'
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
  const unique = `qa-115-128-130-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA Editor Notes')
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
    await page.waitForTimeout(250)
  }
  return item
}

async function progressState(page) {
  return page.locator('aside').last().locator('text=/\\d+ \\/ \\d+ feito|sem tarefas/').first()
}

ensureDirs()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const markdown = [
    '# [ ] H1 aberto',
    '',
    '- [ ] tarefa comum aberta',
    '- [x] tarefa comum feita',
    '',
    '## [x] H2 feito',
    '',
    '### [ ] H3 aberto',
    '',
    'Texto solto que nao conta.',
    '',
    '```',
    '# [x] heading ignorado no codigo',
    '- [x] tarefa ignorada no codigo',
    '```',
    '',
    '# Heading sem checklist',
  ].join('\n')
  const note = (
    await post(page, '/api/items', {
      title: `Editor progress ${unique}`,
      complexity: 'note',
      status: 'todo',
      contentMd: markdown,
    })
  ).item

  await page.goto(`${BASE}/notas/${note.id}`)
  await page.waitForLoadState('networkidle')

  const initialProgress = await (await progressState(page)).innerText()
  check(
    'ID 128 - progresso inicial conta checklists comuns e headings',
    initialProgress.includes('2 / 5 feito'),
    initialProgress,
  )
  check(
    'ID 128 - percentual inicial correto',
    (await page.locator('aside').last().locator('text=40%').count()) > 0,
  )

  const outline = page.locator('aside').last().locator('nav')
  const outlineText = (await outline.innerText()).replace(/\s+/g, ' ').trim()
  const outlineChecks = page.locator('.doit-outline-heading-checkbox')
  check(
    'ID 129 - outline usa checkbox visual e texto limpo',
    (await outlineChecks.count()) === 3 &&
      outlineText.includes('H1 aberto') &&
      outlineText.includes('H2 feito') &&
      outlineText.includes('H3 aberto') &&
      outlineText.includes('Heading sem checklist') &&
      !outlineText.includes('[x]') &&
      !outlineText.includes('[ ]'),
    outlineText,
  )
  check(
    'ID 129 - headings sem checklist nao exibem checkbox no outline',
    (await outline.locator(':scope > div').last().locator('.doit-outline-heading-checkbox').count()) === 0,
  )

  const editorChecks = page.locator('.doit-heading-checkbox')
  const h2Checked = editorChecks.nth(1)
  const h2Style = await page.locator('.doit-heading-checkbox-label.is-checked').first().evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      color: style.color,
      textDecorationLine: style.textDecorationLine,
    }
  })
  const h2Box = await h2Checked.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
    }
  })
  check(
    'ID 130 - heading concluido fica riscado e cinza',
    h2Style.textDecorationLine.includes('line-through') && h2Style.color === 'rgb(148, 163, 184)',
    JSON.stringify(h2Style),
  )
  check(
    'ID 130 - checkbox de heading usa azul padrao',
    h2Box.backgroundColor === 'rgb(47, 107, 255)' && h2Box.borderColor === 'rgb(47, 107, 255)',
    JSON.stringify(h2Box),
  )

  await editorChecks.nth(0).click()
  await page.waitForTimeout(250)
  const afterH1Progress = await (await progressState(page)).innerText()
  check(
    'ID 128 - progresso atualiza ao marcar H1',
    afterH1Progress.includes('3 / 5 feito') &&
      (await page.locator('aside').last().locator('text=60%').count()) > 0,
    afterH1Progress,
  )

  await page.locator('.ProseMirror ul[data-type="taskList"] input[type="checkbox"]').first().click()
  await page.waitForTimeout(250)
  const afterTaskProgress = await (await progressState(page)).innerText()
  check(
    'ID 128 - progresso atualiza ao marcar checklist comum',
    afterTaskProgress.includes('4 / 5 feito') &&
      (await page.locator('aside').last().locator('text=80%').count()) > 0,
    afterTaskProgress,
  )

  const persisted = await waitForItem(
    page,
    note.id,
    (item) => item.contentMd.includes('# [x] H1 aberto') && item.contentMd.includes('- [x] tarefa comum aberta'),
  )
  check(
    'IDs 128/130 - estados persistem no Markdown',
    persisted.contentMd.includes('# [x] H1 aberto') &&
      persisted.contentMd.includes('- [x] tarefa comum aberta') &&
      persisted.contentMd.includes('## [x] H2 feito') &&
      persisted.contentMd.includes('### [ ] H3 aberto'),
  )

  await shot(page, 'doitmd-editor-progress-outline-2026-06-07.png')
  await page.reload()
  await page.waitForLoadState('networkidle')
  const reloadProgress = await (await progressState(page)).innerText()
  check(
    'ID 128 - progresso persiste ao reabrir nota',
    reloadProgress.includes('4 / 5 feito') &&
      (await page.locator('aside').last().locator('text=80%').count()) > 0,
    reloadProgress,
  )

  await page.locator('#note-editor-toolbar button[title="Modo foco"]').click()
  await page.waitForTimeout(250)
  const beforeZoom = await page.evaluate(() => ({
    scale: getComputedStyle(document.querySelector('.note-editor-page')).getPropertyValue('--note-focus-ui-scale').trim(),
    topbarHeight: document.querySelector('.note-focus-ui')?.getBoundingClientRect().height ?? 0,
    editorFont: getComputedStyle(document.querySelector('.doit-note-sheet-prose')).fontSize,
  }))
  const zoomOverridden = await page.evaluate(() => {
    try {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 1.5 })
      window.dispatchEvent(new Event('resize'))
      window.visualViewport?.dispatchEvent(new Event('resize'))
      return true
    } catch {
      return false
    }
  })
  await page.waitForTimeout(250)
  const afterZoom = await page.evaluate(() => ({
    scale: getComputedStyle(document.querySelector('.note-editor-page')).getPropertyValue('--note-focus-ui-scale').trim(),
    topbarHeight: document.querySelector('.note-focus-ui')?.getBoundingClientRect().height ?? 0,
    editorFont: getComputedStyle(document.querySelector('.doit-note-sheet-prose')).fontSize,
  }))
  check(
    'ID 115 - modo foco publica escala limitada para controles ao detectar zoom',
    zoomOverridden && Number(afterZoom.scale) < Number(beforeZoom.scale || '1') && Number(afterZoom.scale) >= 0.74,
    JSON.stringify({ beforeZoom, afterZoom, zoomOverridden }),
  )
  await shot(page, 'doitmd-focus-mode-controls-2026-06-07.png')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.waitForLoadState('networkidle')
  const mobile = await page.evaluate(() => ({
    checks: document.querySelectorAll('.doit-heading-checkbox').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    progressRailHidden: getComputedStyle(document.querySelector('aside:last-of-type') ?? document.body).display === 'none',
  }))
  check(
    'IDs 128-130 - mobile mantem editor sem overflow',
    mobile.checks === 3 && !mobile.overflow,
    JSON.stringify(mobile),
  )
  await shot(page, 'doitmd-heading-checklist-mobile-2026-06-07.png')

  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.ok)
  if (failed.length) throw new Error(`Failed: ${failed.map((result) => result.name).join('; ')}`)
} finally {
  await browser.close()
}
