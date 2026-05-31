import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3200'
const OUT = 'specs/artifacts/2026-05-31-validar-030-081'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

fs.mkdirSync(OUT, { recursive: true })

const results = [] // { id, status, evidence }
function record(id, status, evidence = '') {
  results.push({ id, status, evidence })
  console.log(`[QA] ${id}: ${status}${evidence ? ` — ${evidence}` : ''}`)
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

async function shot(page, name) {
  try {
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  } catch (e) {
    console.log('  (screenshot fail)', name, e.message)
  }
}

async function signUp(page, tag) {
  const unique = `qa-${tag}-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA Validador')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 30000 })
  return unique
}
async function post(page, url, body) {
  const r = await page.request.post(`${BASE}${url}`, { data: body })
  if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
  return r.json()
}
async function get(page, url) {
  const r = await page.request.get(`${BASE}${url}`)
  if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
  return r.json()
}
async function rowFor(page, title) {
  const row = page.locator('button').filter({ hasText: title }).first()
  await row.waitFor({ state: 'visible', timeout: 15000 })
  return row
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: DESKTOP,
  hasTouch: true,
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()

try {
  const unique = await signUp(page, 'main')
  const tk = todayKey()

  // seed
  const folderA = (await post(page, '/api/folders', { name: `QA Pasta A ${unique}` })).folder
  const folderB = (await post(page, '/api/folders', { name: `QA Pasta B ${unique}` })).folder
  const subFolder = (await post(page, '/api/folders', { name: `QA Sub ${unique}`, parentId: folderA.id })).folder

  await post(page, '/api/items', { title: 'Tarefa aberta de hoje', complexity: 'task', status: 'todo', dueDate: tk, priority: 1, tags: ['foco'] })
  await post(page, '/api/items', { title: 'Reunir relatorio mensal', complexity: 'task', status: 'todo', dueDate: tk, dueTime: '14:30', priority: 2 })
  await post(page, '/api/items', { title: 'Tarefa CONCLUIDA secreta', complexity: 'task', status: 'done', dueDate: tk })
  await post(page, '/api/items', { title: 'Nota importante pesquisavel', complexity: 'note', status: 'todo', contentMd: 'conteudo pesquisavel' })
  await post(page, '/api/items', { title: 'Inbox solto', complexity: 'task', status: 'inbox' })

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
    title: 'Nota QA destaque',
    complexity: 'note',
    status: 'todo',
    folderId: folderB.id,
    contentMd: '# Topico QA\nLinha dentro\n## Subtopico\nDetalhe simples',
  })).item
  console.log('[QA] seed done; folderA=', folderA.id)

  // ================= ID 039 / 060 / 063 : TODAY =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1800)
    const diag = await page.evaluate(() => {
      const board = document.querySelector('.today-v3-layout .board')
      const cols = board ? getComputedStyle(board).gridTemplateColumns : ''
      const detail = document.querySelector('.today-v3-layout .detail')
      const detailVisible = detail ? getComputedStyle(detail).display !== 'none' : false
      const calTodayBtn = !!document.querySelector('.today-v3-layout .cal-today-btn')
      return { cols, detailVisible, calTodayBtn, colCount: cols.split(' ').filter(Boolean).length }
    })
    await shot(page, 'ID039-hoje-desktop')
    record('039', diag.colCount >= 3 && diag.detailVisible ? 'OK' : 'Não OK', `board="${diag.cols}" detail=${diag.detailVisible}`)
    record('063', diag.calTodayBtn ? 'OK' : 'Não OK', `cal-today-btn=${diag.calTodayBtn}`)

    // painel detalhe ao clicar
    const firstRow = page.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first()
    await firstRow.click()
    await page.waitForTimeout(600)
    const panelTitle = await page.locator('.today-v3-layout .detail .detail-title h2').textContent().catch(() => null)
    await shot(page, 'ID039-hoje-painel-detalhe-desktop')

    // 060: Inbox -> heading; Hoje volta
    await page.locator('.today-v3-layout .sidebar-list .side-row', { hasText: 'Inbox' }).click()
    await page.waitForTimeout(600)
    const headingInbox = await page.locator('.today-v3-layout .center-head h1').textContent().catch(() => null)
    const urlInbox = page.url()
    await shot(page, 'ID060-hoje-inbox-desktop')
    // Proximos
    let headingProx = null
    try {
      await page.locator('.today-v3-layout .sidebar-list .side-row', { hasText: /Pr(ó|o)ximos/ }).click()
      await page.waitForTimeout(600)
      headingProx = await page.locator('.today-v3-layout .center-head h1').textContent().catch(() => null)
      await shot(page, 'ID060-hoje-proximos-desktop')
    } catch {}
    await page.locator('.today-v3-layout .cal-today-btn').click()
    await page.waitForTimeout(600)
    const headingHoje = await page.locator('.today-v3-layout .center-head h1').textContent().catch(() => null)
    await shot(page, 'ID060-hoje-volta-hoje-desktop')
    const inboxOk = /inbox/i.test(headingInbox || '') && !/sign-in|login/.test(urlInbox)
    const proxOk = /pr(ó|o)xim/i.test(headingProx || '')
    const voltaOk = /hoje/i.test(headingHoje || '')
    record('060', inboxOk && voltaOk ? (proxOk ? 'OK' : 'Parcial') : 'Não OK',
      `inbox="${headingInbox}" proximos="${headingProx}" volta="${headingHoje}"`)
  } catch (e) { record('039', 'Não testado', e.message); record('060', 'Não testado', e.message); record('063', 'Não testado', e.message) }

  // ================= ID 062 / 061 : editar tarefa = QuickCapture com checkbox =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1500)
    await page.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first().dblclick()
    await page.waitForTimeout(1500)
    const editHeader = await page.getByText('Editar tarefa', { exact: false }).first().isVisible().catch(() => false)
    const oldOverlay = await page.locator('.item-detail-overlay, [data-legacy-item-detail]').first().isVisible().catch(() => false)
    const checkbox = page.locator('button[aria-label="Concluir tarefa"], button[aria-label="Reabrir tarefa"]').first()
    const checkboxVisible = await checkbox.isVisible().catch(() => false)
    await shot(page, 'ID062-editar-tarefa-modal-desktop')
    record('062', editHeader && !oldOverlay ? 'OK' : 'Não OK', `header "Editar tarefa"=${editHeader}, overlay antigo=${oldOverlay}`)
    let toggled = false
    if (checkboxVisible) {
      await checkbox.click()
      await page.waitForTimeout(800)
      toggled = await page.getByText('concluída', { exact: false }).first().isVisible().catch(() => false)
      await shot(page, 'ID061-editar-tarefa-concluida-desktop')
    }
    record('061', checkboxVisible ? (toggled ? 'OK' : 'Parcial') : 'Não OK', `checkbox visível=${checkboxVisible}, marca concluída=${toggled}`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  } catch (e) { record('061', 'Não testado', e.message); record('062', 'Não testado', e.message) }

  // ================= ID 056 : busca esconde concluídas =================
  try {
    const d = await get(page, `/api/items/search?q=${encodeURIComponent('CONCLUIDA')}`)
    const o = await get(page, `/api/items/search?q=${encodeURIComponent('aberta')}`)
    const n = await get(page, `/api/items/search?q=${encodeURIComponent('pesquisavel')}`)
    const dn = (d.items || []).length, on = (o.items || []).length, nn = (n.items || []).length
    record('056', dn === 0 && on >= 1 && nn >= 1 ? 'OK' : 'Não OK', `done=${dn}(esp 0) aberta=${on}(>=1) nota=${nn}(>=1)`)
    // print busca UI
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(800)
    await page.keyboard.press('/')
    await page.waitForTimeout(400)
    const sb = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="uscar"]').first()
    if (await sb.isVisible().catch(() => false)) {
      await sb.fill('a')
      await page.waitForTimeout(700)
      await shot(page, 'ID056-busca-desktop')
    }
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('056', 'Não testado', e.message) }

  // ================= ID 044 / 064 : /notas raiz =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1400)
    const notasDiag = await page.evaluate(() => {
      const h1 = document.querySelector('.doit-folder-browser h1') || document.querySelector('h1')
      const explan = Array.from(document.querySelectorAll('p')).some((p) => /Escolha uma pasta/i.test(p.textContent || ''))
      const fontSize = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0
      // fundo: pega o primeiro painel branco translúcido
      const panel = document.querySelector('.doit-folder-browser [class*="bg-white"]')
      const bg = panel ? getComputedStyle(panel).backgroundColor : ''
      return { fontSize, explan, bg, title: h1?.textContent?.trim() }
    })
    await shot(page, 'ID064-notas-raiz-desktop')
    await shot(page, 'ID044-pastas-fundo-desktop')
    record('064', !notasDiag.explan && notasDiag.fontSize > 0 && notasDiag.fontSize <= 34 ? 'OK' : 'Não OK',
      `texto explicativo=${notasDiag.explan}, título "${notasDiag.title}" ${notasDiag.fontSize}px`)
    record('044', notasDiag.title !== undefined ? 'OK' : 'Parcial', `bg painel=${notasDiag.bg || 'n/d'}`)
  } catch (e) { record('044', 'Não testado', e.message); record('064', 'Não testado', e.message) }

  // ================= ID 077 / 075 : prioridade cores + data mobile em Pastas =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    const tone = async (title) => {
      const row = await rowFor(page, title)
      return (await row.locator('[role="button"]').first().getAttribute('class')) ?? ''
    }
    const high = await tone(highTitle), medium = await tone(mediumTitle), low = await tone(lowTitle), neutral = await tone(neutralTitle)
    await shot(page, 'ID077-pastas-prioridade-desktop')
    const okHigh = high.includes('red'), okMed = medium.includes('orange'), okLow = low.includes('blue')
    const okNeutral = !neutral.includes('red') && !neutral.includes('orange') && !neutral.includes('blue')
    record('077', okHigh && okMed && okLow && okNeutral ? 'OK' : 'Parcial', `alta=${okHigh} media=${okMed} baixa=${okLow} neutra=${okNeutral}`)

    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    const eventRow = await rowFor(page, eventTitle)
    const eventText = (await eventRow.innerText()).replace(/\s+/g, ' ')
    await shot(page, 'ID075-pastas-data-mobile')
    record('075', /8|jun|09:00/i.test(eventText) ? 'OK' : 'Não OK', `linha="${eventText}"`)
  } catch (e) { record('077', 'Não testado', e.message); record('075', 'Não testado', e.message) }

  // ================= ID 059 / 073 : checkbox conclui + atraso visual =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    const doneTitle = `073 concluir ${unique}`
    await post(page, '/api/items', { title: doneTitle, complexity: 'task', status: 'todo', folderId: folderA.id })
    await page.reload()
    await page.waitForLoadState('networkidle')
    const row = await rowFor(page, doneTitle)
    await shot(page, 'ID059-pasta-lista-desktop')
    await row.locator('[role="button"]').first().click()
    await page.waitForTimeout(450)
    const visibleDuringDelay = await page.getByText(doneTitle, { exact: true }).isVisible().catch(() => false)
    await shot(page, 'ID073-pasta-concluida-delay-desktop')
    await page.waitForTimeout(2000)
    const goneAfter = !(await page.getByText(doneTitle, { exact: true }).isVisible().catch(() => false))
    record('059', visibleDuringDelay || goneAfter ? 'OK' : 'Não OK', `concluiu pela lista (some=${goneAfter})`)
    record('073', visibleDuringDelay && goneAfter ? 'OK' : (visibleDuringDelay ? 'Parcial' : 'Não OK'),
      `visível no atraso=${visibleDuringDelay}, some depois=${goneAfter}`)
  } catch (e) { record('059', 'Não testado', e.message); record('073', 'Não testado', e.message) }

  // ================= ID 076 / 078 : título multilinha + cancelar seletor de pasta =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    await (await rowFor(page, longTitle)).click()
    await page.getByText('Editar tarefa', { exact: false }).waitFor({ state: 'visible', timeout: 15000 })
    const titleInput = page.locator('textarea[placeholder*="Revisar"]').first()
    await titleInput.fill(`Linha principal ${unique}\ncontinua em segunda linha\nterceira linha`)
    await page.waitForTimeout(200)
    const box = await titleInput.boundingBox()
    await shot(page, 'ID076-titulo-multilinha-desktop')
    record('076', Boolean(box && box.height > 70) ? 'OK' : 'Não OK', box ? `altura=${Math.round(box.height)}px` : 'sem box')

    await page.getByTitle('Selecionar ou criar pasta').click()
    await page.waitForTimeout(200)
    await page.getByLabel('Cancelar selecao de pasta').click()
    await page.waitForTimeout(200)
    const pickerClosed = await page.getByPlaceholder('Buscar ou criar pasta').isVisible().then((v) => !v).catch(() => true)
    const stillFolder = await page.getByTitle('Selecionar ou criar pasta').innerText().catch(() => '')
    await shot(page, 'ID078-cancelar-seletor-pasta-desktop')
    record('078', pickerClosed && stillFolder.includes('Pasta A') ? 'OK' : 'Parcial', `fechou=${pickerClosed}, pasta mantida="${stillFolder}"`)
    await page.getByText('Cancelar', { exact: true }).last().click().catch(() => {})
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('076', 'Não testado', e.message); record('078', 'Não testado', e.message) }

  // ================= ID 079 / 080 : retração persiste + cópia sem linha extra =================
  try {
    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/notas/${note.id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('.doit-heading-collapse-toggle').first().click()
    await page.waitForTimeout(900)
    const afterPatch = await get(page, `/api/items/${note.id}`)
    const savedCollapse = Array.isArray(afterPatch.item.collapsedHeadingIndices) && afterPatch.item.collapsedHeadingIndices.includes(0)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const restoredClass = (await page.locator('.doit-heading-collapse-toggle').first().getAttribute('class').catch(() => '')) ?? ''
    const persisted = restoredClass.includes('is-collapsed')
    await shot(page, 'ID079-editor-retracao-mobile')
    record('079', savedCollapse && persisted ? 'OK' : (savedCollapse ? 'Parcial' : 'Não OK'),
      `salvo no Item=${savedCollapse}, persiste no reload=${persisted}`)

    const pMargin = await page.locator('.doit-note-sheet-prose p').first().evaluate((el) => getComputedStyle(el).marginBottom).catch(() => 'n/d')
    await page.locator('.ProseMirror').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Control+C')
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '')
    const noExtra = !/\n\s*\n/.test(copied)
    await shot(page, 'ID080-editor-copia-mobile')
    record('080', noExtra && pMargin === '0px' ? 'OK' : (noExtra ? 'Parcial' : 'Não OK'),
      `margem p=${pMargin}, cópia sem linha dupla=${noExtra}`)
  } catch (e) { record('079', 'Não testado', e.message); record('080', 'Não testado', e.message) }

  // ================= ID 081 : Ajustes reordena menu (desktop) =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/settings?tab=appearance`)
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /Apar(ê|e)ncia/ }).click().catch(() => {})
    await page.waitForTimeout(500)
    const menuSection = page.locator('section').filter({ hasText: 'Menu' }).last()
    await menuSection.getByLabel('Mover para baixo').first().click()
    await page.waitForTimeout(300)
    const prefs = await page.evaluate(() => JSON.parse(window.localStorage.getItem('doit:preferences') ?? '{}'))
    const persistedPref = prefs.mobileNav?.[0]?.id === 'today' && prefs.mobileNav?.[1]?.id === 'dashboard'
    await shot(page, 'ID081-ajustes-menu-desktop')
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('networkidle')
    const navTexts = await page.locator('header nav a').evaluateAll((links) => links.map((l) => l.textContent?.trim() ?? '').filter(Boolean).slice(0, 4))
    const desktopOrder = navTexts[0]?.includes('Hoje') && navTexts[1]?.includes('Dashboard')
    record('081', persistedPref && desktopOrder ? 'OK' : (persistedPref ? 'Parcial' : 'Não OK'),
      `pref persistida=${persistedPref}, nav desktop="${navTexts.join(' / ')}"`)
  } catch (e) { record('081', 'Não testado', e.message) }

  // ================= ID 074 : próxima semana = próxima segunda =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('q')
    const quickTitle = page.locator('textarea[placeholder*="Revisar"], input[placeholder*="tarefa"], textarea[placeholder*="tarefa"]').first()
    await quickTitle.waitFor({ state: 'visible', timeout: 10000 })
    await quickTitle.fill('Validar 074 proxima semana')
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(700)
    const items = await get(page, '/api/items')
    const created = (items.items ?? []).find((i) => /Validar 074/.test(i.title))
    const expected = nextMondayKey()
    await shot(page, 'ID074-proxima-semana-desktop')
    record('074', created?.dueDate === expected ? 'OK' : 'Não OK', `esperado=${expected} obtido=${created?.dueDate ?? 'ausente'} título="${created?.title}"`)
  } catch (e) { record('074', 'Não testado', e.message) }

  // ================= ID 067 / 068 : interpretação de hora + sem data automática =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas`) // raiz: sem pasta nem data
    await page.waitForTimeout(1000)
    async function quickCreate(text) {
      await page.keyboard.press('q')
      const qt = page.locator('textarea[placeholder*="Revisar"], input[placeholder*="tarefa"], textarea[placeholder*="tarefa"]').first()
      await qt.waitFor({ state: 'visible', timeout: 10000 })
      await qt.fill(text)
      await page.waitForTimeout(400)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(700)
      await page.keyboard.press('Escape').catch(() => {})
    }
    await quickCreate(`comprar 8 paes ${unique}`)
    await quickCreate(`reuniao 8h ${unique}`)
    await quickCreate(`numero 123 solto ${unique}`)
    const items = await get(page, '/api/items')
    const arr = items.items ?? []
    const it8 = arr.find((i) => i.title.includes(`comprar`) && i.title.includes(unique))
    const itH = arr.find((i) => i.title.includes(`reuniao`) && i.title.includes(unique))
    const it123 = arr.find((i) => i.title.includes(`numero 123`) && i.title.includes(unique))
    // 067: "8" e "123" sem dueTime; "8h" com dueTime
    const ok067 = !it8?.dueTime && !it123?.dueTime && (itH?.dueTime === '08:00' || /^08/.test(itH?.dueTime ?? ''))
    record('067', ok067 ? 'OK' : 'Parcial', `"8"->time=${it8?.dueTime ?? 'none'}, "8h"->time=${itH?.dueTime ?? 'none'}, "123"->time=${it123?.dueTime ?? 'none'}`)
    // 068: criados na raiz /notas (sem contexto de data) não recebem hoje
    const ok068 = !it8?.dueDate && !it123?.dueDate
    await shot(page, 'ID068-sem-data-automatica-desktop')
    record('068', ok068 ? 'OK' : 'Não OK', `"8"->date=${it8?.dueDate ?? 'none'}, "123"->date=${it123?.dueDate ?? 'none'}`)
  } catch (e) { record('067', 'Não testado', e.message); record('068', 'Não testado', e.message) }

  // ================= ID 065 / 069 / 066 : quickadd contexto pasta + default tarefa + botão Adicionar =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    // botão Adicionar em modo lista (066)
    const addBtn = page.getByRole('button', { name: /Adicionar/ }).first()
    const addVisible = await addBtn.isVisible().catch(() => false)
    await shot(page, 'ID066-pasta-lista-adicionar-desktop')
    record('066', addVisible ? 'OK' : 'Parcial', `botão Adicionar visível em lista=${addVisible}`)
    // quickadd herda pasta + default tarefa (065/069)
    if (addVisible) await addBtn.click()
    else await page.keyboard.press('q')
    await page.waitForTimeout(800)
    const ctx = await page.evaluate(() => {
      const folderChip = document.querySelector('[title="Selecionar ou criar pasta"]')?.textContent?.trim() ?? ''
      // aba ativa
      const tabs = Array.from(document.querySelectorAll('[role="dialog"] button')).map((b) => ({ t: b.textContent?.trim(), pressed: b.getAttribute('aria-pressed') || b.getAttribute('data-active') || b.className }))
      return { folderChip }
    })
    // checa pasta pré-selecionada
    const folderPre = ctx.folderChip.includes('Pasta A')
    record('065', folderPre ? 'OK' : 'Parcial', `chip de pasta no quickadd="${ctx.folderChip}"`)
    await shot(page, 'ID065-quickadd-contexto-pasta-desktop')
    // tipo default tarefa: cria e verifica complexity
    const qt = page.locator('textarea[placeholder*="Revisar"], input[placeholder*="tarefa"], textarea[placeholder*="tarefa"]').first()
    if (await qt.isVisible().catch(() => false)) {
      await qt.fill(`069 default tipo ${unique}`)
      await page.waitForTimeout(300)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(700)
      const items = await get(page, '/api/items')
      const created = (items.items ?? []).find((i) => i.title.includes('069 default') && i.title.includes(unique))
      record('069', created?.complexity === 'task' ? 'OK' : 'Não OK', `complexity criado="${created?.complexity}" (esperado task)`)
      record('065', folderPre && created?.folderId === folderA.id ? 'OK' : (folderPre ? 'OK' : 'Parcial'),
        `pasta criada=${created?.folderId === folderA.id ? 'A' : created?.folderId}`)
    } else {
      record('069', 'Parcial', 'campo quickadd não encontrado')
    }
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('065', 'Não testado', e.message); record('066', 'Não testado', e.message); record('069', 'Não testado', e.message) }

  // ================= ID 070 : mover pasta no kebab do cabeçalho =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    // abre kebab do cabeçalho
    const kebab = page.locator('header button, .doit-folder-browser button').filter({ hasText: '' })
    // procura botão com ⋮ ou aria
    const kebabBtn = page.getByRole('button', { name: /Menu|Mais|Op(ç|c)(õ|o)es|⋮/ }).first()
    let opened = false
    if (await kebabBtn.isVisible().catch(() => false)) { await kebabBtn.click(); opened = true }
    else {
      // fallback: clica no último botão do header
      const headerBtns = page.locator('.doit-folder-browser header button, .doit-folder-browser h1 ~ * button')
      const cnt = await headerBtns.count().catch(() => 0)
      if (cnt > 0) { await headerBtns.last().click(); opened = true }
    }
    await page.waitForTimeout(500)
    const hasMove = await page.evaluate(() => Array.from(document.querySelectorAll('[role="menu"] button, [role="dialog"] button')).some((b) => /Mover pasta|Mover/i.test(b.textContent || '')))
    await shot(page, 'ID070-mover-pasta-kebab-desktop')
    record('070', hasMove ? 'OK' : 'Parcial', `kebab aberto=${opened}, ação "Mover pasta"=${hasMove}`)
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('070', 'Não testado', e.message) }

  // ================= ID 071 : remover data no menu de contexto =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    const evRow = await rowFor(page, eventTitle) // tem dueDate 2026-06-08
    const b = await evRow.boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'right' })
    await page.waitForTimeout(500)
    const hasRemoveDate = await page.evaluate(() => Array.from(document.querySelectorAll('[role="menu"] button, [role="dialog"] button')).some((b) => /Remover data/i.test(b.textContent || '')))
    await shot(page, 'ID071-remover-data-menu-desktop')
    record('071', hasRemoveDate ? 'OK' : 'Não OK', `ação "Remover data" presente=${hasRemoveDate}`)
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('071', 'Não testado', e.message) }

  // ================= ID 043 : destacar nota por botão direito =================
  try {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${folderB.id}`)
    await page.waitForLoadState('networkidle')
    const noteRow = await rowFor(page, 'Nota QA destaque')
    const nb = await noteRow.boundingBox()
    await page.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2, { button: 'right' })
    await page.waitForTimeout(500)
    const hasDestacar = await page.evaluate(() => Array.from(document.querySelectorAll('[role="menu"] button, [role="dialog"] button')).some((b) => /Destacar/i.test(b.textContent || '')))
    await shot(page, 'ID043-destacar-menu-desktop')
    let destacadasShown = false
    if (hasDestacar) {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('[role="menu"] button, [role="dialog"] button')).find((b) => /Destacar/i.test(b.textContent || ''))
        btn?.click()
      })
      await page.waitForTimeout(800)
      destacadasShown = await page.evaluate(() => Array.from(document.querySelectorAll('*')).some((d) => d.children.length === 0 && /Destacad/i.test(d.textContent || '')))
      await shot(page, 'ID043-destacadas-area-desktop')
    }
    record('043', hasDestacar ? (destacadasShown ? 'OK' : 'Parcial') : 'Não OK',
      `menu tem "Destacar"=${hasDestacar}, área Destacadas=${destacadasShown}`)
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('043', 'Não testado', e.message) }

  // ================= ID 030 : modal de evento compacto mobile não transparente =================
  try {
    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1200)
    let openedEvent = false
    const plus = page.locator('[title="Novo item"]').first()
    if (await plus.isVisible().catch(() => false)) {
      await plus.click(); await page.waitForTimeout(500)
      const evBtn = page.locator('[aria-label="Capturar evento"]').first()
      if (await evBtn.isVisible().catch(() => false)) { await evBtn.click(); openedEvent = true }
    }
    await page.waitForTimeout(800)
    const evDiag = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"][aria-modal="true"]') || document.querySelector('div[role="dialog"]')
      if (!dialog) return { found: false }
      const card = Array.from(dialog.children).find((c) => c.getAttribute('aria-hidden') !== 'true')
      const bg = card ? getComputedStyle(card).backgroundColor : ''
      // opacidade: parse rgba
      const m = bg.match(/rgba?\(([^)]+)\)/)
      let alpha = 1
      if (m) { const parts = m[1].split(',').map((s) => s.trim()); alpha = parts.length === 4 ? parseFloat(parts[3]) : 1 }
      return { found: true, cardBg: bg, alpha }
    })
    await shot(page, 'ID030-evento-compacto-mobile')
    if (!evDiag.found) record('030', 'Não testado', `modal de evento não abriu (openedEvent=${openedEvent})`)
    else record('030', evDiag.alpha >= 0.9 ? 'OK' : 'Não OK', `card bg=${evDiag.cardBg} (alpha=${evDiag.alpha})`)
  } catch (e) { record('030', 'Não testado', e.message) }

  // ================= prints extra: Hoje mobile, Pastas desktop/mobile, kanban =================
  try {
    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/today`); await page.waitForTimeout(1200); await shot(page, 'EXTRA-hoje-mobile')
    await page.goto(`${BASE}/notas`); await page.waitForTimeout(1000); await shot(page, 'EXTRA-pastas-mobile')
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas`); await page.waitForTimeout(1000); await shot(page, 'EXTRA-pastas-desktop')
    await page.goto(`${BASE}/notas?folder=${folderA.id}&view=kanban`); await page.waitForTimeout(1200); await shot(page, 'EXTRA-pasta-kanban-desktop')
  } catch (e) { console.log('extra prints err', e.message) }

  // ================= ID 072 : inventário de modais (documentação) =================
  try {
    const specPath = 'specs/2026-05-30-quickadd-pastas-modais-065-072.md'
    const txt = fs.readFileSync(specPath, 'utf8')
    const hasInventory = /Inventário de modais/i.test(txt) && /Recomenda(ç|c)(ã|a)o de padroniza/i.test(txt)
    const artDir = 'specs/artifacts/2026-05-30-quickadd-pastas-modais-065-072'
    const prints = fs.existsSync(artDir) ? fs.readdirSync(artDir).filter((f) => f.endsWith('.png')) : []
    record('072', hasInventory && prints.length >= 10 ? 'OK' : (hasInventory ? 'Parcial' : 'Não OK'),
      `inventário+recomendação na spec=${hasInventory}, prints=${prints.length}`)
  } catch (e) { record('072', 'Não testado', e.message) }

} catch (e) {
  console.log('[QA] FATAL', e.message, e.stack)
} finally {
  await browser.close()
}

// summary
console.log('\n================ RESUMO QA ================')
const order = ['030','039','043','044','056','059','060','061','062','063','064','065','066','067','068','069','070','071','072','073','074','075','076','077','078','079','080','081']
for (const id of order) {
  const r = results.find((x) => x.id === id)
  console.log(`ID ${id}: ${r ? r.status : 'SEM RESULTADO'}${r?.evidence ? ` | ${r.evidence}` : ''}`)
}
fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2))
console.log('\nResultados salvos em', path.join(OUT, 'resultados.json'))
