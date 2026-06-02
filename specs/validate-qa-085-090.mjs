// Validacao independente (somente leitura/UI) dos IDs 085-090.
// NAO altera codigo do app. Cria usuario de teste, semeia dados e captura prints
// com os nomes exigidos no pedido de validacao.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3300'
const OUT = 'specs/artifacts/2026-06-02-validar-085-090'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const results = []

function log(...args) {
  console.log('[qa-085-090]', ...args)
}

function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
}

async function screenshot(page, file) {
  const dest = path.join(OUT, file)
  await page.screenshot({ path: dest, fullPage: false })
  log(`Saved screenshot: ${dest}`)
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  // pasta principal oculta concluidos; subpasta beta MOSTRA concluidos (cenario do ID 089)
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
      'Este paragrafo longo valida que o editor usa melhor a largura horizontal disponivel sem ficar preso em uma coluna estreita artificial. Repetindo para forcar uma linha bem comprida e medir o quanto o texto realmente ocupa a area util da tela.',
      '',
      '## Segundo bloco',
      '',
      '- item um',
      '- item dois',
    ].join('\n'),
  })).item
  await post(page, '/api/items', { title: `P1 hoje ${unique}`, complexity: 'task', status: 'todo', dueDate: todayKey(), priority: 1 })
  await post(page, '/api/items', { title: `P2 hoje ${unique}`, complexity: 'task', status: 'todo', dueDate: todayKey(), priority: 2 })
  await post(page, '/api/items', { title: `Sem prio hoje ${unique}`, complexity: 'task', status: 'todo', dueDate: todayKey() })
  await post(page, '/api/items', { title: `Concluido beta ${unique}`, complexity: 'task', status: 'done', folderId: beta.id })
  await post(page, '/api/items', { title: `Aberto beta ${unique}`, complexity: 'task', status: 'todo', folderId: beta.id })
  await post(page, '/api/items', { title: `Aberto gamma ${unique}`, complexity: 'task', status: 'todo', folderId: gamma.id })

  return { zeta, alpha, beta, gamma, note }
}

// ---------- ID 085 ----------
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
      viewport: window.innerWidth,
    }
  })
  await screenshot(page, 'ID085-editor-largura-desktop.png')
  // texto util >= 820px num viewport 1440 sem estourar (limite razoavel)
  check(
    'ID085-editor-normal-largura-util',
    normal.wrapperWidth >= 900 && normal.wrapperWidth <= 1100 && normal.proseWidth >= 820,
    JSON.stringify(normal),
  )

  await page.getByTitle('Modo foco').click()
  await page.waitForTimeout(500)
  const focus = await page.evaluate(() => {
    const editorWrap = document.querySelector('[data-note-scroll-container="true"] > div')
    return {
      wrapperWidth: Math.round(editorWrap?.getBoundingClientRect().width ?? 0),
      sidebars: document.querySelectorAll('aside').length,
    }
  })
  await screenshot(page, 'ID085-editor-foco-desktop.png')
  check(
    'ID085-foco-amplia-e-remove-trilhos',
    focus.wrapperWidth >= normal.wrapperWidth && focus.sidebars === 0,
    JSON.stringify(focus),
  )

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/notas/${data.note.id}`)
  await page.waitForLoadState('networkidle')
  const mobile = await page.evaluate(() => {
    const editorWrap = document.querySelector('[data-note-scroll-container="true"] > div')
    return {
      wrapperWidth: Math.round(editorWrap?.getBoundingClientRect().width ?? 0),
      viewport: window.innerWidth,
      bodyScrollW: document.body.scrollWidth,
    }
  })
  await screenshot(page, 'ID085-editor-mobile.png')
  check(
    'ID085-mobile-sem-quebra-horizontal',
    mobile.wrapperWidth <= mobile.viewport && mobile.bodyScrollW <= mobile.viewport + 1 && mobile.wrapperWidth > 300,
    JSON.stringify(mobile),
  )
}

// ---------- ID 086 ----------
async function validateFolderPicker(page, unique) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.getByText('+ Novo').click()
  await page.waitForTimeout(500)
  await page.getByTitle('Selecionar ou criar pasta').click()
  await page.waitForTimeout(300)
  const before = await page.evaluate((unique) => {
    const popover = [...document.querySelectorAll('.fixed, .absolute')].find(
      (el) => el.textContent?.includes(`Alpha ${unique}`) && el.textContent?.includes(`Zeta ${unique}`),
    )
    const names = [...(popover?.querySelectorAll('button span.truncate') ?? [])]
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
    const scroller = popover?.querySelector('.overflow-y-auto')
    return {
      names,
      hasSearch: Boolean(popover?.querySelector('input[placeholder="Buscar ou criar pasta"]')),
      hasCancel: Boolean(popover?.querySelector('[aria-label="Cancelar selecao de pasta"]')),
      scrollerOverflow: scroller ? getComputedStyle(scroller).overflowY : '',
    }
  }, unique)
  await screenshot(page, 'ID086-seletor-pasta-scroll-desktop.png')
  check(
    'ID086-busca-cancelar-lista-rolavel',
    before.hasSearch && before.hasCancel && before.scrollerOverflow === 'auto',
    JSON.stringify({ hasSearch: before.hasSearch, hasCancel: before.hasCancel, scroll: before.scrollerOverflow }),
  )
  check(
    'ID086-ordem-alfabetica',
    before.names.indexOf(`Alpha ${unique}`) >= 0 &&
      before.names.indexOf(`Alpha ${unique}`) < before.names.indexOf(`Zeta ${unique}`),
    before.names.join(' / '),
  )

  await page.fill('input[placeholder="Buscar ou criar pasta"]', `Beta ${unique}`)
  await page.waitForTimeout(300)
  const searchText = await page.evaluate(() => document.body.textContent ?? '')
  await screenshot(page, 'ID086-seletor-pasta-busca-desktop.png')
  check('ID086-busca-filtra', searchText.includes('Beta') && !searchText.includes(`Zeta ${unique}`), 'busca=Beta')

  await page.getByTitle('Cancelar').click()
  await page.waitForTimeout(200)
  const closed = await page.evaluate(() => !document.body.textContent?.includes('Criar "'))
  check('ID086-cancelar-sem-selecionar', closed)
}

// ---------- ID 087 + ID 089 ----------
async function validateKanban(page, unique, data) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/notas?folder=${data.alpha.id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  const mainText = await page.locator('.doit-folder-browser').innerText()
  await screenshot(page, 'ID087-kanban-normal-desktop.png')
  await screenshot(page, 'ID089-kanban-concluidos-pasta-desktop.png')
  check(
    'ID089-pasta-principal-oculta-concluidos-subpasta',
    mainText.includes(`Aberto beta ${unique}`) && !mainText.includes(`Concluido beta ${unique}`),
    'pasta principal hideCompleted=true',
  )

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button[title="Abrir Kanban em modo foco"]')].find(
      (el) => getComputedStyle(el).display !== 'none',
    )
    button?.click()
  })
  await page.waitForTimeout(500)
  const focusDiag = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    return {
      hasDialog: Boolean(dialog?.textContent?.includes('Kanban em foco')),
      width: Math.round(dialog?.getBoundingClientRect().width ?? 0),
      height: Math.round(dialog?.getBoundingClientRect().height ?? 0),
      hasExit: Boolean(document.querySelector('[title="Sair do modo foco"]')),
    }
  })
  await screenshot(page, 'ID087-kanban-foco-desktop.png')
  check(
    'ID087-modo-foco-tela-cheia',
    focusDiag.hasDialog && focusDiag.hasExit && focusDiag.width >= 1200 && focusDiag.height >= 800,
    JSON.stringify(focusDiag),
  )

  await page.getByTitle('Sair do modo foco').click()
  await page.waitForTimeout(300)
  const focusClosed = await page.evaluate(() => !document.body.textContent?.includes('Kanban em foco'))
  check('ID087-sair-do-foco', focusClosed)

  // entrar direto na subpasta beta (mostra concluidos)
  await page.goto(`${BASE}/notas?folder=${data.beta.id}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  const subText = await page.locator('.doit-folder-browser').innerText()
  await screenshot(page, 'ID089-subpasta-concluidos-desktop.png')
  check(
    'ID089-subpasta-direta-mostra-concluidos',
    subText.includes(`Concluido beta ${unique}`),
    'subpasta beta hideCompleted=false',
  )
}

