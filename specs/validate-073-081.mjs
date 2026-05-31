import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3101'
const OUT = 'specs/artifacts/2026-05-31-corrigir-073-081-ajustes-ui'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

const results = []

function log(...args) {
  console.log('[validate-073-081]', ...args)
}

function check(name, ok, extra = '') {
  results.push({ name, ok })
  log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
}

function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true })
  try {
    fs.mkdirSync(GLOBAL_DIR, { recursive: true })
  } catch (err) {
    log(`Global screenshot folder unavailable: ${err.message}`)
  }
}

function copyToGlobal(src, destName) {
  try {
    fs.copyFileSync(src, path.join(GLOBAL_DIR, destName))
  } catch (err) {
    log(`Global screenshot copy failed: ${err.message}`)
  }
}

async function screenshot(page, file) {
  const dest = path.join(OUT, file)
  await page.screenshot({ path: dest, fullPage: true })
  copyToGlobal(dest, file)
  log(`Saved screenshot: ${dest}`)
}

async function signUp(page) {
  const unique = `qa-073-081-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 073 081')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 20000 })
  return unique
}

async function post(page, url, body) {
  const res = await page.request.post(`${BASE}${url}`, { data: body })
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function patch(page, url, body) {
  const res = await page.request.patch(`${BASE}${url}`, { data: body })
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function get(page, url) {
  const res = await page.request.get(`${BASE}${url}`)
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function rowFor(page, title) {
  const row = page.locator('button').filter({ hasText: title }).first()
  await row.waitFor({ state: 'visible', timeout: 15000 })
  return row
}

async function checkboxTone(page, title) {
  const row = await rowFor(page, title)
  return (await row.locator('[role="button"]').first().getAttribute('class')) ?? ''
}

async function validateFolders(page, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas?folder=${data.folderA.id}`)
  await page.waitForLoadState('networkidle')

  const high = await checkboxTone(page, data.highTitle)
  const medium = await checkboxTone(page, data.mediumTitle)
  const low = await checkboxTone(page, data.lowTitle)
  const neutral = await checkboxTone(page, data.neutralTitle)
  check('ID 077 - prioridade alta aplica vermelho em Pastas', high.includes('red'))
  check('ID 077 - prioridade media aplica laranja em Pastas', medium.includes('orange'))
  check('ID 077 - prioridade baixa aplica azul em Pastas', low.includes('blue'))
  check('ID 077 - sem prioridade fica neutra em Pastas', !neutral.includes('red') && !neutral.includes('orange') && !neutral.includes('blue'))
  await screenshot(page, 'doitmd-pastas-prioridade-2026-05-31-desktop.png')

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas?folder=${data.folderA.id}`)
  await page.waitForLoadState('networkidle')
  const eventRow = await rowFor(page, data.eventTitle)
  const eventText = await eventRow.innerText()
  check('ID 075 - evento/item com data mostra data no mobile em Pastas', /8|jun|09:00/i.test(eventText), eventText.replace(/\s+/g, ' '))
  await screenshot(page, 'doitmd-pastas-data-mobile-2026-05-31.png')
}

async function validateTaskEditor(page, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas?folder=${data.folderA.id}`)
  await page.waitForLoadState('networkidle')
  await (await rowFor(page, data.longTitle)).click()
  await page.getByText('Editar tarefa', { exact: false }).waitFor({ state: 'visible', timeout: 15000 })

  const titleInput = page.locator('textarea[placeholder*="Revisar"]').first()
  await titleInput.fill(`Linha principal ${data.unique}\ncontinua em segunda linha\nterceira linha`)
  await page.waitForTimeout(150)
  const box = await titleInput.boundingBox()
  check('ID 076 - titulo da tarefa expande para multiplas linhas', Boolean(box && box.height > 70), box ? `height=${Math.round(box.height)}` : 'sem box')

  await page.getByTitle('Selecionar ou criar pasta').click()
  await page.getByLabel('Cancelar selecao de pasta').click()
  await page.waitForTimeout(100)
  const folderPickerClosed = await page.getByPlaceholder('Buscar ou criar pasta').isVisible().then((v) => !v).catch(() => true)
  const stillInFolder = await page.getByTitle('Selecionar ou criar pasta').innerText()
  check('ID 078 - seletor de pasta fecha sem selecionar', folderPickerClosed)
  check('ID 078 - cancelar preserva pasta atual', stillInFolder.includes(data.folderA.name), stillInFolder)
  await screenshot(page, 'doitmd-edicao-tarefa-folder-cancel-2026-05-31.png')
  await page.getByText('Cancelar', { exact: true }).last().click()
}

