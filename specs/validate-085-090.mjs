import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3300'
const OUT = 'specs/artifacts/2026-06-02-corrigir-085-090-ui-pastas-editor'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const results = []

function log(...args) {
  console.log('[validate-085-090]', ...args)
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
  const unique = `qa-085-090-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 085 090')
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

async function patch(page, url, body) {
  const res = await page.request.patch(`${BASE}${url}`, { data: body })
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function seed(page, unique) {
  const zeta = (await post(page, '/api/folders', { name: `Zeta ${unique}` })).folder
  const alpha = (await post(page, '/api/folders', { name: `Alpha ${unique}` })).folder
  const beta = (await post(page, '/api/folders', { name: `Beta ${unique}`, parentId: alpha.id })).folder
  const gamma = (await post(page, '/api/folders', { name: `Gamma ${unique}`, parentId: alpha.id })).folder
  await patch(page, `/api/folders/${alpha.id}`, { viewMode: 'kanban', viewModeManual: true, hideCompleted: true })
  await patch(page, `/api/folders/${beta.id}`, { hideCompleted: false })

  const note = (await post(page, '/api/items', {
    title: `Nota largura ${unique}`,
    complexity: 'note',
    status: 'todo',
    folderId: alpha.id,
    contentMd: [
      '# Nota larga',
      '',
      'Este paragrafo longo valida que o editor usa melhor a largura horizontal disponivel sem ficar preso em uma coluna estreita artificial.',
      '',
      '## Segundo bloco',
      '',
      '- item um',
      '- item dois',
    ].join('\n'),
  })).item
  await post(page, '/api/items', { title: `P1 hoje ${unique}`, complexity: 'task', status: 'todo', dueDate: todayKey(), priority: 1 })
  await post(page, '/api/items', { title: `P2 hoje ${unique}`, complexity: 'task', status: 'todo', dueDate: todayKey(), priority: 2 })
  await post(page, '/api/items', { title: `Concluido beta ${unique}`, complexity: 'task', status: 'done', folderId: beta.id })
  await post(page, '/api/items', { title: `Aberto beta ${unique}`, complexity: 'task', status: 'todo', folderId: beta.id })
  await post(page, '/api/items', { title: `Aberto gamma ${unique}`, complexity: 'task', status: 'todo', folderId: gamma.id })

  return { zeta, alpha, beta, gamma, note }
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function validateEditor(page, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas/${data.note.id}`)
  await page.waitForLoadState('networkidle')
  const normal = await page.evaluate(() => {
    const editorWrap = document.querySelector('[data-note-scroll-container="true"] > div')
    const prose = document.querySelector('.doit-note-sheet-prose')
    return {
      wrapperWidth: Math.round(editorWrap?.getBoundingClientRect().width ?? 0),
      proseWidth: Math.round(prose?.getBoundingClientRect().width ?? 0),
    }
  })
  await screenshot(page, '01-doitmd-editor-normal-2026-06-02.png')
  check('ID 085 - editor normal usa largura ampliada com limite', normal.wrapperWidth >= 900 && normal.wrapperWidth <= 1100 && normal.proseWidth >= 850, JSON.stringify(normal))

  await page.getByTitle('Modo foco').click()
  await page.waitForTimeout(500)
  const focus = await page.evaluate(() => {
    const editorWrap = document.querySelector('[data-note-scroll-container="true"] > div')
    const sidebars = document.querySelectorAll('aside').length
    return {
      wrapperWidth: Math.round(editorWrap?.getBoundingClientRect().width ?? 0),
      sidebars,
    }
  })
  await screenshot(page, '02-doitmd-editor-focus-2026-06-02.png')
  check('ID 085 - modo foco amplia editor e remove trilhos laterais', focus.wrapperWidth >= normal.wrapperWidth && focus.sidebars === 0, JSON.stringify(focus))

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas/${data.note.id}`)
  await page.waitForLoadState('networkidle')
  const mobile = await page.evaluate(() => {
    const editorWrap = document.querySelector('[data-note-scroll-container="true"] > div')
    return {
      wrapperWidth: Math.round(editorWrap?.getBoundingClientRect().width ?? 0),
      viewport: window.innerWidth,
    }
  })
  await screenshot(page, '03-doitmd-editor-mobile-2026-06-02.png')
  check('ID 085 - editor mobile respeita viewport', mobile.wrapperWidth <= mobile.viewport && mobile.wrapperWidth > 300, JSON.stringify(mobile))
}

async function validateFolderPicker(page, unique) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.getByText('+ Novo').click()
  await page.waitForTimeout(500)
  await page.getByTitle('Selecionar ou criar pasta').click()
  await page.waitForTimeout(300)
  const pickerBefore = await page.evaluate((unique) => {
    const popover = [...document.querySelectorAll('.fixed, .absolute')].find((el) => el.textContent?.includes(`Alpha ${unique}`) && el.textContent?.includes(`Zeta ${unique}`))
    const names = [...(popover?.querySelectorAll('button span.truncate') ?? [])].map((el) => el.textContent?.trim()).filter(Boolean)
    const scroller = popover?.querySelector('.overflow-y-auto')
    return {
      names,
      hasSearch: Boolean(popover?.querySelector('input[placeholder="Buscar ou criar pasta"]')),
      hasCancel: Boolean(popover?.querySelector('[aria-label="Cancelar selecao de pasta"]')),
      scrollerOverflow: scroller ? getComputedStyle(scroller).overflowY : '',
    }
  }, unique)
  await screenshot(page, '04-doitmd-folder-picker-open-2026-06-02.png')
  check('ID 086 - seletor tem busca, cancelar e lista rolavel', pickerBefore.hasSearch && pickerBefore.hasCancel && pickerBefore.scrollerOverflow === 'auto', JSON.stringify(pickerBefore))
  check('ID 086 - pastas aparecem em ordem alfabetica hierarquica', pickerBefore.names.indexOf(`Alpha ${unique}`) < pickerBefore.names.indexOf(`Zeta ${unique}`), pickerBefore.names.join(' / '))

  await page.fill('input[placeholder="Buscar ou criar pasta"]', `Beta ${unique}`)
  await page.waitForTimeout(300)
  const searchText = await page.evaluate(() => document.body.textContent ?? '')
  await screenshot(page, '05-doitmd-folder-picker-search-2026-06-02.png')
  check('ID 086 - busca filtra pasta', searchText.includes('Beta') && !searchText.includes('Zeta'), 'busca=Beta')

  await page.getByTitle('Cancelar').click()
  await page.waitForTimeout(200)
  const closed = await page.evaluate(() => !document.body.textContent?.includes('Criar "'))
  check('ID 086 - cancelar fecha sem selecionar', closed)
}

async function validateKanban(page, unique, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas?folder=${data.alpha.id}`)
  await page.waitForLoadState('networkidle')
  const mainText = await page.locator('.doit-folder-browser').innerText()
  await screenshot(page, '06-doitmd-kanban-normal-2026-06-02.png')
  check('ID 089 - Kanban da pasta aberta oculta concluidos das subpastas', mainText.includes(`Aberto beta ${unique}`) && !mainText.includes(`Concluido beta ${unique}`), 'pasta principal')

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button[title="Abrir Kanban em modo foco"]')]
      .find((el) => getComputedStyle(el).display !== 'none')
    button?.click()
  })
  await page.waitForTimeout(500)
  const focusDiag = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    const columns = dialog?.querySelectorAll('.rounded-\\[24px\\]').length ?? 0
    return {
      hasDialog: Boolean(dialog?.textContent?.includes('Kanban em foco')),
      columns,
      width: Math.round(dialog?.getBoundingClientRect().width ?? 0),
      height: Math.round(dialog?.getBoundingClientRect().height ?? 0),
    }
  })
  await screenshot(page, '07-doitmd-kanban-focus-2026-06-02.png')
  check('ID 087 - Kanban tem modo foco em tela cheia', focusDiag.hasDialog && focusDiag.width >= 1200 && focusDiag.height >= 850, JSON.stringify(focusDiag))

  await page.getByTitle('Sair do modo foco').click()
  await page.waitForTimeout(300)
  const focusClosed = await page.evaluate(() => !document.body.textContent?.includes('Kanban em foco'))
  check('ID 087 - sair do foco retorna ao Kanban normal', focusClosed)

  await page.goto(`${BASE}/notas?folder=${data.beta.id}`)
  await page.waitForLoadState('networkidle')
  const subText = await page.locator('.doit-folder-browser').innerText()
  await screenshot(page, '08-doitmd-kanban-subfolder-2026-06-02.png')
  check('ID 089 - subpasta direta respeita propria regra de concluidos', subText.includes(`Concluido beta ${unique}`), 'subpasta direta')
}

