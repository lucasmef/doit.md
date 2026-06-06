import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3400'
const OUT = 'specs/artifacts/2026-06-06-corrigir-100-123-editor-calendario-mobile'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
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
  const unique = `qa-100-123-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 100 123')
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

async function patch(page, url, body) {
  const response = await page.request.patch(`${BASE}${url}`, { data: body, timeout: 90000 })
  if (!response.ok()) throw new Error(`${url}: ${response.status()} ${await response.text()}`)
  return response.json()
}

async function getItems(page) {
  const response = await page.request.get(`${BASE}/api/items`, { timeout: 90000 })
  if (!response.ok()) throw new Error(`/api/items: ${response.status()}`)
  return (await response.json()).items ?? []
}

async function getArchivedItems(page) {
  const response = await page.request.get(`${BASE}/api/items?status=archived`, { timeout: 90000 })
  if (!response.ok()) throw new Error(`/api/items?status=archived: ${response.status()}`)
  return (await response.json()).items ?? []
}

function dateKey(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function mockCalendar(page) {
  const today = dateKey()
  await page.route('**/api/calendar/calendars', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        calendars: [
          { id: 'qa-calendar', summary: 'QA Calendar', primary: true, backgroundColor: '#2F6BFF' },
        ],
      }),
    }),
  )
  await page.route('**/api/calendar/events**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: 'qa-all-day',
            title: 'Evento dia todo QA',
            description: '',
            start: today,
            end: dateKey(1),
            allDay: true,
            source: 'google',
            googleCalendarId: 'qa-calendar',
            googleEventId: 'qa-all-day-google',
            linkedItemIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'qa-timed',
            title: 'Evento horario QA',
            description: '',
            start: `${today}T23:00:00`,
            end: `${today}T23:30:00`,
            allDay: false,
            source: 'google',
            googleCalendarId: 'qa-calendar',
            googleEventId: 'qa-timed-google',
            linkedItemIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    }),
  )
}

async function validateEditorAndShortcuts(page, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas/${data.note.id}`)
  await page.waitForLoadState('networkidle')
  const editor = page.locator('.doit-note-sheet-prose')
  await editor.click()
  await page.keyboard.press('Control+1')
  await page.waitForTimeout(150)
  check('ID 100 - Ctrl+1 aplica H1', (await editor.locator('h1').count()) > 0)
  await page.keyboard.press('Control+2')
  check('ID 100 - Ctrl+2 aplica H2', (await editor.locator('h2').count()) > 0)
  await page.keyboard.press('Control+3')
  check('ID 100 - Ctrl+3 aplica H3', (await editor.locator('h3').count()) > 0)

  const historyButton = page.getByRole('button', { name: 'Historico' })
  check('ID 121 - editor novo expoe historico', (await historyButton.count()) === 1)
  await historyButton.click()
  check(
    'ID 121 - historico lista versoes',
    (await page.locator('text=/Recolher|Nenhuma versao|Conteudo/').count()) > 0,
  )
  await historyButton.click()
  await page.keyboard.press('Shift+3')
  await page.waitForURL('**/notas', { timeout: 10000 })
  const archived = (await getArchivedItems(page)).find((item) => item.id === data.note.id)
  check(
    'ID 101 - Shift+# arquiva nota sem excluir conteudo',
    archived?.status === 'archived' && archived?.contentMd,
    archived?.status,
  )

  await page.goto(`${BASE}/notas?folder=${data.folder.id}`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('w')
  await page.waitForURL('**/notas/**', { timeout: 10000 })
  const createdId = page.url().split('/notas/')[1]?.split(/[?#]/)[0]
  const created = (await getItems(page)).find((item) => item.id === createdId)
  check(
    'ID 123 - W cria nota na pasta atual',
    created?.folderId === data.folder.id,
    created?.folderId,
  )

  await page.goto(`${BASE}/calendar`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('g')
  await page.keyboard.press('i')
  await page.waitForURL('**/inbox', { timeout: 10000 })
  check('ID 120 - sequencia g i abre Inbox', page.url().endsWith('/inbox'))
  await page.keyboard.press('g')
  await page.keyboard.press('h')
  await page.waitForURL('**/today', { timeout: 10000 })
  check('ID 120 - sequencia g h abre Hoje', page.url().endsWith('/today'))
  const search = page.locator('input[placeholder="Buscar itens, notas..."]')
  await search.fill('g')
  const before = page.url()
  await page.keyboard.press('g')
  await page.keyboard.press('i')
  await page.waitForTimeout(300)
  check('ID 120 - sequencia nao dispara em input', page.url() === before)
}

async function validateMobileEditor(page, data) {
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas/${data.mobileNote.id}`)
  await page.waitForLoadState('networkidle')

  const metrics = await page.evaluate(() => ({
    breadcrumbVisible: [...document.querySelectorAll('nav')].some((node) => {
      const style = getComputedStyle(node)
      return style.display !== 'none' && node.textContent?.includes('notas')
    }),
    archive: Boolean(document.querySelector('button[aria-label="Arquivar nota"]')),
    attachments: Boolean(document.querySelector('button[aria-label="Anexos"]')),
    folderHeight:
      document.querySelector('select[aria-label="Editar pasta da nota"]')?.getBoundingClientRect()
        .height ?? 0,
    viewportOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))
  check(
    'IDs 110/112/114 - cabecalho mobile compacto e com arquivar',
    !metrics.breadcrumbVisible && metrics.archive && metrics.folderHeight <= 34,
    JSON.stringify(metrics),
  )
  check('ID 111 - anexos usam icone unico no topo', metrics.attachments)

  await page.getByRole('button', { name: 'Anexos' }).click()
  check(
    'ID 111 - galeria de anexos aparece abaixo',
    await page.locator('#note-editor-mobile-attachments').isVisible(),
  )

  const emptyLine = page.locator('.doit-note-sheet-prose p').last()
  await emptyLine.dblclick()
  const pasteTarget = await page.evaluate(() => ({
    active: document.activeElement?.classList.contains('ProseMirror') ?? false,
    selectionInside: Boolean(
      window.getSelection()?.anchorNode?.parentElement?.closest('.ProseMirror'),
    ),
  }))
  check(
    'ID 113 - linha vazia aceita foco/selecao para colar',
    pasteTarget.active || pasteTarget.selectionInside,
    JSON.stringify(pasteTarget),
  )
  check('IDs 109/110/114 - editor mobile sem overflow horizontal', !metrics.viewportOverflow)
  await shot(page, '01-doitmd-editor-mobile-2026-06-06.png')

  await page.emulateMedia({ media: 'print' })
  const printState = await page.evaluate(() => ({
    content: getComputedStyle(document.querySelector('.note-print-content')).visibility,
    topbar: getComputedStyle(document.querySelector('.note-editor-main > div')).visibility,
  }))
  check(
    'ID 116 - impressao mostra conteudo e oculta interface',
    printState.content === 'visible' && printState.topbar === 'hidden',
    JSON.stringify(printState),
  )
  await page.emulateMedia({ media: 'screen' })
}

async function validateInboxAndContextMenu(page, data) {
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/inbox`)
  await page.waitForLoadState('networkidle')
  const row = page.getByText(data.longTitle, { exact: true })
  const overflow = await row.evaluate((node) => {
    const card = node.closest('[data-item-id]')
    return {
      page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      card: card ? card.scrollWidth > card.clientWidth : true,
      lines: Math.round(
        node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight),
      ),
    }
  })
  check(
    'ID 109 - texto longo respeita card mobile',
    !overflow.page && !overflow.card && overflow.lines > 1,
    JSON.stringify(overflow),
  )
  await shot(page, '02-doitmd-inbox-texto-longo-2026-06-06.png')

  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/inbox`)
  await page.waitForLoadState('networkidle')
  const itemRow = page.locator(`[data-item-id="${data.contextItem.id}"]`)
  await itemRow.click({ button: 'right' })
  await page.getByText('Mover para pasta', { exact: true }).click()
  const scroller = page.locator('.max-h-64.overflow-y-auto')
  await scroller.evaluate((node) => node.scrollTo(0, node.scrollHeight))
  check('ID 122 - scroll nao fecha seletor de pasta', await scroller.isVisible())
  await scroller.getByText(data.lastFolder.name, { exact: true }).click()
  await page.waitForTimeout(500)
  const moved = (await getItems(page)).find((item) => item.id === data.contextItem.id)
  check(
    'ID 122 - pasta muda pelo menu de contexto',
    moved?.folderId === data.lastFolder.id,
    moved?.folderId,
  )
}

async function validateCalendarAndToday(page, data) {
  await mockCalendar(page)
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/calendar`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Escolher calendarios visiveis' }).click()
  const menuBox = await page.locator('div.fixed.inset-x-3.top-20').boundingBox()
  check(
    'ID 117 - seletor mobile fica dentro da viewport',
    Boolean(
      menuBox &&
      menuBox.x >= 0 &&
      menuBox.x + menuBox.width <= MOBILE.width &&
      menuBox.y + menuBox.height <= MOBILE.height,
    ),
    JSON.stringify(menuBox),
  )
  await page.getByRole('button', { name: /Notas ON/ }).click()
  await page.getByRole('button', { name: /Tarefas ON/ }).click()
  await page.locator('button[aria-hidden="true"]').click({ force: true })
  await page.reload()
  await page.waitForLoadState('networkidle')
  const filterState = await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('doit:preferences') ?? '{}')
    return { notes: value.showCalendarNotes, tasks: value.showCalendarTasks }
  })
  const eventVisible = await page
    .getByText('Evento dia todo QA', { exact: true })
    .isVisible()
    .catch(() => false)
  const noteVisible = await page
    .getByText(data.calendarNote.title, { exact: true })
    .isVisible()
    .catch(() => false)
  const taskVisible = await page
    .getByText(data.calendarTask.title, { exact: true })
    .isVisible()
    .catch(() => false)
  check(
    'ID 119 - filtros persistem e deixam somente eventos',
    eventVisible &&
      !noteVisible &&
      !taskVisible &&
      filterState.notes === false &&
      filterState.tasks === false,
    JSON.stringify({ eventVisible, noteVisible, taskVisible, filterState }),
  )
  await page.getByRole('button', { name: 'Escolher calendarios visiveis' }).click()
  await shot(page, '03-doitmd-calendario-filtros-mobile-2026-06-06.png')

  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  const allDayRow = page.locator('article').filter({ hasText: 'Evento dia todo QA' })
  const allDayText = await allDayRow.innerText()
  const allDayClass = await allDayRow.getAttribute('class')
  check(
    'ID 118 - evento de dia todo mostra Dia todo',
    allDayText.includes('Dia todo'),
    allDayText.replace(/\s+/g, ' '),
  )
  check(
    'ID 118 - evento de dia todo nao fica esmaecido',
    !allDayClass?.split(/\s+/).includes('done'),
    allDayClass ?? '',
  )
  await shot(page, '04-doitmd-hoje-evento-dia-todo-2026-06-06.png')
}

