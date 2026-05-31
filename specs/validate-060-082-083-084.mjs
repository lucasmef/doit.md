import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3300'
const OUT = 'specs/artifacts/2026-05-31-corrigir-060-082-083-084-hoje-pastas'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

const results = []

function log(...args) {
  console.log('[validate-060-082-083-084]', ...args)
}

function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return localDateKey(d)
}

function dateLabel(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
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
  await page.screenshot({ path: dest, fullPage: false })
  copyToGlobal(dest, file)
  log(`Saved screenshot: ${dest}`)
}

async function signUp(page) {
  const unique = `qa-060-084-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 060 084')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 30000 })
  return unique
}

async function post(page, url, body) {
  const res = await page.request.post(`${BASE}${url}`, { data: body })
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function seed(page, unique) {
  const today = addDays(0)
  const future = addDays(7)
  const rootFolder = (await post(page, '/api/folders', { name: `084 Raiz ${unique}` })).folder
  const childFolder = (await post(page, '/api/folders', { name: `084 Filho ${unique}`, parentId: rootFolder.id })).folder
  const grandChildFolder = (await post(page, '/api/folders', { name: `084 Neto ${unique}`, parentId: childFolder.id })).folder

  await post(page, '/api/items', {
    title: `060 Inbox solto ${unique}`,
    complexity: 'task',
    status: 'inbox',
    tags: ['qa060'],
  })
  await post(page, '/api/items', {
    title: `060 Inbox com data ${unique}`,
    complexity: 'task',
    status: 'inbox',
    dueDate: future,
    tags: ['qa060'],
  })
  await post(page, '/api/items', {
    title: `060 Inbox com pasta ${unique}`,
    complexity: 'task',
    status: 'inbox',
    folderId: rootFolder.id,
    tags: ['qa060'],
  })
  await post(page, '/api/items', {
    title: `060 Hoje tarefa ${unique}`,
    complexity: 'task',
    status: 'todo',
    dueDate: today,
    tags: ['qa060'],
  })
  await post(page, '/api/items', {
    title: `060 Futuro tarefa ${unique}`,
    complexity: 'task',
    status: 'todo',
    dueDate: future,
    dueTime: '09:30',
    tags: ['qa060'],
  })

  return { today, future, rootFolder, childFolder, grandChildFolder }
}

async function centeredListText(page) {
  return (await page.locator('.today-v3-layout .center .list').innerText()).replace(/\s+/g, ' ')
}

async function validateToday(page, unique, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')

  const initial = await page.evaluate(() => ({
    detailCount: document.querySelectorAll('.today-v3-layout .detail').length,
    emptyText: document.body.textContent?.includes('Selecione um item para ver os detalhes.') ?? false,
    calendarTodayButton: Boolean(document.querySelector('.today-v3-layout .calendar-title .cal-today-btn')),
    calendarTitleText: document.querySelector('.today-v3-layout .calendar-title')?.textContent?.trim() ?? '',
  }))
  await screenshot(page, '01-today-initial-no-empty-panel.png')
  check('ID 082 - painel direito nao aparece ao abrir Hoje', initial.detailCount === 0 && !initial.emptyText, JSON.stringify(initial))
  check('ID 083 - calendario lateral nao tem botao Hoje no topo', !initial.calendarTodayButton && !/\bHoje\b/.test(initial.calendarTitleText), JSON.stringify(initial))

  const inboxButton = page.locator('.today-v3-layout .sidebar-list .side-row').filter({ hasText: 'Inbox' })
  await inboxButton.click()
  await page.waitForTimeout(700)
  const inboxText = await centeredListText(page)
  await screenshot(page, '02-today-inbox-internal.png')
  check(
    'ID 060 - Inbox mostra somente itens sem data e sem pasta',
    inboxText.includes(`060 Inbox solto ${unique}`) &&
      !inboxText.includes(`060 Inbox com data ${unique}`) &&
      !inboxText.includes(`060 Inbox com pasta ${unique}`) &&
      page.url().endsWith('/today'),
    inboxText,
  )

  const upcomingButton = page.locator('.today-v3-layout .sidebar-list .side-row').filter({ hasText: /Pr[oó]ximos/ })
  await upcomingButton.click()
  await page.waitForTimeout(700)
  const upcomingRow = page.locator('.today-v3-layout .row').filter({ hasText: `060 Futuro tarefa ${unique}` })
  const upcomingText = (await upcomingRow.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, '03-today-upcoming-with-date.png')
  check(
    'ID 060 - Proximos mostra futuros com data visivel',
    upcomingText.includes(`060 Futuro tarefa ${unique}`) && upcomingText.includes(dateLabel(data.future)),
    upcomingText,
  )

  const todayButton = page.locator('.today-v3-layout .sidebar-list .side-row').filter({ hasText: 'Hoje' })
  await todayButton.click()
  await page.waitForTimeout(700)
  const todayHeading = await page.locator('.today-v3-layout .center-head h1').innerText()
  const todayText = await centeredListText(page)
  await screenshot(page, '04-today-return-current-day.png')
  check(
    'ID 060 - botao Hoje volta para data atual sem redirecionar',
    /Hoje/i.test(todayHeading) && todayText.includes(`060 Hoje tarefa ${unique}`) && page.url().endsWith('/today'),
    `heading=${todayHeading}; list=${todayText}`,
  )

  const todayRow = page.locator('.today-v3-layout .row').filter({ hasText: `060 Hoje tarefa ${unique}` })
  await todayRow.click()
  await page.waitForTimeout(700)
  const panel = await page.evaluate((title) => ({
    detailCount: document.querySelectorAll('.today-v3-layout .detail').length,
    panelText: document.querySelector('.today-v3-layout .detail')?.textContent ?? '',
    hasTitle: document.querySelector('.today-v3-layout .detail')?.textContent?.includes(title) ?? false,
  }), `060 Hoje tarefa ${unique}`)
  await screenshot(page, '05-today-selected-detail-panel.png')
  check('ID 082 - selecionar item abre painel direito com detalhes', panel.detailCount === 1 && panel.hasTitle, JSON.stringify(panel))

  await page.getByLabel('Fechar painel').click()
  await page.waitForTimeout(500)
  const afterClose = await page.evaluate(() => ({
    detailCount: document.querySelectorAll('.today-v3-layout .detail').length,
    emptyText: document.body.textContent?.includes('Selecione um item para ver os detalhes.') ?? false,
  }))
  await screenshot(page, '06-today-detail-closed.png')
  check('ID 082 - fechar painel oculta coluna de detalhes', afterClose.detailCount === 0 && !afterClose.emptyText, JSON.stringify(afterClose))
}

async function validateFolders(page, unique, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas`)
  await page.waitForLoadState('networkidle')

  const nav = page.locator('.doit-folder-browser aside').filter({ hasText: 'Todas' }).first()
  const expandButton = nav.getByRole('button', { name: 'Expandir todas as subpastas' })
  const hasExpand = await expandButton.isVisible()
  check('ID 084 - botao Expandir tudo aparece na lista lateral de Pastas', hasExpand)

  await expandButton.click()
  await page.waitForTimeout(500)
  const expandedText = (await nav.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, '07-folders-expanded-all.png')
  check(
    'ID 084 - Expandir tudo revela todas as subpastas',
    expandedText.includes(data.childFolder.name) && expandedText.includes(data.grandChildFolder.name),
    expandedText,
  )

  const collapseButton = nav.getByRole('button', { name: 'Recolher todas as subpastas' })
  await collapseButton.click()
  await page.waitForTimeout(500)
  const collapsedText = (await nav.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, '08-folders-collapsed-all.png')
  check(
    'ID 084 - Recolher tudo oculta subpastas',
    !collapsedText.includes(data.childFolder.name) && !collapsedText.includes(data.grandChildFolder.name),
    collapsedText,
  )

  const rootRow = nav.locator('div').filter({ hasText: data.rootFolder.name }).first()
  await rootRow.getByRole('button', { name: 'Expandir', exact: true }).click()
  await page.waitForTimeout(500)
  const individualText = (await nav.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, '09-folders-individual-expand-after-toggle-all.png')
  check(
    'ID 084 - expansao individual continua funcionando depois do toggle geral',
    individualText.includes(data.childFolder.name),
    individualText,
  )
}

