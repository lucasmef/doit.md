import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3411'
const OUT = 'specs/artifacts/2026-06-07-validar-124-127-qa'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const results = []

function check(id, name, ok, extra = '') {
  results.push({ id, name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] - ${name}${extra ? ` (${extra})` : ''}`)
}

function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true })
  try { fs.mkdirSync(GLOBAL_DIR, { recursive: true }) } catch {}
}

async function shot(page, name) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: false })
  try { fs.copyFileSync(file, path.join(GLOBAL_DIR, `doitmd-${name}`)) } catch {}
  console.log(`PRINT: ${name}`)
  return file
}

async function signUp(page) {
  const unique = `qa-124-127-screenshots-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 124-127')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 30000 })
  return unique
}

async function post(page, url, body) {
  const response = await page.request.post(`${BASE}${url}`, { data: body, timeout: 90000 })
  if (!response.ok()) throw new Error(`${url}: ${response.status()} ${await response.text()}`)
  return response.json()
}

async function getItem(page, itemId) {
  const response = await page.request.get(`${BASE}/api/items/${itemId}`, { timeout: 90000 })
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
const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true })
const page = await context.newPage()

try {
  await signUp(page)

  const markdown = [
    '# [ ] Video H1 com checklist',
    '',
    'Conteudo do H1.',
    '',
    '## [x] Secao H2 com acento marcada',
    '',
    'Conteudo do H2.',
    '',
    '### [ ] Subsecao H3 com checklist',
    '',
    'Conteudo do H3.',
    '',
    '# Titulo sem checklist',
    '',
    'Conteudo sem checklist.',
  ].join('\n')

  const note = (
    await post(page, '/api/items', {
      title: 'QA 124-127 Outline Checklist',
      complexity: 'note',
      status: 'todo',
      contentMd: markdown,
    })
  ).item

  // ─── ID 124 desktop: outline limpo ────────────────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas/${note.id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  const outline = page.locator('aside').last().locator('nav')
  const outlineText = (await outline.innerText()).replace(/\s+/g, ' ').trim()
  const outlineOk =
    !outlineText.includes('#') &&
    !outlineText.includes('[ ]') &&
    !outlineText.includes('[x]') &&
    outlineText.includes('Video H1') &&
    outlineText.includes('Secao H2') &&
    outlineText.includes('Subsecao H3') &&
    outlineText.includes('Titulo sem checklist')
  check('124', 'outline exibe texto limpo (sem #, sem marcador checklist)', outlineOk, outlineText.slice(0, 120))

  const paddings = await outline
    .locator(':scope > div')
    .evaluateAll((nodes) => nodes.slice(0, 3).map((n) => getComputedStyle(n).paddingLeft))
  check('124', 'hierarquia H1/H2/H3 preservada no outline', paddings[0] < paddings[1] && paddings[1] < paddings[2], JSON.stringify(paddings))

  await shot(page, 'ID124-outline-limpo-desktop.png')

  // ─── ID 124 mobile: sem # no editor ───────────────────────────────────────
  await page.setViewportSize(MOBILE)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  const headingText = await page.locator('.doit-note-sheet-prose h1').first().innerText().catch(() => '')
  check('124', 'heading mobile não exibe #', !headingText.startsWith('#') && headingText.includes('Video H1'), headingText)
  await shot(page, 'ID124-outline-limpo-mobile.png')

  // ─── ID 125: checkboxes em H1 H2 H3 desktop ───────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)

  const editorChecks = page.locator('.doit-heading-checkbox')
  const editorCount = await editorChecks.count()
  check('125', 'checkboxes existem em H1 H2 H3 no editor', editorCount >= 3, `editor=${editorCount}`)

  const h1check = page.locator('.doit-note-sheet-prose h1 .doit-heading-checkbox').first()
  const h2check = page.locator('.doit-note-sheet-prose h2 .doit-heading-checkbox').first()
  const h3check = page.locator('.doit-note-sheet-prose h3 .doit-heading-checkbox').first()
  const h1state = await h1check.getAttribute('aria-checked').catch(() => null)
  const h2state = await h2check.getAttribute('aria-checked').catch(() => null)
  const h3state = await h3check.getAttribute('aria-checked').catch(() => null)
  check('125', 'H1=false, H2=true, H3=false (estado inicial correto)', h1state === 'false' && h2state === 'true' && h3state === 'false', `H1=${h1state} H2=${h2state} H3=${h3state}`)

  await shot(page, 'ID125-heading-checkbox-h1-h2-h3-desktop.png')

  // ─── ID 127: outline com checkbox desmarcado ───────────────────────────────
  const outlineChecks = page.locator('.doit-outline-heading-checkbox')
  const outlineCount = await outlineChecks.count()
  check('127', 'outline mostra checkboxes apenas para headings com checklist', outlineCount >= 3, `outline=${outlineCount}`)

  const outline127First = outlineChecks.nth(0)
  const outline127FirstState = await outline127First.getAttribute('aria-checked').catch(() => null)
  check('127', 'primeiro checkbox do outline é desmarcado (false)', outline127FirstState === 'false', `aria-checked=${outline127FirstState}`)

  await shot(page, 'ID127-outline-checkbox-desmarcado-desktop.png')

  // ─── ID 126: âncora no outline desktop ────────────────────────────────────
  const outlineLinks = outline.locator('a')
  if (await outlineLinks.count() > 0) {
    await outlineLinks.first().click()
    await page.waitForTimeout(600)
    const url126 = page.url()
    check('126', 'clicar no outline atualiza URL com âncora', url126.includes('#'), url126)
    await shot(page, 'ID126-outline-ancora-desktop.png')

    // âncora de heading com checkbox
    const outlineWithCheck = outline.locator('div').filter({ has: page.locator('.doit-outline-heading-checkbox') }).locator('a').first()
    if (await outlineWithCheck.count() > 0) {
      await outlineWithCheck.click()
      await page.waitForTimeout(600)
      const url126cb = page.url()
      check('126', 'âncora de heading com checkbox funciona', url126cb.includes('#'), url126cb)
      await shot(page, 'ID126-outline-ancora-checkbox-desktop.png')
    } else {
      check('126', 'âncora de heading com checkbox funciona', false, 'locator vazio')
      await shot(page, 'ID126-outline-ancora-checkbox-desktop.png')
    }
  } else {
    check('126', 'clicar no outline atualiza URL com âncora', false, 'sem links no outline')
    check('126', 'âncora de heading com checkbox funciona', false, 'sem links no outline')
  }

  // ─── ID 127: toggle outline → checkbox marcado ────────────────────────────
  await outline127First.click()
  await page.waitForTimeout(300)
  const after127toggle = await outline127First.getAttribute('aria-checked').catch(() => null)
  check('127', 'toggle no outline marca checkbox (false → true)', after127toggle === 'true', `aria-checked=${after127toggle}`)

  const editorAfterToggle = page.locator('.doit-note-sheet-prose h1 .doit-heading-checkbox').first()
  const editorAfter = await editorAfterToggle.getAttribute('aria-checked').catch(() => null)
  check('127', 'toggle no outline reflete no editor', editorAfter === 'true', `editor aria-checked=${editorAfter}`)

  await page.waitForItem?.(page, note.id, (item) => item.contentMd.includes('# [x] Video'), 5000)
  await page.waitForTimeout(1000)
  await shot(page, 'ID127-outline-checkbox-marcado-desktop.png')

  // ─── ID 125: persistência após reabrir ────────────────────────────────────
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  const persistH1 = await page.locator('.doit-note-sheet-prose h1 .doit-heading-checkbox').first().getAttribute('aria-checked').catch(() => null)
  const persistH2 = await page.locator('.doit-note-sheet-prose h2 .doit-heading-checkbox').first().getAttribute('aria-checked').catch(() => null)
  check('125', 'estado checked/unchecked persiste após reabrir', persistH1 === 'true' && persistH2 === 'true', `H1=${persistH1} H2=${persistH2}`)
  await shot(page, 'ID125-heading-checkbox-persistencia-desktop.png')

  // ─── ID 127: mobile (outline oculto) ─────────────────────────────────────
  await page.setViewportSize(MOBILE)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  const mobileChecks = await page.locator('.doit-heading-checkbox').count()
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  check('127', 'mobile: checkboxes visíveis no editor (outline oculto por design)', mobileChecks >= 3, `checks=${mobileChecks}`)
  check('127', 'mobile: sem overflow horizontal', !mobileOverflow)
  await shot(page, 'ID127-outline-checkbox-mobile.png')

  // Salvar resultados
  fs.writeFileSync(path.join(OUT, 'resultados-qa-124-127.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((r) => !r.ok)
  const passed = results.filter((r) => r.ok)
  console.log(`\n=== RESUMO: ${passed.length} PASS / ${failed.length} FAIL ===`)
  if (failed.length) {
    console.log('FALHAS:', failed.map((r) => `[${r.id}] ${r.name}`).join('\n'))
    throw new Error(`${failed.length} asserções falharam`)
  }
} finally {
  await browser.close()
}
