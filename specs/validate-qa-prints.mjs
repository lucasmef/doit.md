import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3400'
const OUT = 'specs/artifacts/2026-06-06-validar-100-123-qa'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const results = []

function check(id, name, ok, extra = '') {
  results.push({ id, name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] - ${name}${extra ? ` (${extra})` : ''}`)
}

function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true })
}

async function shot(page, name) {
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`PRINT: ${name}`)
  return file
}

async function signUp(page) {
  const unique = `qa-prints-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA Prints')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 60000 })
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
            title: 'Evento horario QA 23h',
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

ensureDirs()
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true })
const page = await context.newPage()

try {
  const unique = await signUp(page)

  // Create test data
  const folder = (await post(page, '/api/folders', { name: `Pasta W ${unique}` })).folder
  const folders = []
  for (let i = 0; i < 18; i++) {
    folders.push((await post(page, '/api/folders', { name: `Destino ${String(i).padStart(2, '0')} ${unique}` })).folder)
  }
  const regressionFolder = (await post(page, '/api/folders', { name: `Regressao 073 ${unique}` })).folder

  const note = (await post(page, '/api/items', {
    title: `Nota atalhos ${unique}`,
    complexity: 'note',
    status: 'todo',
    contentMd: `Nota atalhos ${unique}\n\nConteudo original`,
  })).item
  await patch(page, `/api/items/${note.id}`, { contentMd: `Nota atalhos ${unique}\n\nConteudo versao dois` })

  const mobileNote = (await post(page, '/api/items', {
    title: `Nota mobile ${unique}`,
    complexity: 'note',
    status: 'todo',
    contentMd: `Nota mobile ${unique}\n\nLinha preenchida\n\n`,
  })).item

  const longTitle = `Texto longo QA ${unique} ${'semquebra'.repeat(20)} fim`
  await post(page, '/api/items', { title: longTitle, complexity: 'task', status: 'inbox' })

  const contextItem = (await post(page, '/api/items', {
    title: `Mover contexto ${unique}`,
    complexity: 'task',
    status: 'inbox',
  })).item

  const calendarNote = (await post(page, '/api/items', {
    title: `Nota calendario ${unique}`,
    complexity: 'note',
    status: 'todo',
    dueDate: dateKey(),
  })).item

  const calendarTask = (await post(page, '/api/items', {
    title: `Tarefa calendario ${unique}`,
    complexity: 'task',
    status: 'todo',
    dueDate: dateKey(),
  })).item

  const regressionTask = (await post(page, '/api/items', {
    title: `Tarefa 073 ${unique}`,
    complexity: 'task',
    status: 'todo',
    folderId: regressionFolder.id,
  })).item

  // ─── ID 073: Pastas / Concluídos ──────────────────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas?folder=${regressionFolder.id}`)
  await page.waitForLoadState('networkidle')
  const taskRow = page.locator('button').filter({ hasText: regressionTask.title }).first()
  const checkbox = taskRow.locator('[role="button"]').first()
  await checkbox.click()
  await page.waitForTimeout(300)
  const visibleDuringFeedback = await page.getByText(regressionTask.title, { exact: true }).isVisible()
  check('073', 'concluída aparece durante feedback (desktop)', visibleDuringFeedback)
  await shot(page, 'ID073-pasta-concluido-delay-desktop.png')
  await page.waitForTimeout(2000)
  const visibleAfter = await page.getByText(regressionTask.title, { exact: true }).isVisible().catch(() => false)
  check('073', 'concluída some após feedback (desktop)', !visibleAfter)

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas?folder=${regressionFolder.id}`)
  await page.waitForLoadState('networkidle')
  await shot(page, 'ID073-pasta-concluido-delay-mobile.png')

  // ─── ID 074: Data / Próxima semana ────────────────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('q')
  await page.waitForTimeout(500)
  const input074 = page.locator('input[placeholder*="amanh"], input[placeholder*="próximo"], textarea[placeholder*="amanh"]').first()
  if (await input074.count() > 0) {
    await input074.fill('Regressao 074')
    await page.waitForTimeout(350)
  }
  const expected074 = (() => {
    const now = new Date()
    const day = now.getDay()
    const add = day === 0 ? 1 : 8 - day
    now.setDate(now.getDate() + add)
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`
  })()
  const bodyText = await page.locator('body').innerText()
  check('074', `próxima semana = próxima segunda (${expected074})`, bodyText.includes(expected074), expected074)
  await shot(page, 'ID074-proxima-semana-data.png')

  // ─── ID 100: Atalhos H1 H2 H3 ────────────────────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas/${note.id}`)
  await page.waitForLoadState('networkidle')
  const editor = page.locator('.doit-note-sheet-prose')
  await editor.click()
  await page.keyboard.press('Control+1')
  await page.waitForTimeout(150)
  const h1ok = (await editor.locator('h1').count()) > 0
  check('100', 'Ctrl+1 aplica H1', h1ok)
  await page.keyboard.press('Control+2')
  await page.waitForTimeout(100)
  const h2ok = (await editor.locator('h2').count()) > 0
  check('100', 'Ctrl+2 aplica H2', h2ok)
  await page.keyboard.press('Control+3')
  await page.waitForTimeout(100)
  const h3ok = (await editor.locator('h3').count()) > 0
  check('100', 'Ctrl+3 aplica H3', h3ok)
  await shot(page, 'ID100-atalhos-h1-h2-h3-editor.png')

  // ─── ID 101: Arquivar Shift+# ─────────────────────────────────────────────
  await page.keyboard.press('Shift+3')
  try {
    await page.waitForURL('**/notas', { timeout: 10000 })
  } catch { /* talvez já esteja em notas */ }
  const archived101 = (await getArchivedItems(page)).find((item) => item.id === note.id)
  check('101', 'Shift+# arquiva nota sem excluir conteúdo',
    archived101?.status === 'archived' && Boolean(archived101?.contentMd),
    archived101?.status ?? 'nao encontrado')
  await page.goto(`${BASE}/notas`)
  await page.waitForLoadState('networkidle')
  await shot(page, 'ID101-arquivar-shift-hash.png')

  // ─── ID 109: Inbox / Mobile / Texto longo ────────────────────────────────
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/inbox`)
  await page.waitForLoadState('networkidle')
  const longRow = page.getByText(longTitle, { exact: true })
  let overflow109 = { page: true, card: true, lines: 0 }
  if (await longRow.count() > 0) {
    overflow109 = await longRow.evaluate((node) => {
      const card = node.closest('[data-item-id]')
      return {
        page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        card: card ? card.scrollWidth > card.clientWidth : true,
        lines: Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)),
      }
    })
  }
  check('109', 'texto longo respeita card mobile',
    !overflow109.page && !overflow109.card && overflow109.lines > 1,
    JSON.stringify(overflow109))
  await shot(page, 'ID109-inbox-texto-longo-mobile.png')

  // ─── IDs 110 / 112 / 113 / 114: Editor mobile ────────────────────────────
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas/${mobileNote.id}`)
  await page.waitForLoadState('networkidle')
  const metrics = await page.evaluate(() => ({
    breadcrumbVisible: [...document.querySelectorAll('nav')].some((n) => {
      const s = getComputedStyle(n)
      return s.display !== 'none' && n.textContent?.includes('notas')
    }),
    archive: Boolean(document.querySelector('button[aria-label="Arquivar nota"]')),
    attachments: Boolean(document.querySelector('button[aria-label="Anexos"]')),
    folderHeight: document.querySelector('select[aria-label="Editar pasta da nota"]')?.getBoundingClientRect().height ?? 0,
    viewportOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))
  check('110', 'metadados compactos e área útil ampliada', !metrics.breadcrumbVisible && metrics.folderHeight <= 34, JSON.stringify(metrics))
  check('112', 'botão arquivar presente no mobile', metrics.archive)
  check('114', 'cabeçalho mobile compacto (sem breadcrumb)', !metrics.breadcrumbVisible)
  check('109', 'editor mobile sem overflow horizontal', !metrics.viewportOverflow)
  await shot(page, 'ID110-editor-mobile-layout.png')
  await shot(page, 'ID112-editor-mobile-arquivar.png')
  await shot(page, 'ID114-editor-mobile-cabecalho.png')

  // ─── ID 111: Anexos ───────────────────────────────────────────────────────
  check('111', 'botão Anexos presente no topo', metrics.attachments)
  const attachBtn = page.getByRole('button', { name: 'Anexos' })
  if (await attachBtn.count() > 0) {
    await attachBtn.click()
    await page.waitForTimeout(300)
    const galleryVisible = await page.locator('#note-editor-mobile-attachments').isVisible().catch(() => false)
    check('111', 'galeria de anexos aparece abaixo', galleryVisible)
  }
  await shot(page, 'ID111-editor-mobile-anexos.png')

  // ─── ID 113: Colar em linha vazia ─────────────────────────────────────────
  await page.goto(`${BASE}/notas/${mobileNote.id}`)
  await page.waitForLoadState('networkidle')
  const emptyLine = page.locator('.doit-note-sheet-prose p').last()
  if (await emptyLine.count() > 0) {
    await emptyLine.dblclick()
    await page.waitForTimeout(200)
  }
  const pasteTarget = await page.evaluate(() => ({
    active: document.activeElement?.classList.contains('ProseMirror') ?? false,
    selectionInside: Boolean(window.getSelection()?.anchorNode?.parentElement?.closest('.ProseMirror')),
  }))
  check('113', 'linha vazia aceita foco/seleção para colar',
    pasteTarget.active || pasteTarget.selectionInside,
    JSON.stringify(pasteTarget))
  await shot(page, 'ID113-editor-mobile-colar-linha-vazia.png')

  // ─── ID 115: Modo foco / zoom ─────────────────────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas/${mobileNote.id}`)
  await page.waitForLoadState('networkidle')
  // Ativar modo foco se disponível
  const focusBtn = page.getByRole('button', { name: /foco|focus/i })
  if (await focusBtn.count() > 0) await focusBtn.click()
  await page.waitForTimeout(500)
  await page.evaluate(() => document.body.style.zoom = '1.5')
  await page.waitForTimeout(300)
  await shot(page, 'ID115-editor-foco-zoom.png')
  await page.evaluate(() => document.body.style.zoom = '')

  // ─── ID 116: Impressão ────────────────────────────────────────────────────
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas/${mobileNote.id}`)
  await page.waitForLoadState('networkidle')
  await page.emulateMedia({ media: 'print' })
  const printState = await page.evaluate(() => {
    const content = document.querySelector('.note-print-content')
    const mainDiv = document.querySelector('.note-editor-main > div')
    return {
      content: content ? getComputedStyle(content).visibility : 'missing',
      topbar: mainDiv ? getComputedStyle(mainDiv).visibility : 'missing',
    }
  })
  check('116', 'impressão mostra conteúdo e oculta interface',
    printState.content === 'visible' && printState.topbar === 'hidden',
    JSON.stringify(printState))
  await shot(page, 'ID116-impressao-nota.png')
  await page.emulateMedia({ media: 'screen' })

  // ─── ID 117: Seletor calendários mobile ──────────────────────────────────
  await mockCalendar(page)
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/calendar`)
  await page.waitForLoadState('networkidle')
  const calBtn = page.getByRole('button', { name: 'Escolher calendarios visiveis' })
  if (await calBtn.count() > 0) {
    await calBtn.click()
    await page.waitForTimeout(400)
  }
  const menuBox = await page.locator('div.fixed.inset-x-3.top-20').boundingBox()
  check('117', 'seletor mobile fica dentro da viewport',
    Boolean(menuBox && menuBox.x >= 0 && menuBox.x + menuBox.width <= MOBILE.width && menuBox.y + menuBox.height <= MOBILE.height),
    JSON.stringify(menuBox))
  await shot(page, 'ID117-seletor-calendarios-mobile.png')

  // ─── ID 118: Hoje / Eventos dia todo ──────────────────────────────────────
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  const allDayRow = page.locator('article').filter({ hasText: 'Evento dia todo QA' })
  let allDayText = '', allDayClass = ''
  if (await allDayRow.count() > 0) {
    allDayText = await allDayRow.innerText()
    allDayClass = (await allDayRow.getAttribute('class')) ?? ''
  }
  check('118', 'evento dia todo exibe "Dia todo"', allDayText.includes('Dia todo'), allDayText.replace(/\s+/g, ' '))
  check('118', 'evento dia todo não fica esmaecido', !allDayClass.split(/\s+/).includes('done'), allDayClass)
  await shot(page, 'ID118-hoje-evento-dia-todo.png')

  // ─── ID 119: Calendário / Filtros ────────────────────────────────────────
  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/calendar`)
  await page.waitForLoadState('networkidle')
  const notesBtn = page.getByRole('button', { name: /Notas ON/i })
  const tasksBtn = page.getByRole('button', { name: /Tarefas ON/i })
  if (await notesBtn.count() > 0) await notesBtn.click()
  if (await tasksBtn.count() > 0) await tasksBtn.click()
  await page.waitForTimeout(300)
  await page.reload()
  await page.waitForLoadState('networkidle')
  const filterState = await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('doit:preferences') ?? '{}')
    return { notes: value.showCalendarNotes, tasks: value.showCalendarTasks }
  })
  check('119', 'filtros persistem após reload',
    filterState.notes === false && filterState.tasks === false,
    JSON.stringify(filterState))
  const calBtn2 = page.getByRole('button', { name: 'Escolher calendarios visiveis' })
  if (await calBtn2.count() > 0) await calBtn2.click()
  await shot(page, 'ID119-calendario-ocultar-notas-tarefas.png')

  // ─── ID 120: Atalhos g+i / g+h ────────────────────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/calendar`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('g')
  await page.keyboard.press('i')
  try { await page.waitForURL('**/inbox', { timeout: 8000 }) } catch { /* */ }
  check('120', 'g+i abre Inbox', page.url().endsWith('/inbox'))
  await page.keyboard.press('g')
  await page.keyboard.press('h')
  try { await page.waitForURL('**/today', { timeout: 8000 }) } catch { /* */ }
  check('120', 'g+h abre Hoje', page.url().endsWith('/today'))
  const search120 = page.locator('input[placeholder*="Buscar"], input[type="search"]').first()
  if (await search120.count() > 0) {
    await search120.fill('g')
    const beforeUrl = page.url()
    await page.keyboard.press('g')
    await page.keyboard.press('i')
    await page.waitForTimeout(300)
    check('120', 'atalhos não disparam em input', page.url() === beforeUrl)
  }
  await shot(page, 'ID120-atalhos-g-i-g-h.png')

  // ─── ID 121: Versionamento ────────────────────────────────────────────────
  await page.goto(`${BASE}/notas/${mobileNote.id}`)
  await page.waitForLoadState('networkidle')
  const histBtn = page.getByRole('button', { name: /Historico|Versoes|Version/i })
  check('121', 'botão histórico presente no editor novo', (await histBtn.count()) > 0)
  if (await histBtn.count() > 0) {
    await histBtn.click()
    await page.waitForTimeout(400)
    const histContent = (await page.locator('text=/Recolher|Nenhuma versao|Conteudo/').count()) > 0
    check('121', 'histórico lista versões ou mostra mensagem', histContent)
  }
  await shot(page, 'ID121-editor-versionamento.png')

  // ─── ID 122: Menu de contexto / Mudar pasta ───────────────────────────────
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/inbox`)
  await page.waitForLoadState('networkidle')
  const itemRow122 = page.locator(`[data-item-id="${contextItem.id}"]`)
  if (await itemRow122.count() > 0) {
    await itemRow122.click({ button: 'right' })
    await page.waitForTimeout(300)
    const moveBtn = page.getByText('Mover para pasta', { exact: true })
    if (await moveBtn.count() > 0) {
      await moveBtn.click()
      await page.waitForTimeout(300)
      const scroller = page.locator('.max-h-64.overflow-y-auto')
      if (await scroller.count() > 0) {
        await scroller.evaluate((node) => node.scrollTo(0, node.scrollHeight))
        await page.waitForTimeout(300)
        const stillVisible = await scroller.isVisible()
        check('122', 'scroll não fecha seletor de pasta', stillVisible)
        const lastFolderBtn = scroller.getByText(folders.at(-1).name, { exact: true })
        if (await lastFolderBtn.count() > 0) {
          await lastFolderBtn.click()
          await page.waitForTimeout(500)
          const moved = (await getItems(page)).find((item) => item.id === contextItem.id)
          check('122', 'pasta muda pelo menu de contexto', moved?.folderId === folders.at(-1).id, moved?.folderId)
        }
      }
    }
  }
  await shot(page, 'ID122-menu-contexto-mudar-pasta-scroll.png')

  // ─── ID 123: W dentro de pasta ────────────────────────────────────────────
  await page.goto(`${BASE}/notas?folder=${folder.id}`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('w')
  try { await page.waitForURL('**/notas/**', { timeout: 10000 }) } catch { /* */ }
  const createdId = page.url().split('/notas/')[1]?.split(/[?#]/)[0]
  const created123 = createdId ? (await getItems(page)).find((item) => item.id === createdId) : null
  check('123', 'W cria nota na pasta atual', created123?.folderId === folder.id, created123?.folderId ?? 'nao criado')
  await shot(page, 'ID123-w-dentro-pasta.png')

  // Salvar resultados
  fs.writeFileSync(path.join(OUT, 'resultados-qa.json'), JSON.stringify(results, null, 2))

  const failed = results.filter((r) => !r.ok)
  const passed = results.filter((r) => r.ok)
  console.log(`\n=== RESUMO: ${passed.length} PASS / ${failed.length} FAIL ===`)
  if (failed.length) {
    console.log('FALHAS:', failed.map((r) => `[${r.id}] ${r.name}`).join('\n'))
  }
} finally {
  await browser.close()
}