async function validateMobile(page, unique, data) {
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  const todayMobile = await page.evaluate(() => ({
    detailCount: document.querySelectorAll('.today-v3-layout .detail').length,
    emptyText: document.body.textContent?.includes('Selecione um item para ver os detalhes.') ?? false,
    columns: getComputedStyle(document.querySelector('.today-v3-layout .board')).gridTemplateColumns,
  }))
  await screenshot(page, '10-today-mobile-no-empty-panel.png')
  check(
    'Mobile - Hoje preserva layout sem painel vazio',
    todayMobile.detailCount === 0 && !todayMobile.emptyText && todayMobile.columns.split(' ').filter(Boolean).length === 1,
    JSON.stringify(todayMobile),
  )

  await page.goto(`${BASE}/notas?folder=${data.rootFolder.id}`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Abrir navegador de pastas').click()
  await page.waitForTimeout(500)
  const drawer = page.locator('[role="dialog"]').filter({ hasText: 'Todas' }).first()
  const expandButton = drawer.getByRole('button', { name: 'Expandir todas as subpastas' })
  await expandButton.click()
  await page.waitForTimeout(500)
  const expandedText = (await drawer.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, '11-folders-mobile-expanded-all.png')
  check(
    'Mobile - Pastas permite expandir tudo no drawer',
    expandedText.includes(data.childFolder.name) && expandedText.includes(data.grandChildFolder.name),
    expandedText,
  )
}

ensureDirs()

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: DESKTOP })
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const data = await seed(page, unique)
  await validateToday(page, unique, data)
  await validateFolders(page, unique, data)
  await validateMobile(page, unique, data)
  const failed = results.filter((r) => !r.ok)
  fs.writeFileSync(path.join(OUT, 'resultados-060-082-083-084.json'), JSON.stringify(results, null, 2))
  if (failed.length > 0) throw new Error(`Failed checks: ${failed.map((r) => r.name).join('; ')}`)
} finally {
  await browser.close()
}
