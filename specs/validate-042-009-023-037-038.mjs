import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = require('playwright')

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'
const OUT = process.env.OUT_DIR || 'specs/artifacts/2026-05-29-corrigir-busca-longpress-checkboxes-today'
const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

mkdirSync(OUT, { recursive: true })

const results = []
function log(...args) {
  console.log('[validate-urgent]', ...args)
}
function check(name, ok, extra = '') {
  results.push({ name, ok })
  log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
}
function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
async function longPress(locator, page) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('longPress target not visible')
  const x = Math.round(box.x + Math.min(box.width / 2, 120))
  const y = Math.round(box.y + Math.min(box.height / 2, 22))
  await locator.dispatchEvent('pointerdown', {
    pointerId: 11,
    pointerType: 'touch',
    isPrimary: true,
    clientX: x,
    clientY: y,
    bubbles: true,
  })
  await page.waitForTimeout(620)
  await locator.dispatchEvent('pointerup', {
    pointerId: 11,
    pointerType: 'touch',
    isPrimary: true,
    clientX: x,
    clientY: y,
    bubbles: true,
  })
}

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: DESKTOP })
  await context.addCookies([
    {
      name: 'bypass-auth',
      value: '1',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ])
  const page = await context.newPage()
  const shot = async (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })

  try {
    const runId = Date.now().toString(36)
    const noteTitle = `Nota Alpha Busca ${runId}`
    const folderTaskTitle = `Tarefa aberta checkbox pasta ${runId}`
    const timedTaskTitle = `Tarefa com horario urgente ${runId}`
    const noTimeTaskTitle = `Tarefa sem horario urgente ${runId}`
    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }

    const root = (await post('/api/folders', { name: 'QA Busca Raiz' })).folder
    const sub = (await post('/api/folders', { name: 'QA Busca Subpasta', parentId: root.id })).folder
    const note = (await post('/api/items', {
      title: noteTitle,
      complexity: 'note',
      status: 'todo',
      folderId: sub.id,
      contentMd: `# ${noteTitle}\n\nConteudo unico para validar clique no resultado de busca.`,
      tags: ['qa-busca'],
    })).item
    const folderTask = (await post('/api/items', {
      title: folderTaskTitle,
      complexity: 'task',
      status: 'todo',
      folderId: sub.id,
      contentMd: '',
      tags: [],
    })).item
    const timedTask = (await post('/api/items', {
      title: timedTaskTitle,
      complexity: 'task',
      status: 'todo',
      dueDate: todayKey(),
      dueTime: '14:30',
      tags: [],
    })).item
    const noTimeTask = (await post('/api/items', {
      title: noTimeTaskTitle,
      complexity: 'task',
      status: 'todo',
      dueDate: todayKey(),
      tags: [],
    })).item

    log('seeded', { note: note.id, folderTask: folderTask.id, timedTask: timedTask.id, noTimeTask: noTimeTask.id })

    await page.goto(`${BASE}/dashboard`)
    await page.fill('input[placeholder*="Buscar"]', runId)
    await page.waitForSelector(`[data-search-result-id="${note.id}"]`, { timeout: 10000 })
    await shot('01-search-result-desktop.png')
    await Promise.all([
      page.waitForURL(`**/notas/${note.id}`, { timeout: 10000, waitUntil: 'commit' }),
      page.locator(`[data-search-result-id="${note.id}"]`).first().click(),
    ])
    check('ID042 busca desktop abre rota da nota correta', page.url().endsWith(`/notas/${note.id}`))
    await shot('02-search-opened-note-desktop.png')

    await page.goto(`${BASE}/dashboard`)
    await page.fill('input[placeholder*="Buscar"]', timedTaskTitle)
    await page.waitForSelector(`[data-search-result-id="${timedTask.id}"]`, { timeout: 10000 })
    await page.locator(`[data-search-result-id="${timedTask.id}"]`).first().click()
    await page.waitForTimeout(700)
    check('ID042 busca de tarefa nao redireciona para rota de nota', !page.url().includes('/notas/'))

    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/dashboard`)
    await page.getByRole('button', { name: 'Buscar' }).click()
    await page.fill('input[placeholder="Buscar ou ir para..."]', runId)
    await page.waitForSelector(`[data-search-result-id="${note.id}"]`, { timeout: 10000 })
    await Promise.all([
      page.waitForURL(`**/notas/${note.id}`, { timeout: 10000, waitUntil: 'commit' }),
      page.locator(`[data-search-result-id="${note.id}"]`).first().click(),
    ])
    check('ID042 busca mobile abre rota da nota correta', page.url().endsWith(`/notas/${note.id}`))
    await shot('02b-search-opened-note-mobile.png')

    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/today`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(900)
    const todayBefore = await page.evaluate(({ noTimeTitle, timedTitle }) => {
      const articles = Array.from(document.querySelectorAll('article'))
      const noTime = articles.find((a) => (a.textContent || '').includes(noTimeTitle))
      const withTime = articles.find((a) => (a.textContent || '').includes(timedTitle))
      const openButton = noTime?.querySelector('button.icon, button.task-check')
      const openStyle = openButton ? getComputedStyle(openButton) : null
      return {
        noTimeFound: Boolean(noTime),
        withTimeFound: Boolean(withTime),
        noTimeCols: noTime ? getComputedStyle(noTime).gridTemplateColumns.split(' ').length : 0,
        noTimeFirstTrack: noTime ? parseFloat(getComputedStyle(noTime).gridTemplateColumns.split(' ')[0] || '999') : 999,
        noTimeBulletVisible: Boolean(noTime && Array.from(noTime.querySelectorAll('.time')).some((el) => getComputedStyle(el).display !== 'none' && (el.textContent || '').trim())),
        withTimeShowsTime: Boolean(withTime && (withTime.textContent || '').includes('14:30')),
        openBg: openStyle?.backgroundColor ?? '',
        openColor: openStyle?.color ?? '',
        openPathCount: openButton?.querySelectorAll('svg path').length ?? -1,
      }
    }, { noTimeTitle: noTimeTaskTitle, timedTitle: timedTaskTitle })
    check('ID037 Hoje sem marcador/ponto em tarefa sem horario', todayBefore.noTimeFound && !todayBefore.noTimeBulletVisible)
    check('ID037 tarefa sem horario alinha mais a esquerda', todayBefore.noTimeFirstTrack <= 32 && todayBefore.noTimeCols === 2, `track=${todayBefore.noTimeFirstTrack} cols=${todayBefore.noTimeCols}`)
    check('ID037 tarefa com horario preserva horario', todayBefore.withTimeFound && todayBefore.withTimeShowsTime)
    check('ID038 checkbox aberto da Hoje esta vazio', todayBefore.openPathCount === 0, `paths=${todayBefore.openPathCount}`)
    check('ID038 checkbox aberto da Hoje tem fundo branco', todayBefore.openBg === 'rgb(255, 255, 255)', todayBefore.openBg)
    await shot('03-today-mobile-open-checkboxes.png')

    const todayTask = page.getByText(noTimeTaskTitle).first().locator('xpath=ancestor::article[1]')
    await longPress(todayTask, page)
    await page.waitForTimeout(400)
    const todayMenu = await page.evaluate((title) => ({
      hasTitle: document.body.innerText.includes(title),
      selection: window.getSelection()?.toString() ?? '',
    }), noTimeTaskTitle)
    check('ID009 long press em tarefa abre menu com titulo', todayMenu.hasTitle)
    check('ID009 long press em tarefa nao deixa texto selecionado', todayMenu.selection.length === 0, todayMenu.selection)
    await shot('04-longpress-today-task-mobile.png')
    await page.keyboard.press('Escape').catch(() => {})

    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(600)
    const checkbox = page.getByText(noTimeTaskTitle).first().locator('xpath=ancestor::article[1]//button[contains(@class,"task-check")]')
    await checkbox.click()
    await page.waitForTimeout(250)
    const checkedVisible = await page.evaluate((title) => {
      const article = Array.from(document.querySelectorAll('article')).find((a) => (a.textContent || '').includes(title))
      const button = article?.querySelector('button.task-check')
      return {
        found: Boolean(article),
        pathCount: button?.querySelectorAll('svg path').length ?? 0,
        bg: button ? getComputedStyle(button).backgroundColor : '',
      }
    }, noTimeTaskTitle)
    check('ID038 concluir tarefa mostra check', checkedVisible.found && checkedVisible.pathCount > 0, `paths=${checkedVisible.pathCount}`)
    await page.waitForTimeout(2300)
    const disappeared = await page.evaluate((title) => !document.body.innerText.includes(title), noTimeTaskTitle)
    check('ID038 tarefa concluida some apos alguns segundos', disappeared)
    await shot('05-today-mobile-after-complete.png')

    await page.goto(`${BASE}/notas?folder=${sub.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(900)
    const folderCheckbox = await page.evaluate((title) => {
      const row = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes(title))
      const icon = row?.querySelector('span svg')?.parentElement
      const style = icon ? getComputedStyle(icon) : null
      return {
        found: Boolean(row),
        pathCount: icon?.querySelectorAll('svg path').length ?? -1,
        bg: style?.backgroundColor ?? '',
        color: style?.color ?? '',
      }
    }, folderTaskTitle)
    check('ID023 tarefa aberta em pasta mostra checkbox vazio', folderCheckbox.found && folderCheckbox.pathCount === 0, `paths=${folderCheckbox.pathCount}`)
    check('ID023 checkbox em pasta usa fundo branco', folderCheckbox.bg === 'rgb(255, 255, 255)', folderCheckbox.bg)
    await shot('06-folder-task-checkbox-mobile.png')

    const noteRow = page.getByText(noteTitle).first().locator('xpath=ancestor::button[1]')
    await longPress(noteRow, page)
    await page.waitForTimeout(400)
    const noteMenu = await page.evaluate((title) => ({
      hasTitle: document.body.innerText.includes(title),
      selection: window.getSelection()?.toString() ?? '',
    }), noteTitle)
    check('ID009 long press em nota abre menu com titulo', noteMenu.hasTitle)
    check('ID009 long press em nota nao deixa texto selecionado', noteMenu.selection.length === 0, noteMenu.selection)
    await shot('07-longpress-note-mobile.png')
    await page.keyboard.press('Escape').catch(() => {})

    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${sub.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(900)
    await shot('08-folder-desktop-checkboxes.png')
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(900)
    await shot('09-today-desktop-alignment.png')

    const failed = results.filter((r) => !r.ok)
    if (failed.length) {
      log('failed checks:', failed.map((r) => r.name).join('; '))
      process.exitCode = 1
    } else {
      log(`all ${results.length} checks passed`)
    }
  } finally {
    await browser.close()
  }
})()