async function validateTodayAndTopbar(page, unique) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  const todayDiag = await page.evaluate(() => {
    const row = document.querySelector('.today-v3-layout .row.prio-1')
    const check = row?.querySelector('.task-check')
    const rowStyle = row ? getComputedStyle(row) : null
    const checkStyle = check ? getComputedStyle(check) : null
    const topbar = document.querySelector('header')
    return {
      boxShadow: rowStyle?.boxShadow ?? '',
      checkBorder: checkStyle?.borderColor ?? '',
      topbarBottom: Math.round(topbar?.getBoundingClientRect().bottom ?? 0),
      topbarHeight: Math.round(topbar?.getBoundingClientRect().height ?? 0),
    }
  })
  await screenshot(page, '09-doitmd-today-topbar-2026-06-02.png')
  check('ID 088 - Hoje sem risco vertical desalinhado e prioridade no checkbox', todayDiag.boxShadow === 'none' && todayDiag.checkBorder !== 'rgb(47, 107, 255)', JSON.stringify(todayDiag))
  check('ID 090 - topbar desktop ocupa menos altura mantendo botoes', todayDiag.topbarHeight <= 45 && todayDiag.topbarBottom <= 75, JSON.stringify(todayDiag))

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await screenshot(page, '10-doitmd-today-mobile-2026-06-02.png')
  const mobileOk = await page.evaluate(() => {
    const row = document.querySelector('.today-v3-layout .row.prio-1')
    return Boolean(row?.querySelector('.task-check'))
  })
  check('ID 088 - Hoje mobile preserva checkbox', mobileOk)
}

async function main() {
  ensureDirs()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: DESKTOP })
  try {
    const unique = await signUp(page)
    const data = await seed(page, unique)
    await validateEditor(page, data)
    await validateFolderPicker(page, unique)
    await validateKanban(page, unique, data)
    await validateTodayAndTopbar(page, unique)
  } finally {
    await browser.close()
  }
  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.error(`FAILED ${failed.length} checks`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
