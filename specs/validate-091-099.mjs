import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3300'
const OUT = 'specs/artifacts/2026-06-04-corrigir-091-099-atalhos-calendario-notas'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const results = []

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoAt(date, hour, minute = 0) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
}

function log(...args) {
  console.log('[validate-091-099]', ...args)
}

function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
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
  await page.screenshot({ path: dest, fullPage: false })
  copyToGlobal(dest, file)
  log(`Saved screenshot: ${dest}`)
}

async function signUp(page) {
  const unique = `qa-091-099-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 091 099')
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

async function getItems(page) {
  const res = await page.request.get(`${BASE}/api/items`)
  if (!res.ok()) throw new Error(`/api/items -> ${res.status()} ${await res.text()}`)
  const data = await res.json()
  return data.items ?? []
}

async function seed(page, unique) {
  const today = todayKey()
  const folder = (await post(page, '/api/folders', { name: `Mobile Meta ${unique}` })).folder
  const noteToday = (await post(page, '/api/items', {
    title: `# Nota Hoje ${unique}`,
    complexity: 'note',
    status: 'todo',
    dueDate: today,
    contentMd: `# Nota Hoje ${unique}\n\nConteudo da nota no editor novo.`,
  })).item
  const noteMobile = (await post(page, '/api/items', {
    title: `# Nota Mobile ${unique}`,
    complexity: 'note',
    status: 'todo',
    contentMd: `# Nota Mobile ${unique}\n\nValidacao mobile.`,
  })).item
  const inboxEvent = (await post(page, '/api/items', {
    title: `Evento inbox ${unique}`,
    complexity: 'capture',
    status: 'inbox',
    contentMd: 'Evento capturado no inbox',
  })).item
  const calendarTask = (await post(page, '/api/items', {
    title: `Tarefa calendario ${unique}`,
    complexity: 'task',
    status: 'todo',
    dueDate: today,
  })).item
  return { today, folder, noteToday, noteMobile, inboxEvent, calendarTask }
}

async function mockCalendars(page, today) {
  const events = [
    {
      id: 'cal-a-event',
      userId: 'qa',
      title: 'Evento Azul QA',
      description: '',
      start: isoAt(today, 10),
      end: isoAt(today, 11),
      allDay: false,
      source: 'google',
      googleCalendarId: 'cal-a',
      googleEventId: 'g-a',
      linkedItemIds: [],
      createdAt: isoAt(today, 0),
      updatedAt: isoAt(today, 0),
    },
    {
      id: 'cal-b-event',
      userId: 'qa',
      title: 'Evento Verde QA',
      description: '',
      start: isoAt(today, 14),
      end: isoAt(today, 15),
      allDay: false,
      source: 'google',
      googleCalendarId: 'cal-b',
      googleEventId: 'g-b',
      linkedItemIds: [],
      createdAt: isoAt(today, 0),
      updatedAt: isoAt(today, 0),
    },
  ]
  await page.route('**/api/calendar/calendars', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        calendars: [
          { id: 'cal-a', summary: 'QA Azul', primary: true, backgroundColor: '#2F6BFF' },
          { id: 'cal-b', summary: 'QA Verde', primary: false, backgroundColor: '#28C7B7' },
        ],
      }),
    })
  })
  await page.route('**/api/calendar/events**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ events }),
    })
  })
}

async function validateShortcutW(page) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('w')
  await page.waitForURL('**/notas/**', { timeout: 15000 })
  const firstUrl = page.url()
  const hasNewEditor = await page.locator('.doit-note-sheet-prose').count()
  const hasOldModal = await page.locator('[aria-modal="true"]').count()
  await screenshot(page, '01-doitmd-shortcut-w-editor-2026-06-04.png')
  check('ID 091 - W abre editor novo de notas em tela cheia', firstUrl.includes('/notas/') && hasNewEditor > 0 && hasOldModal === 0, firstUrl)

  const before = (await getItems(page)).filter((item) => item.complexity === 'note').length
  await page.locator('.doit-note-sheet-prose').click()
  await page.keyboard.press('w')
  await page.waitForTimeout(700)
  const after = (await getItems(page)).filter((item) => item.complexity === 'note').length
  check('ID 091 - W dentro do editor nao cria nova nota', before === after, `before=${before}; after=${after}`)

  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="Buscar itens, notas..."]', 'w')
  const urlBeforeInput = page.url()
  await page.keyboard.press('w')
  await page.waitForTimeout(500)
  check('ID 091 - W dentro de input nao dispara atalho', page.url() === urlBeforeInput, page.url())
}