// ---------- ID 088 + ID 090 ----------
async function validateTodayAndTopbar(page, unique) {
  await page.setViewportSize(DESKTOP)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  const diag = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.today-v3-layout .row')]
    const prioRow = document.querySelector('.today-v3-layout .row.prio-1')
    const shadows = rows.map((r) => getComputedStyle(r).boxShadow)
    const topbar = document.querySelector('header')
    const nav = document.querySelector('header nav')
    return {
      anyRowShadow: shadows.some((s) => s !== 'none' && s !== ''),
      prioCheckPresent: Boolean(prioRow?.querySelector('.task-check')),
      topbarHeight: Math.round(topbar?.getBoundingClientRect().height ?? 0),
      topbarBottom: Math.round(topbar?.getBoundingClientRect().bottom ?? 0),
      navHeight: Math.round(nav?.getBoundingClientRect().height ?? 0),
    }
  })
  await screenshot(page, 'ID088-hoje-alinhamento-desktop.png')
  await screenshot(page, 'ID090-menu-superior-desktop.png')
  check(
    'ID088-hoje-sem-risco-vertical-desalinhado',
    !diag.anyRowShadow && diag.prioCheckPresent,
    JSON.stringify({ anyRowShadow: diag.anyRowShadow, prioCheckPresent: diag.prioCheckPresent }),
  )
  check(
    'ID090-topbar-desktop-compacta',
    diag.topbarBottom <= 80 && diag.navHeight <= 48 && diag.navHeight >= 30,
    JSON.stringify({ topbarBottom: diag.topbarBottom, navHeight: diag.navHeight, topbarHeight: diag.topbarHeight }),
  )

  await page.setViewportSize(MOBILE)
  await page.goto(`${BASE}/today`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  await screenshot(page, 'ID088-hoje-alinhamento-mobile.png')
  const mobileOk = await page.evaluate(() => {
    const row = document.querySelector('.today-v3-layout .row.prio-1')
    const shadow = row ? getComputedStyle(row).boxShadow : 'none'
    return { hasCheck: Boolean(row?.querySelector('.task-check')), shadow }
  })
  check('ID088-mobile-checkbox-preservado-sem-risco', mobileOk.hasCheck && (mobileOk.shadow === 'none' || mobileOk.shadow === ''), JSON.stringify(mobileOk))
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: DESKTOP })
  let fatal = null
  try {
    const unique = await signUp(page)
    const data = await seed(page, unique)
    await validateEditor(page, data)
    await validateFolderPicker(page, unique)
    await validateKanban(page, unique, data)
    await validateTodayAndTopbar(page, unique)
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
}

main()