async function validateRegressions(page, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas?folder=${data.regressionFolder.id}`)
  await page.waitForLoadState('networkidle')
  const task = page.getByText(data.regressionTask.title, { exact: true })
  const row = page.locator('button').filter({ hasText: data.regressionTask.title }).first()
  await row.locator('[role="button"]').first().click()
  await page.waitForTimeout(400)
  check('ID 073 - concluida ainda aparece durante feedback', await task.isVisible())
  await page.waitForTimeout(1800)
  check('ID 073 - concluida some apos feedback', !(await task.isVisible().catch(() => false)))

  await page.keyboard.press('q')
  const input = page.locator('input[placeholder*="amanh"], textarea[placeholder*="amanh"]').first()
  await input.fill('Regressao proxima semana')
  await page.waitForTimeout(350)
  const expected = (() => {
    const now = new Date()
    const day = now.getDay()
    const add = day === 0 ? 1 : 8 - day
    now.setDate(now.getDate() + add)
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`
  })()
  check(
    'ID 074 - proxima semana continua na proxima segunda',
    (await page.locator('body').innerText()).includes(expected),
    expected,
  )
}

ensureDirs()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true })
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const folder = (await post(page, '/api/folders', { name: `Pasta W ${unique}` })).folder
  const folders = []
  for (let index = 0; index < 18; index += 1) {
    folders.push(
      (
        await post(page, '/api/folders', {
          name: `Destino ${String(index).padStart(2, '0')} ${unique}`,
        })
      ).folder,
    )
  }
  const note = (
    await post(page, '/api/items', {
      title: `Nota atalhos ${unique}`,
      complexity: 'note',
      status: 'todo',
      contentMd: `Nota atalhos ${unique}\n\nConteudo original`,
    })
  ).item
  await patch(page, `/api/items/${note.id}`, {
    contentMd: `Nota atalhos ${unique}\n\nConteudo versao dois`,
  })
  const mobileNote = (
    await post(page, '/api/items', {
      title: `Nota mobile ${unique}`,
      complexity: 'note',
      status: 'todo',
      contentMd: `Nota mobile ${unique}\n\nLinha preenchida\n\n`,
    })
  ).item
  const longTitle = `Texto muito longo ${unique} ${'semquebra'.repeat(24)} final`
  await post(page, '/api/items', { title: longTitle, complexity: 'task', status: 'inbox' })
  const contextItem = (
    await post(page, '/api/items', {
      title: `Mover contexto ${unique}`,
      complexity: 'task',
      status: 'inbox',
    })
  ).item
  const calendarNote = (
    await post(page, '/api/items', {
      title: `Nota calendario ${unique}`,
      complexity: 'note',
      status: 'todo',
      dueDate: dateKey(),
    })
  ).item
  const calendarTask = (
    await post(page, '/api/items', {
      title: `Tarefa calendario ${unique}`,
      complexity: 'task',
      status: 'todo',
      dueDate: dateKey(),
    })
  ).item
  const regressionFolder = (await post(page, '/api/folders', { name: `Regressoes ${unique}` }))
    .folder
  const regressionTask = (
    await post(page, '/api/items', {
      title: `Tarefa 073 ${unique}`,
      complexity: 'task',
      status: 'todo',
      folderId: regressionFolder.id,
    })
  ).item
  const data = {
    folder,
    lastFolder: folders.at(-1),
    note,
    mobileNote,
    longTitle,
    contextItem,
    calendarNote,
    calendarTask,
    regressionFolder,
    regressionTask,
  }

  await validateEditorAndShortcuts(page, data)
  await validateMobileEditor(page, data)
  await validateInboxAndContextMenu(page, data)
  await validateCalendarAndToday(page, data)
  await validateRegressions(page, data)

  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.ok)
  if (failed.length) throw new Error(`Failed: ${failed.map((result) => result.name).join('; ')}`)
} finally {
  await browser.close()
}
