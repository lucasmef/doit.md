import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3300'
const OUT = 'specs/artifacts/2026-06-04-corrigir-091-atalho-w-notas-desktop'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const results = []

function log(...args) {
  console.log('[validate-091]', ...args)
}

function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
}

function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true })
  try {
    fs.mkdirSync(GLOBAL_DIR, { recursive: true })
  } catch (error) {
    log(`Global screenshot folder unavailable: ${error.message}`)
  }
}

function copyToGlobal(src, destName) {
  try {
    fs.copyFileSync(src, path.join(GLOBAL_DIR, destName))
  } catch (error) {
    log(`Global screenshot copy failed: ${error.message}`)
  }
}

async function screenshot(page, file) {
  const dest = path.join(OUT, file)
  await page.screenshot({ path: dest, fullPage: false })
  copyToGlobal(dest, file)
  log(`Saved screenshot: ${dest}`)
}

async function signUp(page) {
  const unique = `qa-091-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 091')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 30000 })
  return unique
}

async function getItems(page) {
  const res = await page.request.get(`${BASE}/api/items`)
  if (!res.ok()) throw new Error(`/api/items -> ${res.status()} ${await res.text()}`)
  const data = await res.json()
  return data.items ?? []
}

async function currentNote(page) {
  const match = page.url().match(/\/notas\/([^/?#]+)/)
  if (!match) return null
  const id = decodeURIComponent(match[1])
  return (await getItems(page)).find((item) => item.id === id) ?? null
}

async function waitForNoteContent(page, id, expected, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs
  let lastContent = ''
  while (Date.now() < deadline) {
    const note = (await getItems(page)).find((item) => item.id === id)
    lastContent = note?.contentMd ?? ''
    if (lastContent.includes(expected)) return note
    await page.waitForTimeout(500)
  }
  log(`Timed out waiting for saved content. Last content: ${lastContent}`)
  return null
}

async function validateDesktopW(page, unique) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')

  await page.keyboard.press('w')
  await page.waitForURL('**/notas/**', { timeout: 15000 })
  await page.waitForLoadState('networkidle')

  const url = page.url()
  const noteId = decodeURIComponent(url.match(/\/notas\/([^/?#]+)/)?.[1] ?? '')
  const editor = page.locator('.doit-note-sheet-prose')
  const hasEditor = await editor.count()
  const modalCount = await page.locator('[aria-modal="true"]').count()
  const oldNoteDetailCount = await page.locator('[data-note-scroll-container="true"] [role="dialog"]').count()

  await editor.click()
  const expectedTitle = `Nota W ${unique}`
  await page.keyboard.type(`# ${expectedTitle}\n\nConteudo salvo pelo atalho W.`)
  const saved = await waitForNoteContent(page, noteId, expectedTitle)

  await screenshot(page, '01-doitmd-atalho-w-nota-maximizada-2026-06-04.png')
  check('W abre rota /notas/[id] no desktop', url.includes('/notas/'), url)
  check('Editor novo de notas esta visivel', hasEditor > 0, `count=${hasEditor}`)
  check('Modal compacto/intermediario nao aparece', modalCount === 0, `modalCount=${modalCount}`)
  check('Editor antigo/modal de detalhe nao aparece', oldNoteDetailCount === 0, `oldNoteDetailCount=${oldNoteDetailCount}`)
  check('Nota criada pelo W salva conteudo', Boolean(saved?.contentMd?.includes(expectedTitle)), saved?.id ?? 'sem nota')

  const beforeEditor = (await getItems(page)).filter((item) => item.complexity === 'note').length
  await editor.click()
  await page.keyboard.press('w')
  await page.waitForTimeout(500)
  const afterEditor = (await getItems(page)).filter((item) => item.complexity === 'note').length
  check('W dentro do editor nao cria outra nota', beforeEditor === afterEditor, `before=${beforeEditor}; after=${afterEditor}`)

  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="Buscar itens, notas..."]', 'teste')
  const urlBeforeInput = page.url()
  await page.keyboard.press('w')
  await page.waitForTimeout(500)
  check('W dentro de input nao dispara atalho', page.url() === urlBeforeInput, page.url())
}

async function validateOtherShortcuts(page) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')

  await page.keyboard.press('q')
  await page.waitForTimeout(400)
  const qModal = await page.locator('[aria-modal="true"]').count()
  check('Atalho Q ainda abre captura de tarefa', qModal > 0, `modalCount=${qModal}`)
  await page.keyboard.press('Escape')

  await page.waitForTimeout(300)
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  const eventModalText = await page.locator('body').innerText()
  check('Atalho E ainda abre captura de evento', /evento/i.test(eventModalText), 'evento encontrado no texto da tela')
  await page.keyboard.press('Escape')

  await page.waitForTimeout(300)
  await page.keyboard.press('h')
  await page.waitForURL('**/today**', { timeout: 10000 })
  check('Atalho H ainda navega para Hoje', page.url().includes('/today'), page.url())

  await page.keyboard.press('Shift+?')
  await page.waitForTimeout(400)
  const helpModal = await page.locator('[aria-modal="true"]').count()
  check('Atalho ? ainda abre ajuda de atalhos', helpModal > 0, `modalCount=${helpModal}`)
  await screenshot(page, '02-doitmd-atalhos-adjacentes-2026-06-04.png')
}

async function validateMobileNoRegression(page) {
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('w')
  await page.waitForURL('**/notas/**', { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  const mobileEditor = await page.locator('[data-note-scroll-container="true"]').count()
  const modalCount = await page.locator('[aria-modal="true"]').count()
  await screenshot(page, '03-doitmd-mobile-sem-modal-compacto-2026-06-04.png')
  check('Mobile continua abrindo editor novo sem modal compacto pelo W', mobileEditor > 0 && modalCount === 0, `editor=${mobileEditor}; modal=${modalCount}`)
}

async function main() {
  ensureDirs()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: DESKTOP })
  try {
    const unique = await signUp(page)
    await validateDesktopW(page, unique)
    await validateOtherShortcuts(page)
    await validateMobileNoRegression(page)
  } finally {
    await browser.close()
  }
  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.ok)
  if (failed.length > 0) {
    console.error(`FAILED ${failed.length} checks`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