async function validateTodayAndMobileNote(page, data, unique) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.getByText(`Nota Hoje ${unique}`).click()
  await page.waitForURL(`**/notas/${data.noteToday.id}`, { timeout: 15000 })
  await screenshot(page, '02-doitmd-today-note-new-editor-2026-06-04.png')
  check('ID 097 - nota aberta pela pagina Hoje usa editor novo', page.url().includes(`/notas/${data.noteToday.id}`))

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas/${data.noteMobile.id}`)
  await page.waitForLoadState('networkidle')
  const mobileControls = await page.evaluate(() => ({
    hasAttachments: [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Anexos')),
    hasFolder: Boolean(document.querySelector('select[aria-label="Editar pasta da nota"]')),
    hasDate: Boolean(document.querySelector('input[aria-label="Editar data da nota"]')),
  }))
  await page.getByRole('button', { name: 'Anexos' }).click()
  await page.selectOption('select[aria-label="Editar pasta da nota"]', data.folder.id)
  await page.fill('input[aria-label="Editar data da nota"]', data.today)
  await page.waitForTimeout(800)
  const updated = (await getItems(page)).find((item) => item.id === data.noteMobile.id)
  await screenshot(page, '03-doitmd-note-mobile-actions-2026-06-04.png')
  check('ID 098 - editor novo mobile expoe anexos, pasta e data', mobileControls.hasAttachments && mobileControls.hasFolder && mobileControls.hasDate, JSON.stringify(mobileControls))
  check('ID 098 - editor novo mobile altera pasta e data', updated?.folderId === data.folder.id && updated?.dueDate === data.today, JSON.stringify({ folderId: updated?.folderId, dueDate: updated?.dueDate }))
}

async function validateQuickCaptureExpand(page, unique) {
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.locator('button[aria-label="Abrir menu"]').click()
  await page.getByText('Novo item').click()
  await page.getByLabel('Capturar nota').click()
  await page.fill('input[placeholder="Escreva uma nota..."]', `# Nota expandir ${unique}`)
  await page.locator('button[aria-label="Expandir"]').click()
  await page.waitForURL('**/notas/**', { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  const hasEditor = await page.locator('[data-note-scroll-container="true"]').count()
  await screenshot(page, '04-doitmd-quick-note-expand-editor-2026-06-04.png')
  check('ID 099 - expandir nota compacta abre editor novo direto', page.url().includes('/notas/') && hasEditor > 0, page.url())
}

async function validateCalendar(page, data) {
  await mockCalendars(page, data.today)
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/calendar`)
  await page.waitForLoadState('networkidle')
  const headerText = await page.evaluate(() => {
    const title = document.querySelector('h2')
    return title?.parentElement?.innerText ?? ''
  })
  check('ID 093 - topo desktop nao exibe Semana X', !/SEMANA\s+\d+/i.test(headerText), headerText.replace(/\s+/g, ' '))

  await page.locator('button[aria-label="Escolher calendarios visiveis"]').click()
  await page.waitForTimeout(300)
  await screenshot(page, '05-doitmd-calendar-visible-menu-desktop-2026-06-04.png')
  const menuText = await page.locator('body').innerText()
  check('ID 092 - calendario tem menu sanduiche com calendarios visiveis', menuText.includes('QA Azul') && menuText.includes('QA Verde'))

  await page.getByText('QA Azul').click()
  await page.waitForTimeout(600)
  const afterHide = await page.locator('body').innerText()
  check('ID 092 - ocultar calendario remove eventos daquele calendario', !afterHide.includes('Evento Azul QA') && afterHide.includes('Evento Verde QA'))

  await page.reload()
  await page.waitForLoadState('networkidle')
  const afterReload = await page.locator('body').innerText()
  check('ID 092 - selecao de calendarios persiste ao reabrir', !afterReload.includes('Evento Azul QA') && afterReload.includes('Evento Verde QA'))

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/calendar`)
  await page.waitForLoadState('networkidle')
  const mobileText = await page.locator('body').innerText()
  check('ID 093 - topo mobile nao exibe Semana X', !/SEMANA\s+\d+/i.test(mobileText))
  await page.getByText('Evento Verde QA').click()
  await page.waitForTimeout(500)
  const dayPopupText = await page.locator('body').innerText()
  await screenshot(page, '06-doitmd-calendar-mobile-day-list-2026-06-04.png')
  check('ID 094 - clique em evento no mes mobile abre lista do dia', /eventos do dia/i.test(dayPopupText) && dayPopupText.includes('Evento Verde QA') && dayPopupText.includes('Tarefa calendario'))

  await page.locator('button[aria-label="Fechar eventos do dia"]').click()
  await page.locator('button[aria-label="Abrir menu"]').click()
  await page.waitForTimeout(300)
  const panelBg = await page.evaluate(() => {
    const panel = document.querySelector('.absolute.inset-y-3.left-3')
    return panel ? getComputedStyle(panel).backgroundColor : ''
  })
  await screenshot(page, '07-doitmd-mobile-menu-opaque-2026-06-04.png')
  check('ID 095 - menu sanduiche mobile tem fundo opaco legivel', /rgba?\(255,\s*255,\s*255(?:,\s*0\.9[0-9]+|,\s*1)?\)/.test(panelBg) || panelBg === 'rgb(255, 255, 255)', panelBg)
}

async function validateInboxCompletion(page, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/inbox`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel(`Concluir ${data.inboxEvent.title}`).click()
  await page.waitForTimeout(400)
  const immediateVisible = await page.getByText(data.inboxEvent.title).count()
  const immediateDone = await page.evaluate((title) => {
    const row = [...document.querySelectorAll('[data-item-id]')]
      .find((el) => el.textContent?.includes(title))
    return Boolean(row?.querySelector('svg path[d="M2 6l3 3 5-5"]'))
  }, data.inboxEvent.title)
  await screenshot(page, '08-doitmd-inbox-completion-delay-desktop-2026-06-04.png')
  await page.waitForTimeout(2200)
  const laterVisible = await page.getByText(data.inboxEvent.title).count()
  check('ID 096 - concluir evento/captura no Inbox mostra concluido antes de sumir', immediateVisible > 0 && immediateDone && laterVisible === 0, `immediate=${immediateVisible}; later=${laterVisible}`)
}

async function main() {
  ensureDirs()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: DESKTOP })
  try {
    const unique = await signUp(page)
    const data = await seed(page, unique)
    await validateShortcutW(page)
    await validateTodayAndMobileNote(page, data, unique)
    await validateQuickCaptureExpand(page, unique)
    await validateCalendar(page, data)
    await validateInboxCompletion(page, data)
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

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