async function validateNoteEditor(page, data) {
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas/${data.note.id}`)
  await page.waitForLoadState('networkidle')
  await page.locator('.doit-heading-collapse-toggle').first().click()
  await page.waitForTimeout(900)
  const afterPatch = await get(page, `/api/items/${data.note.id}`)
  check('ID 079 - retracao salva no Item', Array.isArray(afterPatch.item.collapsedHeadingIndices) && afterPatch.item.collapsedHeadingIndices.includes(0))

  await page.reload()
  await page.waitForLoadState('networkidle')
  const restoredClass = (await page.locator('.doit-heading-collapse-toggle').first().getAttribute('class')) ?? ''
  check('ID 079 - retracao persiste ao sair e voltar', restoredClass.includes('is-collapsed'))

  const paragraphMargin = await page.locator('.doit-note-sheet-prose p').first().evaluate((el) => getComputedStyle(el).marginBottom)
  check('ID 080 - paragrafo do editor sheet sem margem extra', paragraphMargin === '0px', paragraphMargin)

  await page.locator('.ProseMirror').click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+C' : 'Control+C')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  check('ID 080 - copia texto sem linha em branco extra', !/\n\s*\n/.test(copied), JSON.stringify(copied).slice(0, 100))
  await screenshot(page, 'doitmd-editor-notas-collapse-copy-2026-05-31.png')
}

async function validateSettingsMenu(page) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/settings?tab=appearance`)
  await page.getByRole('button', { name: 'Aparencia' }).click()
  await page.waitForLoadState('networkidle')
  const menuSection = page.locator('section').filter({ hasText: 'Menu' }).last()
  await menuSection.getByLabel('Mover para baixo').first().click()
  await page.waitForTimeout(150)
  const prefs = await page.evaluate(() => JSON.parse(window.localStorage.getItem('doit:preferences') ?? '{}'))
  check('ID 081 - Ajustes reordena menu em desktop', prefs.mobileNav?.[0]?.id === 'today' && prefs.mobileNav?.[1]?.id === 'dashboard')

  await page.goto(`${BASE}/dashboard`)
  await page.waitForLoadState('networkidle')
  const desktopNavTexts = await page.locator('header nav a').evaluateAll((links) => links.map((link) => link.textContent?.trim() ?? '').filter(Boolean).slice(0, 4))
  check('ID 081 - menu desktop respeita ordem persistida', desktopNavTexts[0]?.includes('Hoje') && desktopNavTexts[1]?.includes('Dashboard'), desktopNavTexts.join(' / '))
  await screenshot(page, 'doitmd-settings-menu-desktop-2026-05-31.png')
}

async function validate073074(page, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas?folder=${data.folderA.id}`)
  await page.waitForLoadState('networkidle')
  const doneTitle = `073 concluir ${data.unique}`
  await post(page, '/api/items', { title: doneTitle, complexity: 'task', status: 'todo', folderId: data.folderA.id })
  await page.reload()
  await page.waitForLoadState('networkidle')
  const row = await rowFor(page, doneTitle)
  await row.locator('[role="button"]').first().click()
  await page.waitForTimeout(450)
  check('ID 073 - concluida em pasta permanece visivel durante atraso', await page.getByText(doneTitle, { exact: true }).isVisible())
  await page.waitForTimeout(1900)
  check('ID 073 - concluida some depois do atraso quando pasta oculta concluidos', !(await page.getByText(doneTitle, { exact: true }).isVisible().catch(() => false)))

  await page.keyboard.press('q')
  const quickTitle = page.locator('input[placeholder*="tarefa"], textarea[placeholder*="tarefa"], textarea[placeholder*="Revisar"]').first()
  await quickTitle.waitFor({ state: 'visible', timeout: 10000 })
  await quickTitle.fill('Validar proxima semana')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  const expected = nextMondayKey()
  const items = await get(page, '/api/items')
  const created = (items.items ?? []).find((item) => item.title === 'Validar')
  check(
    'ID 074 - proxima semana ainda detecta proxima segunda-feira',
    created?.dueDate === expected,
    `expected=${expected} actual=${created?.dueDate ?? 'missing'}`,
  )
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function nextMondayKey() {
  const next = new Date()
  let days = (1 - next.getDay() + 7) % 7
  if (days < 1) days += 7
  next.setDate(next.getDate() + days)
  return localDateKey(next)
}

ensureDirs()

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: DESKTOP,
  hasTouch: true,
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const folderA = (await post(page, '/api/folders', { name: `QA Pasta A ${unique}` })).folder
  const folderB = (await post(page, '/api/folders', { name: `QA Pasta B ${unique}` })).folder
  const highTitle = `077 alta ${unique}`
  const mediumTitle = `077 media ${unique}`
  const lowTitle = `077 baixa ${unique}`
  const neutralTitle = `077 neutra ${unique}`
  const eventTitle = `075 evento datado ${unique}`
  const longTitle = `076 titulo longo ${unique}`

  await post(page, '/api/items', { title: highTitle, complexity: 'task', status: 'todo', folderId: folderA.id, priority: 1 })
  await post(page, '/api/items', { title: mediumTitle, complexity: 'task', status: 'todo', folderId: folderA.id, priority: 2 })
  await post(page, '/api/items', { title: lowTitle, complexity: 'task', status: 'todo', folderId: folderA.id, priority: 3 })
  await post(page, '/api/items', { title: neutralTitle, complexity: 'task', status: 'todo', folderId: folderA.id })
  await post(page, '/api/items', { title: eventTitle, complexity: 'task', status: 'todo', folderId: folderA.id, dueDate: '2026-06-08', dueTime: '09:00' })
  await post(page, '/api/items', { title: longTitle, complexity: 'task', status: 'todo', folderId: folderA.id })
  const note = (await post(page, '/api/items', {
    title: 'Nota QA',
    complexity: 'note',
    status: 'todo',
    folderId: folderB.id,
    contentMd: '# Topico QA\nLinha dentro\n## Subtopico\nDetalhe simples',
  })).item

  const data = { unique, folderA, folderB, highTitle, mediumTitle, lowTitle, neutralTitle, eventTitle, longTitle, note }
  await validateFolders(page, data)
  await validateTaskEditor(page, data)
  await validateNoteEditor(page, data)
  await validateSettingsMenu(page)
  await validate073074(page, data)

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    throw new Error(`Failed checks: ${failed.map((r) => r.name).join('; ')}`)
  }
} finally {
  await browser.close()
}
