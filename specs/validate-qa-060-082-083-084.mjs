import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3300'
const OUT = 'specs/artifacts/2026-06-02-validar-060-082-083-084'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

const results = []

function log(...args) {
  console.log('[qa-060-082-083-084]', ...args)
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
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

async function screenshot(page, file) {
  const dest = path.join(OUT, file)
  await page.screenshot({ path: dest, fullPage: false })
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

  await post(page, '/api/items', { title: `060 Inbox solto ${unique}`, complexity: 'task', status: 'inbox', tags: ['qa060'] })
  await post(page, '/api/items', { title: `060 Inbox com data ${unique}`, complexity: 'task', status: 'inbox', dueDate: future, tags: ['qa060'] })
  await post(page, '/api/items', { title: `060 Inbox com pasta ${unique}`, complexity: 'task', status: 'inbox', folderId: rootFolder.id, tags: ['qa060'] })
  await post(page, '/api/items', { title: `060 Hoje tarefa ${unique}`, complexity: 'task', status: 'todo', dueDate: today, tags: ['qa060'] })
  await post(page, '/api/items', { title: `060 Futuro tarefa ${unique}`, complexity: 'task', status: 'todo', dueDate: future, dueTime: '09:30', tags: ['qa060'] })

  return { today, future, rootFolder, childFolder, grandChildFolder }
}

async function centeredListText(page) {
  return (await page.locator('.today-v3-layout .center .list').innerText()).replace(/\s+/g, ' ')
}

async function validateTodayDesktop(page, unique, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')

  // --- ID 082 (abrir sem painel) + ID 083 (sem botao Hoje no calendario) ---
  const initial = await page.evaluate(() => ({
    detailCount: document.querySelectorAll('.today-v3-layout .detail').length,
    emptyText: document.body.textContent?.includes('Selecione um item para ver os detalhes.') ?? false,
    calendarTitleText: document.querySelector('.today-v3-layout .calendar-title')?.textContent?.trim() ?? '',
    // qualquer botao dentro do bloco do calendario lateral, fora da grade de dias
    calButtonsOutsideDays: Array.from(
      document.querySelectorAll('.today-v3-layout .calendar .calendar-title button, .today-v3-layout .calendar > button'),
    ).map((b) => b.textContent?.trim() ?? ''),
  }))
  await screenshot(page, 'ID082-hoje-sem-painel-desktop.png')
  await screenshot(page, 'ID083-calendario-sem-botao-hoje-desktop.png')
  check('ID082-abrir-sem-painel', initial.detailCount === 0 && !initial.emptyText, JSON.stringify(initial))
  check(
    'ID083-sem-botao-hoje-no-calendario',
    initial.calButtonsOutsideDays.length === 0 && !/\bHoje\b/i.test(initial.calendarTitleText),
    JSON.stringify(initial),
  )

  // --- ID 060 Inbox ---
  await page.locator('.today-v3-layout .sidebar-list .side-row').filter({ hasText: 'Inbox' }).click()
  await page.waitForTimeout(700)
  const inboxText = await centeredListText(page)
  await screenshot(page, 'ID060-hoje-inbox-desktop.png')
  check(
    'ID060-inbox-so-sem-data-sem-pasta',
    inboxText.includes(`060 Inbox solto ${unique}`) &&
      !inboxText.includes(`060 Inbox com data ${unique}`) &&
      !inboxText.includes(`060 Inbox com pasta ${unique}`) &&
      page.url().endsWith('/today'),
    inboxText,
  )

  // --- ID 060 Proximos ---
  await page.locator('.today-v3-layout .sidebar-list .side-row').filter({ hasText: /Pr[oó]ximos/ }).click()
  await page.waitForTimeout(700)
  const upcomingRow = page.locator('.today-v3-layout .row').filter({ hasText: `060 Futuro tarefa ${unique}` })
  const upcomingText = (await upcomingRow.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, 'ID060-hoje-proximos-desktop.png')
  check(
    'ID060-proximos-com-data-visivel',
    upcomingText.includes(`060 Futuro tarefa ${unique}`) && upcomingText.includes(dateLabel(data.future)) && page.url().endsWith('/today'),
    upcomingText,
  )

  // --- ID 083 clicar em outro dia funciona ---
  // escolhe um dia do mes diferente de hoje na grade do mini-calendario
  const otherDay = page.locator('.today-v3-layout .calendar .days .day:not(.out)').first()
  await otherDay.click()
  await page.waitForTimeout(500)
  const afterOtherDay = await page.evaluate(() => ({
    activeDays: document.querySelectorAll('.today-v3-layout .calendar .days .day.active').length,
    url: location.pathname,
  }))
  check('ID083-clicar-outro-dia-funciona', afterOtherDay.activeDays === 1 && afterOtherDay.url.endsWith('/today'), JSON.stringify(afterOtherDay))

  // --- ID 060 / ID083 voltar para Hoje pelo menu lateral ---
  await page.locator('.today-v3-layout .sidebar-list .side-row').filter({ hasText: 'Hoje' }).click()
  await page.waitForTimeout(700)
  const todayHeading = await page.locator('.today-v3-layout .center-head h1').innerText()
  const todayText = await centeredListText(page)
  await screenshot(page, 'ID060-hoje-voltar-hoje-desktop.png')
  check(
    'ID060-hoje-volta-data-atual',
    /Hoje/i.test(todayHeading) && todayText.includes(`060 Hoje tarefa ${unique}`) && page.url().endsWith('/today'),
    `heading=${todayHeading}; list=${todayText}`,
  )

  // --- ID 082 selecionar abre painel ---
  await page.locator('.today-v3-layout .row').filter({ hasText: `060 Hoje tarefa ${unique}` }).click()
  await page.waitForTimeout(700)
  const panel = await page.evaluate((title) => ({
    detailCount: document.querySelectorAll('.today-v3-layout .detail').length,
    hasTitle: document.querySelector('.today-v3-layout .detail')?.textContent?.includes(title) ?? false,
  }), `060 Hoje tarefa ${unique}`)
  await screenshot(page, 'ID082-hoje-painel-aberto-desktop.png')
  check('ID082-selecionar-abre-painel', panel.detailCount === 1 && panel.hasTitle, JSON.stringify(panel))

  // --- ID 082 fechar oculta painel ---
  await page.getByLabel('Fechar painel').click()
  await page.waitForTimeout(500)
  const afterClose = await page.evaluate(() => ({
    detailCount: document.querySelectorAll('.today-v3-layout .detail').length,
    emptyText: document.body.textContent?.includes('Selecione um item para ver os detalhes.') ?? false,
  }))
  await screenshot(page, 'ID082-hoje-painel-fechado-desktop.png')
  check('ID082-fechar-oculta-painel', afterClose.detailCount === 0 && !afterClose.emptyText, JSON.stringify(afterClose))
}

async function validateFoldersDesktop(page, unique, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas`)
  await page.waitForLoadState('networkidle')

  const nav = page.locator('.doit-folder-browser aside').filter({ hasText: 'Todas' }).first()
  const expandButton = nav.getByRole('button', { name: 'Expandir todas as subpastas' })
  const hasExpand = await expandButton.isVisible()
  check('ID084-controle-aparece-na-lista', hasExpand)

  await expandButton.click()
  await page.waitForTimeout(500)
  const expandedText = (await nav.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, 'ID084-pastas-expandir-tudo-desktop.png')
  check(
    'ID084-expandir-revela-subpastas',
    expandedText.includes(data.childFolder.name) && expandedText.includes(data.grandChildFolder.name),
    expandedText,
  )

  const collapseButton = nav.getByRole('button', { name: 'Recolher todas as subpastas' })
  await collapseButton.click()
  await page.waitForTimeout(500)
  const collapsedText = (await nav.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, 'ID084-pastas-recolher-tudo-desktop.png')
  check(
    'ID084-recolher-oculta-subpastas',
    !collapsedText.includes(data.childFolder.name) && !collapsedText.includes(data.grandChildFolder.name),
    collapsedText,
  )

  const rootRow = nav.locator('div').filter({ hasText: data.rootFolder.name }).first()
  await rootRow.getByRole('button', { name: 'Expandir', exact: true }).click()
  await page.waitForTimeout(500)
  const individualText = (await nav.innerText()).replace(/\s+/g, ' ')
  await screenshot(page, 'ID084-pastas-expansao-individual-desktop.png')
  check('ID084-toggle-individual-funciona', individualText.includes(data.childFolder.name), individualText)
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
  await screenshot(page, 'ID082-hoje-sem-painel-mobile.png')
  check(
    'ID082-mobile-sem-painel-vazio',
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
  await screenshot(page, 'ID084-pastas-expandir-tudo-mobile.png')
  check(
    'ID084-mobile-expandir-no-drawer',
    expandedText.includes(data.childFolder.name) && expandedText.includes(data.grandChildFolder.name),
    expandedText,
  )
}

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: DESKTOP })
const page = await context.newPage()

let fatal = null
try {
  const unique = await signUp(page)
  const data = await seed(page, unique)
  await validateTodayDesktop(page, unique, data)
  await validateFoldersDesktop(page, unique, data)
  await validateMobile(page, unique, data)
} catch (err) {
  fatal = err
  log(`FATAL: ${err.message}`)
} finally {
  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify({ results, fatal: fatal?.message ?? null }, null, 2))
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
log(`TOTAL ${results.length} | PASS ${results.length - failed.length} | FAIL ${failed.length}`)
if (fatal) process.exitCode = 2
else if (failed.length > 0) process.exitCode = 1
