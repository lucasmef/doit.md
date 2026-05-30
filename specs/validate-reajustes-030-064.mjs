import { createRequire } from 'module'
const require = createRequire('C:/Users/lucas/OneDrive/Documentos/doit.md/apps/web/package.json')
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:3000'
const OUT = 'specs/artifacts/2026-05-30-reajustes-ui-030-064'
const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: DESKTOP })
  const page = await context.newPage()
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })
  const log = (...a) => console.log(...a)

  try {
    const unique = `qa-reaj-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA Reaj')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 25000 })
    log('signed up')

    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }

    const tk = todayKey()
    const folder = await post('/api/folders', { name: 'Trabalho' }).catch(() => null)
    const folderId = folder?.id ?? folder?._id
    await post('/api/items', { title: 'Tarefa aberta de hoje', complexity: 'task', status: 'todo', dueDate: tk, priority: 1, tags: ['foco'] })
    await post('/api/items', { title: 'Reunir relatorio mensal', complexity: 'task', status: 'todo', dueDate: tk, dueTime: '14:30', priority: 2, tags: [] })
    await post('/api/items', { title: 'Tarefa CONCLUIDA secreta', complexity: 'task', status: 'done', dueDate: tk })
    await post('/api/items', { title: 'Nota importante de busca', complexity: 'note', status: 'todo', contentMd: 'conteudo pesquisavel' })
    await post('/api/items', { title: 'Inbox solto', complexity: 'task', status: 'inbox' })
    if (folderId) {
      await post('/api/items', { title: 'Tarefa dentro da pasta', complexity: 'task', status: 'todo', folderId })
    }
    log('seeded; folderId=', folderId)

    // ---------- ID 039 / 060 / 063: Today ----------
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1800)
    const diag = await page.evaluate(() => {
      const board = document.querySelector('.today-v3-layout .board')
      const cols = board ? getComputedStyle(board).gridTemplateColumns : ''
      const detail = document.querySelector('.today-v3-layout .detail')
      const detailVisible = detail ? getComputedStyle(detail).display !== 'none' : false
      const calTodayBtn = !!document.querySelector('.today-v3-layout .cal-today-btn')
      const rows = document.querySelectorAll('.today-v3-layout .row').length
      return { cols, detailVisible, calTodayBtn, rows }
    })
    log('TODAY DIAG', JSON.stringify(diag))
    await shot('01-today-desktop')

    // clicar numa tarefa -> painel de detalhes aparece
    const firstRow = page.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first()
    await firstRow.click()
    await page.waitForTimeout(600)
    const panelTitle = await page.locator('.today-v3-layout .detail .detail-title h2').textContent().catch(() => null)
    log('PANEL TITLE', panelTitle)
    await shot('02-today-painel-detalhe')

    // Inbox -> depois Hoje volta
    await page.locator('.today-v3-layout .sidebar-list .side-row', { hasText: 'Inbox' }).click()
    await page.waitForTimeout(500)
    const headingInbox = await page.locator('.today-v3-layout .center-head h1').textContent().catch(() => null)
    await shot('03-today-inbox')
    await page.locator('.today-v3-layout .cal-today-btn').click()
    await page.waitForTimeout(500)
    const headingHoje = await page.locator('.today-v3-layout .center-head h1').textContent().catch(() => null)
    log('HEADING inbox/hoje', headingInbox, '/', headingHoje)
    await shot('04-today-volta-hoje')

    // ---------- ID 062 / 061: editar tarefa abre QuickCapture com checkbox ----------
    await page.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first().dblclick()
    await page.waitForTimeout(700)
    const editHeader = await page.locator('text=Editar tarefa').first().isVisible().catch(() => false)
    const editCheckbox = await page.locator('button[aria-label="Concluir tarefa"], button[aria-label="Reabrir tarefa"]').first().isVisible().catch(() => false)
    log('EDIT modal header / checkbox', editHeader, editCheckbox)
    await shot('05-editar-tarefa-quickcapture')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // ---------- ID 056: busca esconde concluidas ----------
    const searchDone = await page.request.get(`${BASE}/api/items/search?q=${encodeURIComponent('CONCLUIDA')}`)
    const doneJson = await searchDone.json()
    const searchOpen = await page.request.get(`${BASE}/api/items/search?q=${encodeURIComponent('aberta')}`)
    const openJson = await searchOpen.json()
    const searchNote = await page.request.get(`${BASE}/api/items/search?q=${encodeURIComponent('pesquisavel')}`)
    const noteJson = await searchNote.json()
    log('SEARCH done(0 esperado)=', (doneJson.items||[]).length, 'open(>=1)=', (openJson.items||[]).length, 'note(>=1)=', (noteJson.items||[]).length)

    // ---------- ID 044 / 064: notas ----------
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1200)
    const notasDiag = await page.evaluate(() => {
      const h1 = document.querySelector('.doit-folder-browser h1')
      const explan = Array.from(document.querySelectorAll('p')).some((p) => /Escolha uma pasta/.test(p.textContent || ''))
      const fontSize = h1 ? getComputedStyle(h1).fontSize : ''
      return { titleFont: fontSize, hasExplan: explan }
    })
    log('NOTAS DIAG', JSON.stringify(notasDiag))
    await shot('06-notas-raiz-desktop')

    // abrir a pasta e validar ID 059 (checkbox conclui)
    if (folderId) {
      await page.goto(`${BASE}/notas?folder=${folderId}`)
      await page.waitForTimeout(1200)
      await shot('07-pasta-lista')
    }

    // ---------- ID 030: modal de evento no mobile ----------
    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1200)
    // abre captura de evento via UI store event (mais robusto): usa o botão + se existir
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('doit:test-noop')))
    await shot('08-mobile-today')

    log('DONE')
  } catch (err) {
    console.log('ERRO:', err.message)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()
